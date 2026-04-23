/**
 * KB부동산 데이터허브 API → kb_index.db 자동 누적 sync
 *
 * 주간 1회 실행 (KB 발표: 매주 금요일 정오, 월간: 매월 셋째주 금요일).
 * INSERT OR REPLACE 이므로 매번 풀로 가져와도 중복 없음 (idempotent).
 *
 * 처리 대상 (8개 시리즈):
 *   매매가격지수 weekly + monthly
 *   전세가격지수 weekly + monthly
 *   매수우위지수 weekly + monthly
 *   전세수급지수 weekly + monthly
 *
 * 지역 (24개): 전국 + 17 시도 + 권역(수도권/광역시/기타지방) + 강북14/강남11
 *
 * 사용:  node scripts/sync_kb_api.mjs
 */
import Database from "better-sqlite3";
import path from "node:path";

const BASE = "https://data-api.kbland.kr/bfmstat/weekMnthlyHuseTrnd";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
const DB_PATH = path.join(process.cwd(), "data", "kb", "kb_index.db");

/* ── KB API 지역명 → DB(Excel 출처) 지역명 정규화 맵 ───────── */
const REGION_MAP = {
  "서울": "서울특별시",
  "부산": "부산광역시",
  "대구": "대구광역시",
  "인천": "인천광역시",
  "광주": "광주광역시",
  "대전": "대전광역시",
  "울산": "울산광역시",
  "세종": "세종특별자치시",
  "경기": "경기도",
  "충북": "충청북도",
  "충남": "충청남도",
  "전북": "전라북도",
  "전남": "전라남도",
  "경북": "경상북도",
  "경남": "경상남도",
  "제주": "제주특별자치도",
  "강원": "강원특별자치도",
  // 나머지: 전국 / 강북14개구 / 강남11개구 / 수도권 / 6개광역시 / 5개광역시 / 기타지방 → 그대로
};
const normalizeRegion = (name) => REGION_MAP[name] ?? name;

/* ── 동기화 작업 정의 ─────────────────────────────────────── */
const TASKS = [
  { type: "매매가격지수", periodic: "weekly",  endpoint: "priceIndex", params: { "월간주간구분코드": "02", "매물종별구분": "01", "매매전세코드": "01" }, layout: "priceIndex" },
  { type: "전세가격지수", periodic: "weekly",  endpoint: "priceIndex", params: { "월간주간구분코드": "02", "매물종별구분": "01", "매매전세코드": "02" }, layout: "priceIndex" },
  { type: "매매가격지수", periodic: "monthly", endpoint: "priceIndex", params: { "월간주간구분코드": "01", "매물종별구분": "01", "매매전세코드": "01" }, layout: "priceIndex" },
  { type: "전세가격지수", periodic: "monthly", endpoint: "priceIndex", params: { "월간주간구분코드": "01", "매물종별구분": "01", "매매전세코드": "02" }, layout: "priceIndex" },
  { type: "매수우위지수", periodic: "weekly",  endpoint: "maktTrnd",   params: { "메뉴코드": "01", "월간주간구분코드": "02" }, layout: "maktTrnd", valueField: "매수우위지수" },
  { type: "전세수급지수", periodic: "weekly",  endpoint: "maktTrnd",   params: { "메뉴코드": "03", "월간주간구분코드": "02" }, layout: "maktTrnd", valueField: "전세수급지수" },
  { type: "매수우위지수", periodic: "monthly", endpoint: "maktTrnd",   params: { "메뉴코드": "01", "월간주간구분코드": "01" }, layout: "maktTrnd", valueField: "매수우위지수" },
  { type: "전세수급지수", periodic: "monthly", endpoint: "maktTrnd",   params: { "메뉴코드": "03", "월간주간구분코드": "01" }, layout: "maktTrnd", valueField: "전세수급지수" },
];

/* ── helpers ──────────────────────────────────────────────── */
async function apiGet(endpoint, params) {
  const url = `${BASE}/${endpoint}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
  const json = await res.json();
  if (json?.dataHeader?.resultCode !== "10000") {
    throw new Error(`KB API error: ${json?.dataHeader?.message ?? "unknown"} (${endpoint})`);
  }
  return json.dataBody.data;
}

function fmtDate(raw) {
  // "20240408" → "2024-04-08", "202403" → "2024-03"
  const s = String(raw);
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  return null;
}

/* ── main ─────────────────────────────────────────────────── */
const startedAt = new Date().toISOString();
console.log(`\n[${startedAt}] KB API sync 시작 → ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
const insertSimple = db.prepare(
  "INSERT OR REPLACE INTO kb_index (index_type, periodic, region_name, date, value) VALUES (?, ?, ?, ?, ?)"
);
const insertSentiment = db.prepare(
  "INSERT OR REPLACE INTO kb_index (index_type, periodic, region_name, date, value, sellers_more, buyers_more, similar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
// API 응답에서 sub-component 필드명 → 표준 컬럼 (API 명명체계 ≠ Excel 명명체계)
const SUB_FIELD = {
  매수우위지수: { sellers: "매도자많음", buyers: "매수자많음", similar: "비슷함" },
  전세수급지수: { sellers: "공급충분", buyers: "공급부족", similar: "공급적절" },
};

let totalUpserts = 0;
const summary = [];

for (const task of TASKS) {
  const tag = `${task.type} (${task.periodic})`;
  try {
    const data = await apiGet(task.endpoint, task.params);
    const regions = data.데이터리스트 ?? [];
    let upserts = 0;
    let latestDate = null;

    if (task.layout === "priceIndex") {
      // 외부 날짜축 + region.dataList 숫자 배열 (마지막 값은 WoW 변동률 → 제외)
      const dates = (data.날짜리스트 ?? []).map(fmtDate);
      const tx = db.transaction(() => {
        for (const r of regions) {
          const region = normalizeRegion(r.지역명);
          const values = r.dataList ?? [];
          for (let i = 0; i < dates.length; i++) {
            const d = dates[i];
            const v = values[i];
            if (d && typeof v === "number" && Number.isFinite(v)) {
              insertSimple.run(task.type, task.periodic, region, d, v);
              upserts++;
              if (!latestDate || d > latestDate) latestDate = d;
            }
          }
        }
      });
      tx();
    } else {
      // maktTrnd: 각 데이터 포인트가 객체, 기준날짜 + valueField + sub fields
      const sub = SUB_FIELD[task.type] ?? {};
      const tx = db.transaction(() => {
        for (const r of regions) {
          const region = normalizeRegion(r.지역명);
          for (const pt of r.dataList ?? []) {
            const d = fmtDate(pt.기준날짜);
            const v = num(pt[task.valueField]);
            if (d && v != null) {
              insertSentiment.run(
                task.type, task.periodic, region, d, v,
                num(pt[sub.sellers]),
                num(pt[sub.buyers]),
                num(pt[sub.similar]),
              );
              upserts++;
              if (!latestDate || d > latestDate) latestDate = d;
            }
          }
        }
      });
      tx();
    }

    console.log(`  ✓ ${tag.padEnd(22)} upsert=${String(upserts).padStart(7)}  latest=${latestDate}`);
    summary.push({ tag, upserts, latestDate, ok: true });
    totalUpserts += upserts;
  } catch (err) {
    console.error(`  ✗ ${tag.padEnd(22)} ERROR: ${err.message}`);
    summary.push({ tag, upserts: 0, latestDate: null, ok: false, error: err.message });
  }
}

const finishedAt = new Date().toISOString();
const elapsed = ((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000).toFixed(1);

console.log(`\n[${finishedAt}] 완료 — 총 ${totalUpserts.toLocaleString()} upserts, ${elapsed}s`);

const failed = summary.filter((s) => !s.ok);
if (failed.length) {
  console.error(`\n실패 작업 ${failed.length}건:`);
  for (const f of failed) console.error(`  - ${f.tag}: ${f.error}`);
  db.close();
  process.exit(1);
}

db.close();
process.exit(0);
