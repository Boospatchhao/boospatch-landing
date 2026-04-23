"""
silgga.com 스타일 데일리 실거래 JSON export (v2).

MotherDuck realty DB → public/data/trades-silgga.json
- 최근 30일치 매매 + 전세 시도별 집계
- 신고가 판정: 같은 단지+평형버킷(5㎡) 이전 최고가 대비 경신
- 응답 구조: availableDates / summaries[type][date] = { total, newHigh, sidoCards[] }

실행:  python scripts/export_trades_silgga.py
환경:  .env.local 의 MOTHERDUCK_TOKEN
"""
import os
import json
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT  = ROOT / "public" / "data" / "trades-silgga.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

# ─────────── env ───────────
env_path = ROOT / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("MOTHERDUCK_TOKEN="):
            os.environ["MOTHERDUCK_TOKEN"] = line.split("=", 1)[1].strip()

TOKEN = os.environ.get("MOTHERDUCK_TOKEN")
if not TOKEN:
    raise SystemExit("MOTHERDUCK_TOKEN 이 없습니다.")

import duckdb  # noqa: E402
con = duckdb.connect(f"md:?motherduck_token={TOKEN}")
print("✓ MotherDuck 연결")

DAYS = 90  # 12주 baseline 확보 → 안정적 주간 평균 계산

def available_dates(table: str, cancel_filter: bool) -> list[dict]:
    extra = "AND cancel_date IS NULL" if cancel_filter else ""
    sql = f"""
      SELECT deal_date::VARCHAR AS date, COUNT(*)::INTEGER AS cnt
      FROM realty.marts.{table}
      WHERE deal_date >= CURRENT_DATE - 120 {extra}
      GROUP BY deal_date
      ORDER BY deal_date DESC
      LIMIT {DAYS}
    """
    return [{"date": r[0], "cnt": int(r[1])} for r in con.execute(sql).fetchall()]

def sido_summary(table: str, date_from: str, date_to: str, cancel_filter: bool) -> dict:
    target_where = "AND t.cancel_date IS NULL" if cancel_filter else ""
    hist_where   = "WHERE h.cancel_date IS NULL" if cancel_filter else ""
    sql = f"""
      WITH target AS (
        SELECT t.danji_name, t.exclusive_area, t.price, t.deal_date, b.sido,
               CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket
        FROM realty.marts.{table} t
        LEFT JOIN (SELECT DISTINCT sgg_code, sido FROM realty.staging.stg_postgres__bjd_codes) b
          USING (sgg_code)
        WHERE t.deal_date BETWEEN '{date_from}' AND '{date_to}'
          {target_where}
      ),
      keys AS (
        SELECT DISTINCT danji_name, area_bucket, MIN(deal_date) AS min_dt
        FROM target GROUP BY 1, 2
      ),
      hist_max AS (
        SELECT h.danji_name,
               CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
               MAX(h.price) AS prev_max_price
        FROM realty.marts.{table} h
        JOIN keys k ON h.danji_name = k.danji_name
                   AND CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) = k.area_bucket
                   AND h.deal_date < k.min_dt
        {hist_where}
        GROUP BY 1, 2
      ),
      flagged AS (
        SELECT t.*,
               CASE WHEN t.price > COALESCE(h.prev_max_price, 0) THEN 1 ELSE 0 END AS is_new_high
        FROM target t
        LEFT JOIN hist_max h ON h.danji_name = t.danji_name AND h.area_bucket = t.area_bucket
      )
      SELECT
        deal_date::VARCHAR AS date,
        sido,
        COUNT(*)::INTEGER AS deal_cnt,
        SUM(is_new_high)::INTEGER AS new_high_cnt,
        ROUND(AVG(CASE WHEN exclusive_area BETWEEN 78 AND 90 THEN price END)) AS avg84,
        ROUND(AVG(CASE WHEN exclusive_area BETWEEN 55 AND 65 THEN price END)) AS avg59
      FROM flagged
      WHERE sido IS NOT NULL
      GROUP BY deal_date, sido
      ORDER BY deal_date DESC, deal_cnt DESC
    """
    rows = con.execute(sql).fetchall()
    by_date: dict[str, dict] = {}
    for date, sido, cnt, nh, a84, a59 in rows:
        entry = by_date.setdefault(date, {"total": 0, "newHigh": 0, "sidoCards": []})
        entry["sidoCards"].append({
            "sido": sido,
            "dealCnt": int(cnt),
            "newHighCnt": int(nh or 0),
            "avg84": int(a84) if a84 is not None else None,
            "avg59": int(a59) if a59 is not None else None,
        })
        entry["total"]   += int(cnt)
        entry["newHigh"] += int(nh or 0)
    return by_date

# ─────────── run ───────────
print("[1/4] 매매 available dates")
meme_dates = available_dates("molit_trade_meme", cancel_filter=True)
print(f"       {len(meme_dates)} dates · latest={meme_dates[0]['date'] if meme_dates else 'n/a'}")

print("[2/4] 전세 available dates")
jeonse_dates = available_dates("molit_trade_jeonse", cancel_filter=False)
print(f"       {len(jeonse_dates)} dates · latest={jeonse_dates[0]['date'] if jeonse_dates else 'n/a'}")

if not meme_dates or not jeonse_dates:
    raise SystemExit("날짜 목록을 가져오지 못했습니다.")

m_from, m_to = meme_dates[-1]["date"],   meme_dates[0]["date"]
j_from, j_to = jeonse_dates[-1]["date"], jeonse_dates[0]["date"]

print(f"[3/8] 매매 시도 집계 {m_from} ~ {m_to}")
meme_summary = sido_summary("molit_trade_meme", m_from, m_to, cancel_filter=True)

print(f"[4/8] 전세 시도 집계 {j_from} ~ {j_to}")
jeonse_summary = sido_summary("molit_trade_jeonse", j_from, j_to, cancel_filter=False)

# ─────────────── 시군구 집계 ───────────────
def sigungu_summary(table: str, date_from: str, date_to: str, cancel_filter: bool) -> dict:
    """시군구별 집계. 반환: {date: {sido: [sigunguCards...]}}"""
    target_where = "AND t.cancel_date IS NULL" if cancel_filter else ""
    hist_where   = "WHERE h.cancel_date IS NULL" if cancel_filter else ""
    sql = f"""
      WITH target AS (
        SELECT t.danji_name, t.exclusive_area, t.price, t.deal_date, t.sgg_code,
               b.sido, b.sigungu,
               CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket
        FROM realty.marts.{table} t
        LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
          USING (sgg_code)
        WHERE t.deal_date BETWEEN '{date_from}' AND '{date_to}'
          {target_where}
      ),
      keys AS (
        SELECT DISTINCT danji_name, area_bucket, MIN(deal_date) AS min_dt
        FROM target GROUP BY 1, 2
      ),
      hist_max AS (
        SELECT h.danji_name,
               CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
               MAX(h.price) AS prev_max_price
        FROM realty.marts.{table} h
        JOIN keys k ON h.danji_name = k.danji_name
                   AND CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) = k.area_bucket
                   AND h.deal_date < k.min_dt
        {hist_where}
        GROUP BY 1, 2
      ),
      flagged AS (
        SELECT t.*,
               CASE WHEN t.price > COALESCE(h.prev_max_price, 0) THEN 1 ELSE 0 END AS is_new_high
        FROM target t
        LEFT JOIN hist_max h ON h.danji_name = t.danji_name AND h.area_bucket = t.area_bucket
      )
      SELECT
        deal_date::VARCHAR AS date,
        sido, sigungu, sgg_code,
        COUNT(*)::INTEGER AS deal_cnt,
        SUM(is_new_high)::INTEGER AS new_high_cnt,
        ROUND(AVG(CASE WHEN exclusive_area BETWEEN 78 AND 90 THEN price END)) AS avg84,
        ROUND(AVG(CASE WHEN exclusive_area BETWEEN 55 AND 65 THEN price END)) AS avg59
      FROM flagged
      WHERE sido IS NOT NULL AND sigungu IS NOT NULL
      GROUP BY deal_date, sido, sigungu, sgg_code
      ORDER BY deal_date DESC, deal_cnt DESC
    """
    rows = con.execute(sql).fetchall()
    by_date: dict[str, dict] = {}
    for date, sido, sigungu, sgg_code, cnt, nh, a84, a59 in rows:
        entry = by_date.setdefault(date, {})
        sido_bucket = entry.setdefault(sido, [])
        sido_bucket.append({
            "sigungu": sigungu,
            "sggCode": sgg_code,
            "dealCnt": int(cnt),
            "newHighCnt": int(nh or 0),
            "avg84": int(a84) if a84 is not None else None,
            "avg59": int(a59) if a59 is not None else None,
        })
    return by_date

print(f"[5/8] 매매 시군구 집계")
meme_sigungu   = sigungu_summary("molit_trade_meme",   m_from, m_to, cancel_filter=True)
print(f"[6/8] 전세 시군구 집계")
jeonse_sigungu = sigungu_summary("molit_trade_jeonse", j_from, j_to, cancel_filter=False)

# ─────────────── 신고가 주요거래 TOP 50 ───────────────
def new_high_details(table: str, date_from: str, date_to: str, cancel_filter: bool) -> dict:
    """신고가만 필터한 상세 거래. 반환: {date: [trade, ...]} — 각 거래 최대 50건 (가격 내림차순)"""
    target_where = "AND t.cancel_date IS NULL" if cancel_filter else ""
    hist_where   = "WHERE h.cancel_date IS NULL" if cancel_filter else ""
    # emd_name: molit에 있지만 null 많음 → bjd.eupmyeondong 으로 대체 시도 어려움 (sgg_code 는 시군구단위)
    # emd_name 이 채워진 건 그대로 사용
    sql = f"""
      WITH target AS (
        SELECT t.danji_name, t.emd_name, t.exclusive_area, t.price, t.floor, t.deal_date,
               t.sgg_code, b.sido, b.sigungu,
               CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket
        FROM realty.marts.{table} t
        LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
          USING (sgg_code)
        WHERE t.deal_date BETWEEN '{date_from}' AND '{date_to}'
          {target_where}
      ),
      keys AS (
        SELECT DISTINCT danji_name, area_bucket, MIN(deal_date) AS min_dt
        FROM target GROUP BY 1, 2
      ),
      hist_max AS (
        SELECT h.danji_name,
               CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
               MAX(h.price) AS prev_max_price,
               arg_max(h.deal_date, h.price)::VARCHAR AS prev_high_date
        FROM realty.marts.{table} h
        JOIN keys k ON h.danji_name = k.danji_name
                   AND CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) = k.area_bucket
                   AND h.deal_date < k.min_dt
        {hist_where}
        GROUP BY 1, 2
      ),
      flagged AS (
        SELECT t.*,
               COALESCE(h.prev_max_price, 0) AS prev_max,
               h.prev_high_date
        FROM target t
        LEFT JOIN hist_max h ON h.danji_name = t.danji_name AND h.area_bucket = t.area_bucket
        WHERE t.price > COALESCE(h.prev_max_price, 0)  -- 신고가만
      ),
      ranked AS (
        SELECT deal_date::VARCHAR AS date,
               sido, sigungu, sgg_code, emd_name AS dong, danji_name,
               ROUND(exclusive_area / 3.3057)::INTEGER AS pyeong,
               exclusive_area, floor, price, prev_max AS prev_high, prev_high_date,
               (price - prev_max)::INTEGER AS gap,
               ROW_NUMBER() OVER (PARTITION BY deal_date ORDER BY price DESC) AS rn
        FROM flagged
      )
      SELECT * FROM ranked WHERE rn <= 50 ORDER BY date DESC, rn
    """
    rows = con.execute(sql).fetchall()
    cols = [d[0] for d in con.description]
    by_date: dict[str, list] = {}
    for row in rows:
        r = dict(zip(cols, row))
        date = r["date"]
        by_date.setdefault(date, []).append({
            "rank":       int(r["rn"]),
            "sido":       r["sido"],
            "sigungu":    r["sigungu"],
            "sggCode":    r["sgg_code"],
            "dong":       r["dong"] or "",
            "aptName":    r["danji_name"] or "",
            "pyeong":     int(r["pyeong"]) if r["pyeong"] is not None else None,
            "area":       float(r["exclusive_area"]) if r["exclusive_area"] is not None else None,
            "floor":      int(r["floor"]) if r["floor"] is not None else None,
            "price":      int(r["price"]),
            "prevHigh":   int(r["prev_high"]) if r["prev_high"] else None,
            "prevHighDate": r["prev_high_date"],
            "gap":        int(r["gap"]) if r["gap"] is not None else None,
        })
    return by_date

# ─────────────── 전체 거래 상세 (가격 상위 100, 신고가 플래그 포함) ───────────────
def all_trade_details(table: str, date_from: str, date_to: str, cancel_filter: bool) -> dict:
    """전체 거래 중 가격 상위 100건 + 신고가 여부 플래그. 반환: {date: [trade, ...]}"""
    target_where = "AND t.cancel_date IS NULL" if cancel_filter else ""
    hist_where   = "WHERE h.cancel_date IS NULL" if cancel_filter else ""
    sql = f"""
      WITH target AS (
        SELECT t.danji_name, t.emd_name, t.exclusive_area, t.price, t.floor, t.deal_date,
               t.sgg_code, b.sido, b.sigungu,
               CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket
        FROM realty.marts.{table} t
        LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
          USING (sgg_code)
        WHERE t.deal_date BETWEEN '{date_from}' AND '{date_to}'
          {target_where}
      ),
      keys AS (
        SELECT DISTINCT danji_name, area_bucket, MIN(deal_date) AS min_dt
        FROM target GROUP BY 1, 2
      ),
      hist_max AS (
        SELECT h.danji_name,
               CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
               MAX(h.price) AS prev_max_price,
               arg_max(h.deal_date, h.price)::VARCHAR AS prev_high_date
        FROM realty.marts.{table} h
        JOIN keys k ON h.danji_name = k.danji_name
                   AND CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) = k.area_bucket
                   AND h.deal_date < k.min_dt
        {hist_where}
        GROUP BY 1, 2
      ),
      flagged AS (
        SELECT t.*,
               COALESCE(h.prev_max_price, 0) AS prev_max,
               h.prev_high_date,
               CASE WHEN t.price > COALESCE(h.prev_max_price, 0) AND h.prev_max_price IS NOT NULL THEN 1 ELSE 0 END AS is_new_high
        FROM target t
        LEFT JOIN hist_max h ON h.danji_name = t.danji_name AND h.area_bucket = t.area_bucket
      ),
      ranked AS (
        SELECT deal_date::VARCHAR AS date,
               sido, sigungu, sgg_code, emd_name AS dong, danji_name,
               ROUND(exclusive_area / 3.3057)::INTEGER AS pyeong,
               exclusive_area, floor, price, prev_max AS prev_high, prev_high_date,
               (price - prev_max)::INTEGER AS gap,
               is_new_high,
               ROW_NUMBER() OVER (PARTITION BY deal_date ORDER BY price DESC) AS rn
        FROM flagged
      )
      SELECT * FROM ranked WHERE rn <= 100 ORDER BY date DESC, rn
    """
    rows = con.execute(sql).fetchall()
    cols = [d[0] for d in con.description]
    by_date: dict[str, list] = {}
    for row in rows:
        r = dict(zip(cols, row))
        date = r["date"]
        by_date.setdefault(date, []).append({
            "rank":       int(r["rn"]),
            "sido":       r["sido"],
            "sigungu":    r["sigungu"],
            "sggCode":    r["sgg_code"],
            "dong":       r["dong"] or "",
            "aptName":    r["danji_name"] or "",
            "pyeong":     int(r["pyeong"]) if r["pyeong"] is not None else None,
            "area":       float(r["exclusive_area"]) if r["exclusive_area"] is not None else None,
            "floor":      int(r["floor"]) if r["floor"] is not None else None,
            "price":      int(r["price"]),
            "prevHigh":   int(r["prev_high"]) if r["prev_high"] else None,
            "prevHighDate": r["prev_high_date"],
            "gap":        int(r["gap"]) if r["gap"] is not None else None,
            "isNewHigh":  bool(r["is_new_high"]),
        })
    return by_date

m_from_recent = meme_dates[min(29, len(meme_dates) - 1)]["date"]
j_from_recent = jeonse_dates[min(29, len(jeonse_dates) - 1)]["date"]
print(f"[7/8] 매매 전체 거래 TOP 100 (최근 30일, 신고가 플래그)")
meme_all_trades  = all_trade_details("molit_trade_meme",   m_from_recent, m_to, cancel_filter=True)
print(f"[8/8] 전세 전체 거래 TOP 100 (최근 30일)")
jeonse_all_trades = all_trade_details("molit_trade_jeonse", j_from_recent, j_to, cancel_filter=False)

# ─────────────── 읍면동 주간 집계 ───────────────
def emd_weekly(table: str, date_from: str, date_to: str, cancel_filter: bool) -> dict:
    """주(일~토)별 · 시군구별 · 읍면동별 거래/신고가 집계.
       반환: {weekSunday: {sggCode: [{emd, dealCnt, newHighCnt, maxPrice}]}}
    """
    target_where = "AND t.cancel_date IS NULL" if cancel_filter else ""
    hist_where   = "WHERE h.cancel_date IS NULL" if cancel_filter else ""
    sql = f"""
      WITH target AS (
        SELECT t.danji_name, t.emd_name, t.exclusive_area, t.price, t.deal_date,
               t.sgg_code, b.sido, b.sigungu,
               CAST(FLOOR(t.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
               -- 주(일요일)
               (t.deal_date - (EXTRACT(DOW FROM t.deal_date)::INTEGER))::VARCHAR AS week_sun
        FROM realty.marts.{table} t
        LEFT JOIN (SELECT DISTINCT sgg_code, sido, sigungu FROM realty.staging.stg_postgres__bjd_codes) b
          USING (sgg_code)
        WHERE t.deal_date BETWEEN '{date_from}' AND '{date_to}'
          AND t.emd_name IS NOT NULL
          {target_where}
      ),
      keys AS (
        SELECT DISTINCT danji_name, area_bucket, MIN(deal_date) AS min_dt
        FROM target GROUP BY 1, 2
      ),
      hist_max AS (
        SELECT h.danji_name,
               CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) AS area_bucket,
               MAX(h.price) AS prev_max_price
        FROM realty.marts.{table} h
        JOIN keys k ON h.danji_name = k.danji_name
                   AND CAST(FLOOR(h.exclusive_area / 5) * 5 AS INTEGER) = k.area_bucket
                   AND h.deal_date < k.min_dt
        {hist_where}
        GROUP BY 1, 2
      ),
      flagged AS (
        SELECT t.*,
               CASE WHEN t.price > COALESCE(h.prev_max_price, 0) THEN 1 ELSE 0 END AS is_new_high
        FROM target t
        LEFT JOIN hist_max h ON h.danji_name = t.danji_name AND h.area_bucket = t.area_bucket
      )
      SELECT
        week_sun,
        sgg_code,
        emd_name AS emd,
        COUNT(*)::INTEGER AS deal_cnt,
        SUM(is_new_high)::INTEGER AS new_high_cnt,
        MAX(price)::INTEGER AS max_price
      FROM flagged
      WHERE sgg_code IS NOT NULL
      GROUP BY week_sun, sgg_code, emd_name
      HAVING COUNT(*) > 0
      ORDER BY week_sun DESC, sgg_code, deal_cnt DESC
    """
    rows = con.execute(sql).fetchall()
    out: dict[str, dict[str, list]] = {}
    for week_sun, sgg_code, emd, cnt, nh, mp in rows:
        out.setdefault(week_sun, {}).setdefault(sgg_code, []).append({
            "emd": emd,
            "dealCnt": int(cnt),
            "newHighCnt": int(nh or 0),
            "maxPrice": int(mp) if mp is not None else None,
        })
    return out

print(f"[9/10] 매매 읍면동 주간 집계")
meme_emd   = emd_weekly("molit_trade_meme",   m_from, m_to, cancel_filter=True)
print(f"[10/10] 전세 읍면동 주간 집계")
jeonse_emd = emd_weekly("molit_trade_jeonse", j_from, j_to, cancel_filter=False)

payload = {
    "lastUpdated": datetime.datetime.now().isoformat(timespec="seconds"),
    "sourceNote": "국토교통부 실거래공개시스템 · realty MotherDuck",
    "availableDates": {
        "meme":   meme_dates,
        "jeonse": jeonse_dates,
    },
    "summaries": {
        "meme":   meme_summary,
        "jeonse": jeonse_summary,
    },
    "sigunguSummaries": {
        "meme":   meme_sigungu,
        "jeonse": jeonse_sigungu,
    },
    "newHighDetails": {
        "meme":   meme_all_trades,
        "jeonse": jeonse_all_trades,
    },
    "emdWeekly": {
        "meme":   meme_emd,
        "jeonse": jeonse_emd,
    },
}

OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n✓ {OUT} ({OUT.stat().st_size / 1024:.1f}KB)")
print(f"  매매 {len(meme_summary)}일 · 전세 {len(jeonse_summary)}일")
