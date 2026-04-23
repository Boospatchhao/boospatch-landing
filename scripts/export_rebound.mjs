/**
 * 반등거래 분석 JSON export (v3 — 개별 반등거래 세부 내역 포함).
 *
 * 반등 기준: 거래가 > 같은 단지+5㎡ 평형버킷의 전월/전주 평균 실거래가.
 * 비교 baseline 없는 거래는 분모에서도 제외.
 *
 * 실행: node scripts/export_rebound.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const duckdb = require("../node_modules/duckdb/lib/duckdb.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "public/data/rebound-trades.json");

// .env.local 에서 토큰 로드
let TOKEN = process.env.MOTHERDUCK_TOKEN;
const envFile = resolve(ROOT, ".env.local");
try {
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    if (line.startsWith("MOTHERDUCK_TOKEN=")) {
      TOKEN = line.split("=").slice(1).join("=").trim();
    }
  }
} catch {}
if (!TOKEN) throw new Error("MOTHERDUCK_TOKEN 이 없습니다.");

const MONTHS_BACK   = 18;
const WEEKS_BACK    = 52;
const MONTHS_DETAIL = 3;
const WEEKS_DETAIL  = 8;

// DuckDB Promise wrapper
function query(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function connectMD(token) {
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database(`md:?motherduck_token=${token}`, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

// ── SQL 정의 ──

const MONTHLY_SQL = `
WITH trades AS (
  SELECT
    t.sgg_code, b.sido, b.sigungu, t.danji_name,
    CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
    t.price, t.deal_date,
    DATE_TRUNC('month', t.deal_date)::DATE AS month_start
  FROM realty.marts.molit_trade_meme t
  LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
    USING (sgg_code)
  WHERE t.cancel_date IS NULL
    AND t.deal_date >= CURRENT_DATE - INTERVAL '${MONTHS_BACK + 1} months'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
monthly_avg AS (
  SELECT danji_name, area_bucket, month_start, AVG(price) AS avg_price
  FROM trades GROUP BY 1, 2, 3
),
comparison AS (
  SELECT t.*, ma.avg_price AS prev_month_avg
  FROM trades t
  LEFT JOIN monthly_avg ma
    ON ma.danji_name  = t.danji_name
   AND ma.area_bucket = t.area_bucket
   AND ma.month_start = t.month_start - INTERVAL '1 month'
)
SELECT
  month_start::VARCHAR AS period,
  sgg_code, sido, sigungu,
  COUNT(*)::INTEGER AS total,
  SUM(CASE WHEN price > prev_month_avg THEN 1 ELSE 0 END)::INTEGER AS rebound
FROM comparison
WHERE prev_month_avg IS NOT NULL
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) >= 1
ORDER BY period DESC, total DESC`;

const WEEKLY_SQL = `
WITH trades AS (
  SELECT
    t.sgg_code, b.sido, b.sigungu, t.danji_name,
    CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
    t.price, t.deal_date,
    (t.deal_date - EXTRACT(DOW FROM t.deal_date)::INTEGER)::DATE AS week_sun
  FROM realty.marts.molit_trade_meme t
  LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
    USING (sgg_code)
  WHERE t.cancel_date IS NULL
    AND t.deal_date >= CURRENT_DATE - INTERVAL '${WEEKS_BACK + 1} weeks'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
weekly_avg AS (
  SELECT danji_name, area_bucket, week_sun, AVG(price) AS avg_price
  FROM trades GROUP BY 1, 2, 3
),
comparison AS (
  SELECT t.*, wa.avg_price AS prev_week_avg
  FROM trades t
  LEFT JOIN weekly_avg wa
    ON wa.danji_name  = t.danji_name
   AND wa.area_bucket = t.area_bucket
   AND wa.week_sun    = t.week_sun - INTERVAL '7 days'
)
SELECT
  week_sun::VARCHAR AS period,
  sgg_code, sido, sigungu,
  COUNT(*)::INTEGER AS total,
  SUM(CASE WHEN price > prev_week_avg THEN 1 ELSE 0 END)::INTEGER AS rebound
FROM comparison
WHERE prev_week_avg IS NOT NULL
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) >= 1
ORDER BY period DESC, total DESC`;

const MONTHLY_DETAIL_SQL = `
WITH trades AS (
  SELECT
    t.sgg_code, b.sido, b.sigungu,
    t.emd_name, t.danji_name,
    CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
    ROUND(t.exclusive_area, 1) AS area,
    t.floor, t.price, t.deal_date,
    DATE_TRUNC('month', t.deal_date)::DATE AS month_start
  FROM realty.marts.molit_trade_meme t
  LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
    USING (sgg_code)
  WHERE t.cancel_date IS NULL
    AND t.deal_date >= CURRENT_DATE - INTERVAL '${MONTHS_DETAIL + 1} months'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
monthly_avg AS (
  SELECT danji_name, area_bucket, month_start, AVG(price) AS avg_price
  FROM trades GROUP BY 1, 2, 3
),
comparison AS (
  SELECT t.*, ROUND(ma.avg_price, 0)::INTEGER AS prev_month_avg
  FROM trades t
  INNER JOIN monthly_avg ma
    ON ma.danji_name  = t.danji_name
   AND ma.area_bucket = t.area_bucket
   AND ma.month_start = t.month_start - INTERVAL '1 month'
  WHERE t.price > ma.avg_price
)
SELECT
  month_start::VARCHAR AS period,
  sgg_code, sido, sigungu,
  COALESCE(emd_name, '') AS emd_name,
  COALESCE(danji_name, '') AS apt_name,
  area, floor, price,
  deal_date::VARCHAR AS deal_date,
  prev_month_avg,
  ROUND((price - prev_month_avg)::DOUBLE / prev_month_avg * 100, 1) AS change_pct
FROM comparison
ORDER BY period DESC, sgg_code, price DESC`;

const WEEKLY_DETAIL_SQL = `
WITH trades AS (
  SELECT
    t.sgg_code, b.sido, b.sigungu,
    t.emd_name, t.danji_name,
    CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
    ROUND(t.exclusive_area, 1) AS area,
    t.floor, t.price, t.deal_date,
    (t.deal_date - EXTRACT(DOW FROM t.deal_date)::INTEGER)::DATE AS week_sun
  FROM realty.marts.molit_trade_meme t
  LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
    USING (sgg_code)
  WHERE t.cancel_date IS NULL
    AND t.deal_date >= CURRENT_DATE - INTERVAL '${WEEKS_DETAIL + 1} weeks'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
weekly_avg AS (
  SELECT danji_name, area_bucket, week_sun, AVG(price) AS avg_price
  FROM trades GROUP BY 1, 2, 3
),
comparison AS (
  SELECT t.*, ROUND(wa.avg_price, 0)::INTEGER AS prev_week_avg
  FROM trades t
  INNER JOIN weekly_avg wa
    ON wa.danji_name  = t.danji_name
   AND wa.area_bucket = t.area_bucket
   AND wa.week_sun    = t.week_sun - INTERVAL '7 days'
  WHERE t.price > wa.avg_price
)
SELECT
  week_sun::VARCHAR AS period,
  sgg_code, sido, sigungu,
  COALESCE(emd_name, '') AS emd_name,
  COALESCE(danji_name, '') AS apt_name,
  area, floor, price,
  deal_date::VARCHAR AS deal_date,
  prev_week_avg,
  ROUND((price - prev_week_avg)::DOUBLE / prev_week_avg * 100, 1) AS change_pct
FROM comparison
ORDER BY period DESC, sgg_code, price DESC`;

// ── 데이터 빌더 ──

function bucketRows(rows) {
  const byPeriod = {};
  for (const r of rows) {
    const total   = Number(r.total);
    const rebound = Number(r.rebound);
    const rate    = total > 0 ? Math.round((rebound / total) * 10000) / 100 : 0;
    (byPeriod[r.period] ??= []).push({
      sggCode: r.sgg_code,
      sido:    r.sido,
      sigungu: r.sigungu,
      total,
      rebound,
      rate,
    });
  }
  return byPeriod;
}

function buildDetailLookup(rows, avgKey) {
  const lookup = {};
  for (const r of rows) {
    const item = {
      emdName:      r.emd_name,
      aptName:      r.apt_name,
      area:         r.area != null ? Math.round(r.area * 10) / 10 : null,
      floor:        r.floor != null ? Number(r.floor) : null,
      price:        Number(r.price),
      dealDate:     r.deal_date,
      prevMonthAvg: Number(r[avgKey]),
      changePct:    r.change_pct != null ? Math.round(r.change_pct * 10) / 10 : null,
    };
    ((lookup[r.period] ??= {})[r.sgg_code] ??= []).push(item);
  }
  return lookup;
}

function attachDetails(byPeriod, detailLookup) {
  for (const [period, rows] of Object.entries(byPeriod)) {
    const pdDetails = detailLookup[period] ?? {};
    for (const row of rows) {
      const dets = pdDetails[row.sggCode];
      if (dets?.length) row.details = dets;
    }
  }
}

// ── 메인 ──

console.log("✓ MotherDuck 연결 중…");
const db = await connectMD(TOKEN);
console.log("✓ 연결 완료");

console.log(`[1/4] 월간 집계 (최근 ${MONTHS_BACK}개월)…`);
const monthlyRows = await query(db, MONTHLY_SQL);
const monthly = bucketRows(monthlyRows);
console.log(`       ${Object.keys(monthly).length} 개월 · ${Object.values(monthly).reduce((s,v)=>s+v.length,0)} 시군구-행`);

console.log(`[2/4] 주간 집계 (최근 ${WEEKS_BACK}주)…`);
const weeklyRows = await query(db, WEEKLY_SQL);
const weekly = bucketRows(weeklyRows);
console.log(`       ${Object.keys(weekly).length} 주 · ${Object.values(weekly).reduce((s,v)=>s+v.length,0)} 시군구-행`);

console.log(`[3/4] 월간 세부 내역 (최근 ${MONTHS_DETAIL}개월)…`);
const monthlyDetailRows = await query(db, MONTHLY_DETAIL_SQL);
const monthlyDetailLookup = buildDetailLookup(monthlyDetailRows, "prev_month_avg");
const mDetailCnt = Object.values(monthlyDetailLookup).reduce((s,p)=>s+Object.values(p).reduce((s2,v)=>s2+v.length,0),0);
console.log(`       ${mDetailCnt} 건`);
attachDetails(monthly, monthlyDetailLookup);

console.log(`[4/4] 주간 세부 내역 (최근 ${WEEKS_DETAIL}주)…`);
const weeklyDetailRows = await query(db, WEEKLY_DETAIL_SQL);
const weeklyDetailLookup = buildDetailLookup(weeklyDetailRows, "prev_week_avg");
const wDetailCnt = Object.values(weeklyDetailLookup).reduce((s,p)=>s+Object.values(p).reduce((s2,v)=>s2+v.length,0),0);
console.log(`       ${wDetailCnt} 건`);
attachDetails(weekly, weeklyDetailLookup);

const payload = {
  lastUpdated: new Date().toISOString().slice(0, 19),
  methodology:
    `반등 = 거래가 > 같은 단지+5㎡ 평형버킷의 전월/전주 평균 실거래가. ` +
    `비교 기준이 없는 거래(직전 기간 해당 단지·평형 거래 0건)는 분모에서도 제외. ` +
    `세부 내역은 최근 ${MONTHS_DETAIL}개월/${WEEKS_DETAIL}주 분만 포함.`,
  monthly,
  weekly,
};

writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf-8");
const size = (JSON.stringify(payload).length / 1024).toFixed(1);
console.log(`\n✓ ${OUT} (~${size}KB)`);
db.close();
