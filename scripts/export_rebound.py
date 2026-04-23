"""
반등거래 분석 JSON export (v3 — 개별 반등거래 세부 내역 포함).

반등 기준: 거래가 > 같은 단지+5㎡ 평형버킷의 전월/전주 평균 실거래가.
비교 baseline 없는 거래는 분모에서도 제외.

MotherDuck realty.marts.molit_trade_meme → public/data/rebound-trades.json

구조:
{
  "lastUpdated": "...",
  "monthly": {
    "2026-04-01": [
      {
        "sggCode": "26410", "sido": "부산광역시", "sigungu": "금정구",
        "total": 10, "rebound": 9, "rate": 90.0,
        "details": [   // 최근 MONTHS_DETAIL 개월만 포함
          {
            "emdName": "장전동", "aptName": "래미안장전",
            "area": 59.9, "floor": 13, "price": 73000,
            "dealDate": "2026-04-01",
            "prevMonthAvg": 69833, "changePct": 4.5
          }
        ]
      }
    ]
  },
  "weekly": { ... }
}

실행:  python scripts/export_rebound.py
"""
import os
import json
import datetime
from pathlib import Path

ROOT     = Path(__file__).resolve().parents[1]
OUT      = ROOT / "public" / "data" / "rebound-trades.json"
OUT_DET  = ROOT / "public" / "data" / "rebound-details.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

env_path = ROOT / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("MOTHERDUCK_TOKEN="):
            os.environ["MOTHERDUCK_TOKEN"] = line.split("=", 1)[1].strip()

TOKEN = os.environ.get("MOTHERDUCK_TOKEN")
if not TOKEN: raise SystemExit("MOTHERDUCK_TOKEN 이 없습니다.")

import duckdb
con = duckdb.connect(f"md:?motherduck_token={TOKEN}")
print("✓ MotherDuck 연결")

MONTHS_BACK   = 18   # 월간 집계: 최근 18개월
WEEKS_BACK    = 52   # 주간 집계: 최근 52주
MONTHS_DETAIL = 3    # 세부 내역: 최근 3개월만
WEEKS_DETAIL  = 8    # 세부 내역: 최근 8주만

# ─────────────── 월간 집계 (기존) ───────────────
MONTHLY_SQL = f"""
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
    AND t.deal_date >= CURRENT_DATE - INTERVAL '{MONTHS_BACK + 1} months'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
monthly_avg AS (
  SELECT danji_name, area_bucket, month_start, AVG(price) AS avg_price
  FROM trades
  GROUP BY 1, 2, 3
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
  COUNT(*)                                      ::INTEGER AS total,
  SUM(CASE WHEN price > prev_month_avg THEN 1 ELSE 0 END)::INTEGER AS rebound
FROM comparison
WHERE prev_month_avg IS NOT NULL
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) >= 1
ORDER BY period DESC, total DESC
"""

# ─────────────── 주간 집계 (기존) ───────────────
WEEKLY_SQL = f"""
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
    AND t.deal_date >= CURRENT_DATE - INTERVAL '{WEEKS_BACK + 1} weeks'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
weekly_avg AS (
  SELECT danji_name, area_bucket, week_sun, AVG(price) AS avg_price
  FROM trades
  GROUP BY 1, 2, 3
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
  COUNT(*)                                     ::INTEGER AS total,
  SUM(CASE WHEN price > prev_week_avg THEN 1 ELSE 0 END)::INTEGER AS rebound
FROM comparison
WHERE prev_week_avg IS NOT NULL
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) >= 1
ORDER BY period DESC, total DESC
"""

# ─────────────── 월간 세부 내역 ───────────────
MONTHLY_DETAIL_SQL = f"""
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
    AND t.deal_date >= CURRENT_DATE - INTERVAL '{MONTHS_DETAIL + 1} months'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
monthly_avg AS (
  SELECT danji_name, area_bucket, month_start, AVG(price) AS avg_price
  FROM trades
  GROUP BY 1, 2, 3
),
comparison AS (
  SELECT
    t.*,
    ROUND(ma.avg_price, 0)::INTEGER AS prev_month_avg
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
ORDER BY period DESC, sgg_code, price DESC
"""

# ─────────────── 주간 세부 내역 ───────────────
WEEKLY_DETAIL_SQL = f"""
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
    AND t.deal_date >= CURRENT_DATE - INTERVAL '{WEEKS_DETAIL + 1} weeks'
    AND b.sigungu IS NOT NULL
    AND NOT COALESCE(t.is_byg, FALSE)
),
weekly_avg AS (
  SELECT danji_name, area_bucket, week_sun, AVG(price) AS avg_price
  FROM trades
  GROUP BY 1, 2, 3
),
comparison AS (
  SELECT
    t.*,
    ROUND(wa.avg_price, 0)::INTEGER AS prev_week_avg
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
ORDER BY period DESC, sgg_code, price DESC
"""


def bucket_rows(sql: str) -> dict:
    """쿼리 실행 → {period: [{sggCode, sido, sigungu, total, rebound, rate}]}"""
    rows = con.execute(sql).fetchall()
    cols = [d[0] for d in con.description]
    by_period: dict[str, list] = {}
    for row in rows:
        r = dict(zip(cols, row))
        period = r["period"]
        total = int(r["total"])
        rebound = int(r["rebound"])
        rate = round((rebound / total) * 100, 2) if total > 0 else 0
        by_period.setdefault(period, []).append({
            "sggCode": r["sgg_code"],
            "sido":    r["sido"],
            "sigungu": r["sigungu"],
            "total":   total,
            "rebound": rebound,
            "rate":    rate,
        })
    return by_period


MAX_DETAIL_PER_SGG = 50   # 시군구당 세부 건수 상한

def build_detail_lookup(sql: str) -> dict:
    """쿼리 실행 → {period: {sggCode: [detail_items]}}"""
    rows = con.execute(sql).fetchall()
    cols = [d[0] for d in con.description]
    lookup: dict = {}
    cnt_map: dict = {}
    for row in rows:
        r = dict(zip(cols, row))
        period   = r["period"]
        sgg_code = r["sgg_code"]
        key = (period, sgg_code)
        if cnt_map.get(key, 0) >= MAX_DETAIL_PER_SGG:
            continue
        cnt_map[key] = cnt_map.get(key, 0) + 1
        avg_key = "prev_month_avg" if "prev_month_avg" in r else "prev_week_avg"
        item = {
            "emdName":      r["emd_name"],
            "aptName":      r["apt_name"],
            "area":         float(r["area"]) if r["area"] is not None else None,
            "floor":        int(r["floor"])  if r["floor"] is not None else None,
            "price":        int(r["price"]),
            "dealDate":     r["deal_date"],
            "prevMonthAvg": int(r[avg_key]),
            "changePct":    float(r["change_pct"]) if r["change_pct"] is not None else None,
        }
        lookup.setdefault(period, {}).setdefault(sgg_code, []).append(item)
    return lookup


def attach_details(by_period: dict, detail_lookup: dict) -> dict:
    """각 시군구 row에 details 배열 부착 (해당 기간 있을 때만)"""
    for period, rows in by_period.items():
        period_details = detail_lookup.get(period, {})
        for row in rows:
            dets = period_details.get(row["sggCode"])
            if dets:
                row["details"] = dets
    return by_period


# ── 실행 ──
print(f"[1/4] 월간 집계 (최근 {MONTHS_BACK}개월)…")
monthly = bucket_rows(MONTHLY_SQL)
print(f"       {len(monthly)} 개월 · {sum(len(v) for v in monthly.values())} 시군구-행")

print(f"[2/4] 주간 집계 (최근 {WEEKS_BACK}주)…")
weekly = bucket_rows(WEEKLY_SQL)
print(f"       {len(weekly)} 주 · {sum(len(v) for v in weekly.values())} 시군구-행")

print(f"[3/4] 월간 세부 내역 (최근 {MONTHS_DETAIL}개월)…")
monthly_details = build_detail_lookup(MONTHLY_DETAIL_SQL)
m_detail_cnt = sum(len(v) for pd in monthly_details.values() for v in pd.values())
print(f"       {len(monthly_details)} 개월 · {m_detail_cnt} 건")

print(f"[4/4] 주간 세부 내역 (최근 {WEEKS_DETAIL}주)…")
weekly_details = build_detail_lookup(WEEKLY_DETAIL_SQL)
w_detail_cnt = sum(len(v) for pd in weekly_details.values() for v in pd.values())
print(f"       {len(weekly_details)} 주 · {w_detail_cnt} 건")

# ── 집계 파일 (기존과 동일 크기) ──
payload = {
    "lastUpdated": datetime.datetime.now().isoformat(timespec="seconds"),
    "methodology": (
        "반등 = 거래가 > 같은 단지+5㎡ 평형버킷의 전월/전주 평균 실거래가. "
        "비교 기준이 없는 거래(직전 기간 해당 단지·평형 거래 0건)는 분모에서도 제외."
    ),
    "monthly": monthly,
    "weekly":  weekly,
}
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n✓ {OUT} ({OUT.stat().st_size / 1024:.1f}KB)")

# ── 세부 내역 파일 (별도 서빙) ──
# 구조: { "monthly": { "2026-04-01": { "26410": [...] } }, "weekly": {...} }
details_payload = {
    "lastUpdated": datetime.datetime.now().isoformat(timespec="seconds"),
    "monthly": monthly_details,
    "weekly":  weekly_details,
}
OUT_DET.write_text(json.dumps(details_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"✓ {OUT_DET} ({OUT_DET.stat().st_size / 1024:.1f}KB)")
