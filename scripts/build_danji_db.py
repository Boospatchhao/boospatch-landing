"""
단지 비교 기능용 SQLite DB 생성.

MotherDuck → data/danji/danji.db (SQLite, better-sqlite3로 서빙)

테이블:
  danji          — 단지 기본정보 + 입지점수 + 상품성 플래그
  monthly_prices — 월별 평균 실거래가 (최근 60개월, 커플링 상관계수 계산용)

실행: python scripts/build_danji_db.py
"""
import os, sqlite3, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "danji" / "danji.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── MotherDuck 연결 ──
env_path = ROOT / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("MOTHERDUCK_TOKEN="):
            os.environ["MOTHERDUCK_TOKEN"] = line.split("=", 1)[1].strip()

TOKEN = os.environ.get("MOTHERDUCK_TOKEN")
if not TOKEN: raise SystemExit("MOTHERDUCK_TOKEN 없음")

import duckdb
md = duckdb.connect(f"md:?motherduck_token={TOKEN}")
print("✓ MotherDuck 연결")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. 단지 마스터 쿼리
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DANJI_SQL = """
WITH bjd AS (
  SELECT DISTINCT bjd_code, sido, sigungu, eupmyeondong
  FROM realty.staging.stg_postgres__bjd_codes
  WHERE eupmyeondong IS NULL
),
brand_list AS (
  -- 브랜드 시공사 목록 (하드코딩)
  SELECT UNNEST(['삼성', '현대', 'LG', '대림', '대우', '롯데', 'SK', 'GS', '포스코', '두산',
                 '쌍용', '한화', '한라', '코오롱', '효성', '금호', '아이에스', '중흥', '호반',
                 '태영', '동부', '신동아', '반도', '제일', '서희', 'e편한세상', '자이', '래미안',
                 '힐스테이트', '아이파크', '푸르지오', '더샵', '롯데캐슬', '이편한세상', '캐슬',
                 '엘스', '리첸시아', '센트럴', '펠리스']) AS keyword
),
danji_brand AS (
  SELECT c.naver_id,
         COUNT(b.keyword) > 0 AS is_brand
  FROM realty.staging.stg_postgres__complexes c
  LEFT JOIN realty.staging.stg_s3__complex_detail cd2 ON c.naver_id = cd2.complex_no
  CROSS JOIN brand_list b
  WHERE COALESCE(cd2.construction_company_name,'') ILIKE '%' || b.keyword || '%'
     OR c.danji_name ILIKE '%' || b.keyword || '%'
  GROUP BY 1
),
school_info AS (
  -- 초품아: 단지 내 초등학교 여부 (location score 중 park_score 대용)
  SELECT DISTINCT bjd_code FROM realty.staging.stg_postgres__elementary_school
  WHERE distance_m IS NOT NULL AND distance_m <= 300
)
SELECT
  c.naver_id                                    AS id,
  c.danji_name                                  AS name,
  c.address,
  b.sido,
  b.sigungu,
  b.eupmyeondong                                AS emd,
  c.total_household_count                       AS household_count,
  c.use_approve_ymd                             AS approve_ymd,
  SUBSTRING(c.use_approve_ymd, 1, 4)::INTEGER   AS approve_year,
  cd.construction_company_name                  AS builder,
  cd.parking_count_by_household                 AS parking_per_hh,
  -- 평형 / 시세
  p.supply_pyeong,
  p.molit_price_per_pyeong                      AS price_per_pyeong,
  p.molit_meme_price                            AS recent_price,
  p.molit_jeonse_price                          AS jeonse_price,
  CASE WHEN p.molit_meme_price > 0
       THEN ROUND(p.molit_jeonse_price * 100.0 / p.molit_meme_price)::INTEGER
       ELSE NULL END                            AS jeonse_ratio,
  p.nationwide_percentile,
  p.molit_meme_cagr                             AS cagr,
  p.molit_highest_price                         AS highest_price,
  p.hoga_meme_mid_60                            AS hoga_price,
  -- 입지 종합
  l.location_score,
  l.transport_score                             AS transport_score_loc,
  l.school_district_score,
  l.academy_score,
  l.job_score,
  l.commercial_score,
  l.park_score,
  -- 교통 상세
  t.gangnam_transport_time                      AS commute_gangnam,
  t.yeouido_transport_time                      AS commute_yeouido,
  t.gwanghwamun_transport_time                  AS commute_gwanghwamun,
  t.has_subway,
  t.station_proximity_score,
  t.transport_score                             AS transport_score_raw,
  -- 상품성 플래그
  COALESCE(db.is_brand, FALSE)                  AS is_brand,
  c.total_household_count >= 500                AS is_large,
  CASE WHEN SUBSTRING(c.use_approve_ymd,1,4)::INTEGER >= 2017
       THEN TRUE ELSE FALSE END                 AS is_new,
  COALESCE(t.has_subway, FALSE)                 AS is_station,
  COALESCE(cd.parking_count_by_household >= 1.0, FALSE) AS has_parking,
  FALSE                                         AS has_elem_school,  -- simplified
  -- 좌표
  c.latitude,
  c.longitude
FROM realty.staging.stg_postgres__complexes c
LEFT JOIN bjd b ON c.bjd_code = b.bjd_code
LEFT JOIN realty.staging.stg_s3__complex_detail cd ON c.naver_id = cd.complex_no
LEFT JOIN realty.marts.complexes_pyeong_summary p ON c.naver_id = p.naver_id
LEFT JOIN realty.marts.complexes_location_score l ON c.naver_id = l.danji_id
LEFT JOIN realty.marts.complexes_transport_score t ON c.naver_id = t.danji_id
LEFT JOIN danji_brand db ON c.naver_id = db.naver_id
WHERE p.molit_price_per_pyeong IS NOT NULL
  AND p.molit_price_per_pyeong > 0
  AND c.naver_id IS NOT NULL
ORDER BY c.naver_id, p.supply_pyeong
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. 월별 실거래가 쿼리 (커플링 상관계수용, 최근 60개월)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MONTHLY_SQL = """
WITH mapping AS (
  SELECT molit_id, naver_id, supply_pyeong
  FROM realty.staging.stg_postgres__naver_molit_pyeong_mapping
  WHERE NOT COALESCE(is_byg, FALSE)
)
SELECT DISTINCT
  nm.naver_id                         AS danji_id,
  nm.supply_pyeong,
  m.yyyy_mm,
  ROUND(AVG(m.meme_avg_price) OVER (
    PARTITION BY nm.naver_id, nm.supply_pyeong, m.yyyy_mm
  ))::INTEGER                         AS avg_price
FROM realty.marts.molit_trades_monthly m
JOIN mapping nm ON m.molit_id = nm.molit_id AND m.supply_pyeong = nm.supply_pyeong
WHERE m.meme_avg_price IS NOT NULL
ORDER BY nm.naver_id, nm.supply_pyeong, m.yyyy_mm
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SQLite 생성
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if DB_PATH.exists():
    DB_PATH.unlink()
con = sqlite3.connect(str(DB_PATH))
cur = con.cursor()

cur.executescript("""
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE danji (
  id                   INTEGER NOT NULL,
  name                 TEXT NOT NULL,
  address              TEXT,
  sido                 TEXT,
  sigungu              TEXT,
  emd                  TEXT,
  household_count      INTEGER,
  approve_ymd          TEXT,
  approve_year         INTEGER,
  builder              TEXT,
  parking_per_hh       REAL,
  supply_pyeong        INTEGER NOT NULL,
  price_per_pyeong     INTEGER,
  recent_price         INTEGER,
  jeonse_price         INTEGER,
  jeonse_ratio         INTEGER,
  nationwide_percentile REAL,
  cagr                 REAL,
  highest_price        INTEGER,
  hoga_price           INTEGER,
  location_score       REAL,
  transport_score_loc  REAL,
  school_district_score REAL,
  academy_score        INTEGER,
  job_score            REAL,
  commercial_score     REAL,
  park_score           INTEGER,
  commute_gangnam      INTEGER,
  commute_yeouido      INTEGER,
  commute_gwanghwamun  INTEGER,
  has_subway           INTEGER,
  station_proximity_score INTEGER,
  transport_score_raw  REAL,
  is_brand             INTEGER,
  is_large             INTEGER,
  is_new               INTEGER,
  is_station           INTEGER,
  has_parking          INTEGER,
  has_elem_school      INTEGER,
  latitude             REAL,
  longitude            REAL,
  PRIMARY KEY (id, supply_pyeong)
);

CREATE TABLE monthly_prices (
  danji_id      INTEGER NOT NULL,
  supply_pyeong INTEGER NOT NULL,
  yyyy_mm       TEXT NOT NULL,
  avg_price     INTEGER,
  PRIMARY KEY (danji_id, supply_pyeong, yyyy_mm)
);

CREATE INDEX idx_danji_name    ON danji(name);
CREATE INDEX idx_danji_sido    ON danji(sido);
CREATE INDEX idx_danji_sigungu ON danji(sigungu);
CREATE INDEX idx_danji_price   ON danji(price_per_pyeong);
CREATE INDEX idx_monthly_danji ON monthly_prices(danji_id, supply_pyeong);
""")

print("[1/2] 단지 마스터 쿼리 실행 중…")
rows = md.execute(DANJI_SQL).fetchall()
cols = [d[0] for d in md.description]
print(f"       {len(rows)}행 로드")

def _f(v):
    """decimal/bool/None → Python 기본 타입으로 변환"""
    if v is None: return None
    if isinstance(v, bool): return int(v)
    try:
        from decimal import Decimal
        if isinstance(v, Decimal): return float(v)
    except ImportError: pass
    return v

def to_row(r):
    d = {k: _f(v) for k, v in zip(cols, r)}
    return (
        d["id"], d["name"], d["address"], d["sido"], d["sigungu"], d["emd"],
        d["household_count"], d["approve_ymd"], d["approve_year"], d["builder"], d["parking_per_hh"],
        d["supply_pyeong"], d["price_per_pyeong"], d["recent_price"], d["jeonse_price"],
        d["jeonse_ratio"], d["nationwide_percentile"], d["cagr"], d["highest_price"], d["hoga_price"],
        d["location_score"], d["transport_score_loc"], d["school_district_score"],
        d["academy_score"], d["job_score"], d["commercial_score"], d["park_score"],
        d["commute_gangnam"], d["commute_yeouido"], d["commute_gwanghwamun"],
        int(bool(d["has_subway"])) if d["has_subway"] is not None else 0,
        d["station_proximity_score"], d["transport_score_raw"],
        int(bool(d["is_brand"])), int(bool(d["is_large"])), int(bool(d["is_new"])),
        int(bool(d["is_station"])), int(bool(d["has_parking"])), int(bool(d["has_elem_school"])),
        d["latitude"], d["longitude"],
    )

cur.executemany(
    "INSERT OR REPLACE INTO danji VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [to_row(r) for r in rows]
)
con.commit()
print(f"       danji 테이블 완료 ({cur.rowcount} 삽입)")

print("[2/2] 월별 시세 쿼리 실행 중…")
mrows = md.execute(MONTHLY_SQL).fetchall()
print(f"       {len(mrows)}행 로드")
cur.executemany(
    "INSERT OR REPLACE INTO monthly_prices VALUES (?,?,?,?)",
    mrows
)
con.commit()
print(f"       monthly_prices 완료 ({cur.rowcount} 삽입)")

# 통계
print()
cur.execute("SELECT COUNT(DISTINCT id) FROM danji")
danji_cnt = cur.fetchone()[0]
cur.execute("SELECT COUNT(DISTINCT danji_id) FROM monthly_prices")
monthly_cnt = cur.fetchone()[0]
print(f"✓ danji: {danji_cnt:,}개 단지 | monthly_prices: {monthly_cnt:,}개 단지 시계열")
print(f"✓ {DB_PATH} ({DB_PATH.stat().st_size / 1024 / 1024:.1f}MB)")

con.close()
md.close()
print(f"\n완료: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
