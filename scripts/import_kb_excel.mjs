/**
 * KB 부동산 통계 XLSX → SQLite 변환기
 *
 * 입력:  data/kb/raw/KB_Weekly.xlsx, data/kb/raw/KB_Monthly.xlsx
 * 출력:  data/kb/kb_index.db  (단일 테이블 kb_index)
 *
 * 스키마:
 *   kb_index(index_type, periodic, region_name, date, value)
 *   - index_type: '매매가격지수' | '전세가격지수' | '월세가격지수' | '매수우위지수' | '전세수급지수'
 *   - periodic:   'weekly' | 'monthly'
 *   - region_name: '전국' | '서울특별시' | '강북구' | ...
 *   - date: 'YYYY-MM-DD' (weekly) | 'YYYY-MM' (monthly)
 *   - value: REAL
 */
import * as XLSX from "xlsx";
import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const WEEKLY  = "data/kb/raw/KB_Weekly.xlsx";
const MONTHLY = "data/kb/raw/KB_Monthly.xlsx";
const DB_PATH = "data/kb/kb_index.db";

/* 각 grouped 시트의 sub-component 컬럼명 (R2 indicator row 기준) */
const GROUPED_SUBS = {
  "매수우위지수": { sellers: ["매도자많음", "매도자 많음"], buyers: ["매수자많음", "매수자 많음"], similar: ["비슷함"] },
  "전세수급지수": { sellers: ["수요<공급", "수요< 공급", "수요<공급(공급우위)"], buyers: ["수요>공급", "수요> 공급"], similar: ["수요≒공급", "수요 ≒ 공급", "수요≒공급(균형)"] },
};

const SHEETS = [
  // file,    sheet,                 type,            periodic,  layout,    indicatorName
  [WEEKLY,    "3.매매지수",            "매매가격지수",   "weekly",  "single"  ],
  [WEEKLY,    "4.전세지수",            "전세가격지수",   "weekly",  "single"  ],
  [WEEKLY,    "7.매수매도",            "매수우위지수",   "weekly",  "grouped", "매수우위지수"],
  [WEEKLY,    "9.전세수급",            "전세수급지수",   "weekly",  "grouped", "전세수급지수"],
  [MONTHLY,   "2.매매APT",             "매매가격지수",   "monthly", "single"  ],
  [MONTHLY,   "6.전세APT",             "전세가격지수",   "monthly", "single"  ],
  [MONTHLY,   "9.KB아파트 월세지수",     "월세가격지수",   "monthly", "single"  ],
  [MONTHLY,   "21.매수우위",           "매수우위지수",   "monthly", "grouped", "매수우위지수"],
  [MONTHLY,   "23.전세수급",           "전세수급지수",   "monthly", "grouped", "전세수급지수"],
];

/* ──────── helpers ──────── */
const norm = (s) => (s == null ? "" : String(s).replace(/\s+/g, "").trim());
const stripEn = (s) => {
  // "전국 Total" → "전국", "강북14개구 Northern seoul" → "강북14개구"
  if (!s) return s;
  const m = String(s).match(/^([^\s]+(?:\s*[가-힣0-9]+)*)/);
  return m ? m[1].trim() : String(s).trim();
};

function excelSerialToISO(serial) {
  // Excel epoch: 1899-12-30 (XLSX adjustment for 1900 leap bug)
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseMonthly(v, lastYear) {
  // Returns { yyyymm: 'YYYY-MM', year } or null
  if (v == null || v === "") return null;
  // String like "'00.1" or "00.1" or "2026.1"
  if (typeof v === "string") {
    const s = v.replace(/^'/, "").trim();
    if (!s) return null;
    if (s.includes(".")) {
      const [yStr, mStr] = s.split(".");
      const yi = parseInt(yStr, 10);
      const mi = parseInt(mStr, 10);
      if (!Number.isFinite(yi) || !Number.isFinite(mi)) return null;
      const year = yi < 100 ? (yi >= 50 ? 1900 + yi : 2000 + yi) : yi;
      return { yyyymm: `${year}-${String(mi).padStart(2, "0")}`, year };
    }
    // string number like "2"
    const mi = parseInt(s, 10);
    if (!Number.isFinite(mi) || !lastYear) return null;
    return { yyyymm: `${lastYear}-${String(mi).padStart(2, "0")}`, year: lastYear };
  }
  if (typeof v === "number") {
    const intPart = Math.trunc(v);
    const frac = v - intPart;
    if (Math.abs(frac) > 1e-9) {
      // YY.M or YYYY.M form
      const year = intPart < 100 ? (intPart >= 50 ? 1900 + intPart : 2000 + intPart) : intPart;
      const month = Math.round(frac * 10);
      if (month < 1 || month > 12) return null;
      return { yyyymm: `${year}-${String(month).padStart(2, "0")}`, year };
    }
    // plain integer = month, carryover year
    const m = intPart;
    if (m < 1 || m > 12 || !lastYear) return null;
    return { yyyymm: `${lastYear}-${String(m).padStart(2, "0")}`, year: lastYear };
  }
  return null;
}

function buildRegionMap_single(aoa) {
  // Region = first non-null among R1, R2 for each col (skip col 0)
  const r1 = aoa[1] || [];
  const r2 = aoa[2] || [];
  const map = new Map(); // col -> region
  const cols = Math.max(r1.length, r2.length);
  for (let c = 1; c < cols; c++) {
    const raw = (r1[c] != null && String(r1[c]).trim() !== "") ? r1[c]
              : (r2[c] != null && String(r2[c]).trim() !== "") ? r2[c]
              : null;
    if (raw == null) continue;
    const cleaned = stripEn(String(raw));
    if (!cleaned || cleaned === "Classification") continue;
    map.set(c, cleaned);
  }
  return map;
}

function buildRegionMap_grouped(aoa, indicatorName) {
  // R1 = region (sparse), R2 = indicator name
  // 각 region 그룹에서 매수우위지수/전세수급지수 컬럼 + sub-component (매도자/매수자/비슷함)도 같이 잡음
  // 반환: Map<region, { mainCol, sellersCol, buyersCol, similarCol }>
  const r1 = aoa[1] || [];
  const r2 = aoa[2] || [];
  const targetN = norm(indicatorName);
  const subs = GROUPED_SUBS[indicatorName] ?? { sellers: [], buyers: [], similar: [] };
  const sellersN = subs.sellers.map(norm);
  const buyersN  = subs.buyers.map(norm);
  const similarN = subs.similar.map(norm);

  const map = new Map(); // region -> { mainCol, sellersCol, buyersCol, similarCol }
  let lastRegion = null;
  let bucket = null;

  for (let c = 1; c < Math.max(r1.length, r2.length); c++) {
    if (r1[c] != null && String(r1[c]).trim() !== "") {
      lastRegion = stripEn(String(r1[c]));
      bucket = { mainCol: null, sellersCol: null, buyersCol: null, similarCol: null };
    }
    if (!bucket || !lastRegion) continue;
    const ind = norm(r2[c]);
    if (ind === targetN)         bucket.mainCol = c;
    else if (sellersN.includes(ind)) bucket.sellersCol = c;
    else if (buyersN.includes(ind))  bucket.buyersCol = c;
    else if (similarN.includes(ind)) bucket.similarCol = c;

    // bucket이 채워져 있고 mainCol이 있으면 region에 등록 (반복 set OK)
    if (bucket.mainCol != null) {
      map.set(lastRegion, bucket);
    }
  }
  return map;
}

function findDataStartRow(aoa, periodic) {
  // First row where col A is parseable
  for (let r = 3; r < Math.min(aoa.length, 10); r++) {
    const a = aoa[r]?.[0];
    if (periodic === "weekly") {
      if (typeof a === "number" && a > 30000) return r; // post-1981 serial
    } else {
      if (parseMonthly(a, 2000) != null) return r;
    }
  }
  return 4; // sensible fallback
}

/* ──────── main ──────── */
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  DROP TABLE IF EXISTS kb_index;
  CREATE TABLE kb_index (
    index_type   TEXT NOT NULL,
    periodic     TEXT NOT NULL,
    region_name  TEXT NOT NULL,
    date         TEXT NOT NULL,
    value        REAL NOT NULL,
    sellers_more REAL,
    buyers_more  REAL,
    similar      REAL,
    PRIMARY KEY (index_type, periodic, region_name, date)
  );
  CREATE INDEX idx_lookup ON kb_index (index_type, periodic, region_name, date);
`);

const insertSimple = db.prepare(
  "INSERT OR REPLACE INTO kb_index (index_type, periodic, region_name, date, value) VALUES (?, ?, ?, ?, ?)"
);
const insertSentiment = db.prepare(
  "INSERT OR REPLACE INTO kb_index (index_type, periodic, region_name, date, value, sellers_more, buyers_more, similar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);

let totalRows = 0;

for (const [file, sheet, type, periodic, layout, indicator] of SHEETS) {
  console.log(`\n→ ${file}  ::  ${sheet}  →  ${type} (${periodic})`);
  const wb = XLSX.read(readFileSync(file), { type: "buffer", cellDates: false });
  const ws = wb.Sheets[sheet];
  if (!ws) { console.log(`  !! sheet not found, skip`); continue; }
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  const regionMap = layout === "single"
    ? buildRegionMap_single(aoa)
    : buildRegionMap_grouped(aoa, indicator);
  const startRow = findDataStartRow(aoa, periodic);
  console.log(`  regions=${regionMap.size}  startRow=${startRow}`);

  let count = 0;
  let firstDate = null, lastDate = null;
  let lastYear = null;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const tx = db.transaction(() => {
    for (let r = startRow; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || row[0] == null) continue;
      let dateStr;
      if (periodic === "weekly") {
        const serial = row[0];
        if (typeof serial !== "number" || serial < 30000) continue;
        dateStr = excelSerialToISO(serial);
      } else {
        const parsed = parseMonthly(row[0], lastYear);
        if (!parsed) continue;
        dateStr = parsed.yyyymm;
        lastYear = parsed.year;
      }
      if (!firstDate) firstDate = dateStr;
      lastDate = dateStr;

      if (layout === "single") {
        for (const [col, region] of regionMap) {
          const v = num(row[col]);
          if (v == null) continue;
          insertSimple.run(type, periodic, region, dateStr, v);
          count++;
        }
      } else {
        // grouped: regionMap is region -> { mainCol, sellersCol, buyersCol, similarCol }
        for (const [region, cols] of regionMap) {
          const v = num(row[cols.mainCol]);
          if (v == null) continue;
          insertSentiment.run(
            type, periodic, region, dateStr, v,
            num(row[cols.sellersCol]),
            num(row[cols.buyersCol]),
            num(row[cols.similarCol]),
          );
          count++;
        }
      }
    }
  });
  tx();
  console.log(`  inserted=${count.toLocaleString()}  range=${firstDate} ~ ${lastDate}`);
  totalRows += count;
}

console.log(`\n=== TOTAL inserted: ${totalRows.toLocaleString()} rows ===`);

// Summary
const summary = db.prepare(`
  SELECT index_type, periodic,
         COUNT(*) AS rows,
         COUNT(DISTINCT region_name) AS regions,
         MIN(date) AS first_date,
         MAX(date) AS last_date
  FROM kb_index
  GROUP BY index_type, periodic
  ORDER BY periodic, index_type
`).all();

console.log("\n=== SUMMARY ===");
for (const r of summary) {
  console.log(`  ${r.periodic.padEnd(7)} | ${r.index_type.padEnd(8)} | ${String(r.rows).padStart(8)} rows | ${String(r.regions).padStart(3)} regions | ${r.first_date} ~ ${r.last_date}`);
}

db.close();
console.log("\n✓ done →", DB_PATH);
