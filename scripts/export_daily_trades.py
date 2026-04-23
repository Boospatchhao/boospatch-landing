"""
데일리 실거래 데이터 MotherDuck → JSON 추출
실행: python scripts/export_daily_trades.py
출력: public/data/daily-trades.json
"""
import json, os, sys, datetime
from pathlib import Path

TOKEN = os.getenv(
    "MOTHERDUCK_TOKEN",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFvdTg5MDhAZ21haWwuY29tIiwibWRSZWdpb24iOiJhd3MtdXMtZWFzdC0xIiwic2Vzc2lvbiI6ImFvdTg5MDguZ21haWwuY29tIiwicGF0IjoiQWVCNk53X3lrNVpHRkJxay1rNEJmTVp6T2Vlb1Q2T0EwVkp1STNWYVllbyIsInVzZXJJZCI6ImEwMDE3MGM0LTJmZTUtNGExZC04ODJhLTBhODgxNDQ4N2FlMyIsImlzcyI6Im1kX3BhdCIsInJlYWRPbmx5IjpmYWxzZSwidG9rZW5UeXBlIjoicmVhZF93cml0ZSIsImlhdCI6MTc3NjA1NTg3Nn0.dbUQBfJMQPfWTgnbCLGHcgJdDpDKMPn8FRTpXbtCzW8"
)

# ─────────────────────────────────────────────
# SQL 쿼리
# ─────────────────────────────────────────────

SQL_NEW_HIGH = """
WITH latest AS (SELECT MAX(deal_date) AS d FROM realty.marts.molit_trade_meme WHERE cancel_date IS NULL),
hist AS (
  SELECT molit_id,
         ROUND(exclusive_area / 3.3057)::INTEGER AS pyeong,
         MAX(price) AS prev_high,
         arg_max(deal_date, price) AS prev_high_date
  FROM realty.marts.molit_trade_meme CROSS JOIN latest
  WHERE cancel_date IS NULL AND deal_date < latest.d - INTERVAL '30 days'
  GROUP BY 1, 2
),
recent AS (
  SELECT t.molit_id, t.danji_name, t.sgg_code,
         ROUND(t.exclusive_area / 3.3057)::INTEGER AS pyeong,
         t.floor, t.price, t.deal_date, b.sido, b.sigungu,
         m.naver_id
  FROM realty.marts.molit_trade_meme t CROSS JOIN latest
  JOIN realty.staging.stg_postgres__bjd_codes b ON t.sgg_code = b.sgg_code
  LEFT JOIN (
    SELECT molit_id, ANY_VALUE(naver_id) AS naver_id
    FROM realty.staging.stg_postgres__naver_molit_pyeong_mapping
    GROUP BY molit_id
  ) m ON t.molit_id = m.molit_id
  WHERE t.cancel_date IS NULL AND b.eupmyeondong IS NULL
    AND t.deal_date BETWEEN latest.d - INTERVAL '30 days' AND latest.d
)
SELECT r.sido, r.sigungu, r.danji_name, r.pyeong, r.floor, r.price,
       h.prev_high, r.price - h.prev_high AS gap_price,
       DATE_DIFF('month', h.prev_high_date, r.deal_date)::INTEGER AS gap_months,
       r.deal_date::VARCHAR AS deal_date,
       r.naver_id
FROM recent r
JOIN hist h ON r.molit_id = h.molit_id AND r.pyeong = h.pyeong
WHERE r.price >= h.prev_high
ORDER BY r.price DESC
LIMIT 20
"""

SQL_SUMMARY = """
WITH latest AS (SELECT MAX(deal_date) AS d FROM realty.marts.molit_trade_meme WHERE cancel_date IS NULL)
SELECT
  COUNT(*) FILTER (WHERE deal_date BETWEEN d - INTERVAL '6 days' AND d)           AS this_week,
  COUNT(*) FILTER (WHERE deal_date BETWEEN d - INTERVAL '13 days' AND d - INTERVAL '7 days') AS prev_week,
  COUNT(*) FILTER (WHERE deal_date >= DATE_TRUNC('month', d))                     AS this_month,
  COUNT(*) FILTER (
    WHERE deal_date >= DATE_TRUNC('month', d) - INTERVAL '1 month'
      AND deal_date <  DATE_TRUNC('month', d)
  ) AS prev_month
FROM realty.marts.molit_trade_meme CROSS JOIN latest
WHERE cancel_date IS NULL
"""

SQL_SIDO_RANK = """
WITH latest AS (SELECT MAX(deal_date) AS d FROM realty.marts.molit_trade_meme WHERE cancel_date IS NULL),
this_week AS (
  SELECT b.sido, COUNT(*) AS cnt
  FROM realty.marts.molit_trade_meme t CROSS JOIN latest
  JOIN realty.staging.stg_postgres__bjd_codes b ON t.sgg_code = b.sgg_code
  WHERE t.cancel_date IS NULL AND b.eupmyeondong IS NULL
    AND t.deal_date BETWEEN latest.d - INTERVAL '6 days' AND latest.d
  GROUP BY 1
),
prev_week AS (
  SELECT b.sido, COUNT(*) AS cnt
  FROM realty.marts.molit_trade_meme t CROSS JOIN latest
  JOIN realty.staging.stg_postgres__bjd_codes b ON t.sgg_code = b.sgg_code
  WHERE t.cancel_date IS NULL AND b.eupmyeondong IS NULL
    AND t.deal_date BETWEEN latest.d - INTERVAL '13 days' AND latest.d - INTERVAL '7 days'
  GROUP BY 1
)
SELECT t.sido, t.cnt AS this_week, COALESCE(p.cnt, 0) AS prev_week,
       ROUND((t.cnt - COALESCE(p.cnt, 0)) * 100.0 / NULLIF(p.cnt, 0), 1) AS change_pct
FROM this_week t
LEFT JOIN prev_week p USING (sido)
ORDER BY t.cnt DESC
"""

SQL_TRADE_LIST = """
WITH latest AS (SELECT MAX(deal_date) AS d FROM realty.marts.molit_trade_meme WHERE cancel_date IS NULL)
SELECT b.sigungu AS region, t.danji_name,
       ROUND(t.exclusive_area / 3.3057)::INTEGER AS pyeong,
       t.price, t.floor, t.deal_date::VARCHAR AS deal_date
FROM realty.marts.molit_trade_meme t CROSS JOIN latest
JOIN realty.staging.stg_postgres__bjd_codes b ON t.sgg_code = b.sgg_code
WHERE t.cancel_date IS NULL AND b.eupmyeondong IS NULL
  AND t.deal_date BETWEEN latest.d - INTERVAL '7 days' AND latest.d
  AND t.price >= 50000
ORDER BY t.price DESC
LIMIT 30
"""

SQL_PRICE_RANGE = """
WITH latest AS (SELECT MAX(deal_date) AS d FROM realty.marts.molit_trade_meme WHERE cancel_date IS NULL),
base AS (
  SELECT t.molit_id, t.danji_name, b.sigungu, b.sido,
         t.exclusive_area, t.price, t.deal_date, t.floor,
         m.naver_id,
         CASE
           WHEN t.price < 20000  THEN '1억'
           WHEN t.price < 30000  THEN '2억'
           WHEN t.price < 40000  THEN '3억'
           WHEN t.price < 50000  THEN '4억'
           WHEN t.price < 60000  THEN '5억'
           WHEN t.price < 70000  THEN '6억'
           WHEN t.price < 80000  THEN '7억'
           WHEN t.price < 90000  THEN '8억'
           WHEN t.price < 100000 THEN '9억'
           WHEN t.price < 200000 THEN '10억'
           WHEN t.price < 300000 THEN '20억'
           ELSE '30억+'
         END AS price_bucket
  FROM realty.marts.molit_trade_meme t CROSS JOIN latest
  JOIN realty.staging.stg_postgres__bjd_codes b ON t.sgg_code = b.sgg_code
  LEFT JOIN (
    SELECT molit_id, ANY_VALUE(naver_id) AS naver_id
    FROM realty.staging.stg_postgres__naver_molit_pyeong_mapping
    GROUP BY molit_id
  ) m ON t.molit_id = m.molit_id
  WHERE t.cancel_date IS NULL AND b.eupmyeondong IS NULL
    AND t.deal_date BETWEEN latest.d - INTERVAL '30 days' AND latest.d
    AND t.price >= 10000
    AND (t.transaction_type = '중개거래' OR t.transaction_type IS NULL)
),
agg AS (
  SELECT molit_id, danji_name, sigungu, sido, price_bucket, naver_id,
         ROUND(AVG(exclusive_area))::INTEGER AS avg_area,
         ROUND(AVG(exclusive_area / 3.3057))::INTEGER AS avg_pyeong,
         COUNT(*) AS trade_cnt,
         ROUND(AVG(price))::INTEGER AS avg_price,
         MIN(price) AS min_price,
         MAX(price) AS max_price,
         MAX(deal_date)::VARCHAR AS latest_date,
         arg_max(floor, deal_date) AS latest_floor,
         arg_max(price, deal_date) AS latest_price
  FROM base
  GROUP BY 1,2,3,4,5,6
)
SELECT *,
       ROW_NUMBER() OVER (PARTITION BY price_bucket ORDER BY trade_cnt DESC) AS rnk
FROM agg
QUALIFY ROW_NUMBER() OVER (PARTITION BY price_bucket ORDER BY trade_cnt DESC) <= 100
ORDER BY price_bucket, trade_cnt DESC
"""

SQL_REBOUND = """
WITH latest_m AS (SELECT MAX(month_start) AS m FROM my_db.main.fi_rebound_monthly),
prev_m AS (
  SELECT MAX(month_start) AS m FROM my_db.main.fi_rebound_monthly
  WHERE month_start < (SELECT MAX(month_start) FROM my_db.main.fi_rebound_monthly)
)
SELECT r.sigungu, r.total_trades, r.rebound_trades, r.rebound_rate_pct,
       p.rebound_rate_pct AS prev_rate
FROM my_db.main.fi_rebound_monthly r
JOIN latest_m ON r.month_start = latest_m.m
LEFT JOIN my_db.main.fi_rebound_monthly p
  ON r.sgg_code = p.sgg_code AND p.month_start = (SELECT m FROM prev_m)
WHERE r.total_trades >= 10
ORDER BY r.rebound_rate_pct DESC
LIMIT 20
"""

# ─────────────────────────────────────────────
# 포맷 헬퍼
# ─────────────────────────────────────────────

def fmt_price(man_won: int) -> str:
    if man_won >= 10000:
        return f"{man_won / 10000:.1f}억"
    return f"{man_won:,}만"

def short_sido(sido: str) -> str:
    for s in ["특별자치시", "특별자치도", "특별시", "광역시", "도"]:
        sido = sido.replace(s, "")
    return sido

def safe_pct(a, b):
    try:
        return round((a - b) * 100 / b) if b else 0
    except:
        return 0

# ─────────────────────────────────────────────
# main
# ─────────────────────────────────────────────

def main():
    try:
        import duckdb
    except ImportError:
        print("ERROR: duckdb 미설치. 'pip install duckdb' 실행 후 재시도하세요.")
        sys.exit(1)

    print("MotherDuck 연결 중...")
    os.environ["motherduck_token"] = TOKEN
    con = duckdb.connect("md:")

    print("1/5 신고가 쿼리...")
    new_high_rows = con.execute(SQL_NEW_HIGH).fetchall()
    new_high_cols = [d[0] for d in con.description]

    print("2/5 요약 쿼리...")
    summary_row = con.execute(SQL_SUMMARY).fetchone()
    summary_cols = [d[0] for d in con.description]

    print("3/5 시도별 거래량 쿼리...")
    sido_rows = con.execute(SQL_SIDO_RANK).fetchall()
    sido_cols = [d[0] for d in con.description]

    print("4/5 거래 목록 쿼리...")
    trade_rows = con.execute(SQL_TRADE_LIST).fetchall()
    trade_cols = [d[0] for d in con.description]

    print("5/5 반등거래 쿼리...")
    rebound_rows = con.execute(SQL_REBOUND).fetchall()
    rebound_cols = [d[0] for d in con.description]

    print("6/6 가격대별 인기 아파트 쿼리...")
    price_range_rows = con.execute(SQL_PRICE_RANGE).fetchall()
    price_range_cols = [d[0] for d in con.description]

    # ── 신고가 ──────────────────────────────────
    new_high_trades = []
    for i, row in enumerate(new_high_rows):
        r = dict(zip(new_high_cols, row))
        new_high_trades.append({
            "rank": i + 1,
            "sido": r.get("sido") or "",
            "sigungu": r["sigungu"] or "",
            "aptName": r["danji_name"] or "",
            "area": f"{r['pyeong']}평",
            "floor": f"{r['floor']}층",
            "price": fmt_price(r["price"]),
            "prevHigh": f"+{fmt_price(r['gap_price'])}" if r.get("gap_price", 0) > 0 else "동가",
            "gapMonths": r.get("gap_months") or 0,
            "dealDate": str(r.get("deal_date") or ""),
            "danjiId": r.get("naver_id"),
        })

    # ── 요약 ──────────────────────────────────
    s = dict(zip(summary_cols, summary_row)) if summary_row else {}
    this_week  = int(s.get("this_week",  0) or 0)
    prev_week  = int(s.get("prev_week",  0) or 0)
    this_month = int(s.get("this_month", 0) or 0)
    prev_month = int(s.get("prev_month", 0) or 0)
    summary = [
        {"label": "이번주", "count": this_week,  "change": safe_pct(this_week,  prev_week)},
        {"label": "전주",   "count": prev_week,  "change": 0},
        {"label": "이번달", "count": this_month, "change": safe_pct(this_month, prev_month)},
    ]

    # ── 시도별 거래량 ─────────────────────────
    sido_rank = []
    surge_regions = []
    for i, row in enumerate(sido_rows):
        r = dict(zip(sido_cols, row))
        sido_rank.append({
            "rank": i + 1,
            "sido": short_sido(r["sido"] or ""),
            "count": int(r["this_week"] or 0),
            "prevWeekChange": float(r["change_pct"] or 0),
        })
    surge_regions = sorted(
        [x for x in sido_rank if x["prevWeekChange"] != 0],
        key=lambda x: abs(x["prevWeekChange"]), reverse=True
    )[:6]
    surge_regions = [{"sido": x["sido"], "change": x["prevWeekChange"]} for x in surge_regions]

    # ── 거래 목록 ─────────────────────────────
    trade_list = []
    for row in trade_rows:
        r = dict(zip(trade_cols, row))
        trade_list.append({
            "region":  r["region"] or "",
            "aptName": r["danji_name"] or "",
            "area":    f"{r['pyeong']}평",
            "price":   fmt_price(r["price"]),
            "floor":   f"{r['floor']}층",
            "date":    str(r["deal_date"] or ""),
        })

    # ── 반등거래 ──────────────────────────────
    rebound_rank = []
    for i, row in enumerate(rebound_rows):
        r = dict(zip(rebound_cols, row))
        rate     = float(r["rebound_rate_pct"] or 0)
        prev     = float(r["prev_rate"] or 0)
        rebound_rank.append({
            "rank":    i + 1,
            "sigungu": r["sigungu"] or "",
            "total":   int(r["total_trades"] or 0),
            "rebound": int(r["rebound_trades"] or 0),
            "rate":    rate,
            "trend":   "up" if rate >= prev else "down",
        })

    # ── 가격대별 인기 아파트 ─────────────────
    PRICE_BUCKETS = ['1억','2억','3억','4억','5억','6억','7억','8억','9억','10억','20억','30억+']
    price_buckets: dict = {b: [] for b in PRICE_BUCKETS}
    for row in price_range_rows:
        r = dict(zip(price_range_cols, row))
        bucket = r.get("price_bucket", "")
        if bucket not in price_buckets:
            continue
        price_buckets[bucket].append({
            "rank":        int(r["rnk"]),
            "aptName":     r["danji_name"] or "",
            "sigungu":     r["sigungu"] or "",
            "sido":        r["sido"] or "",
            "avgArea":     int(r["avg_area"] or 0),
            "avgPyeong":   int(r["avg_pyeong"] or 0),
            "tradeCnt":    int(r["trade_cnt"] or 0),
            "avgPrice":    fmt_price(int(r["avg_price"] or 0)),
            "minPrice":    fmt_price(int(r["min_price"] or 0)),
            "maxPrice":    fmt_price(int(r["max_price"] or 0)),
            "latestDate":  str(r["latest_date"] or ""),
            "latestFloor": int(r["latest_floor"] or 0),
            "latestPrice": fmt_price(int(r["latest_price"] or 0)),
            "danjiId":     r.get("naver_id"),
        })

    # ── 기준일 ────────────────────────────────
    today = datetime.date.today()
    report_date = today.strftime("%Y.%m.%d") + f"({['월','화','수','목','금','토','일'][today.weekday()]})"
    latest_d = today
    range_start = (latest_d - datetime.timedelta(days=30)).strftime("%Y.%m.%d")
    range_end = latest_d.strftime("%Y.%m.%d")

    output = {
        "generatedAt": datetime.datetime.now().isoformat(),
        "reportDate": report_date,
        "newHighTrades": new_high_trades,
        "regional": {
            "summary": summary,
            "sidoRank": sido_rank,
            "surgeRegions": surge_regions,
            "tradeList": trade_list,
        },
        "rebound": {
            "rank": rebound_rank,
        },
        "priceRange": {
            "generatedRange": f"{range_start} ~ {range_end}",
            "buckets": price_buckets,
        },
    }

    out_path = Path(__file__).parent.parent / "public" / "data" / "daily-trades.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"\n[완료] {out_path}")
    print(f"  신고가 {len(new_high_trades)}건 / 시도 {len(sido_rank)}개 / 거래목록 {len(trade_list)}건 / 반등 {len(rebound_rank)}건")
    total_pr = sum(len(v) for v in price_buckets.values())
    print(f"  가격대별 {total_pr}건 ({len(PRICE_BUCKETS)}개 구간)")

if __name__ == "__main__":
    main()
