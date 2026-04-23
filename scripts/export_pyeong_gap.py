"""
평형갭 데이터 + 연간 실거래가 스파크라인 내보내기.
MotherDuck → public/data/pyeong-gap.json

갭 유형:
  59_84  : 22~26평 ↔ 31~35평 (59㎡ ↔ 84㎡)
  84_115 : 31~35평 ↔ 39~45평 (84㎡ ↔ 115㎡)

실행: python scripts/export_pyeong_gap.py
"""
import os, json, datetime
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
OUT  = ROOT / "public" / "data" / "pyeong-gap.json"

# ── MotherDuck 연결 ──
env_path = ROOT / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("MOTHERDUCK_TOKEN="):
            os.environ["MOTHERDUCK_TOKEN"] = line.split("=", 1)[1].strip()

TOKEN = os.environ.get("MOTHERDUCK_TOKEN")
if not TOKEN:
    raise SystemExit("MOTHERDUCK_TOKEN 없음")

import duckdb
md = duckdb.connect(f"md:?motherduck_token={TOKEN}")
print("MotherDuck 연결 완료")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. 평형갭 쿼리
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GAP_SQL = """
WITH base AS (
  SELECT
    p.naver_id, c.danji_name,
    b.sido, b.sigungu, b.eupmyeondong AS emd,
    p.supply_pyeong,
    p.hoga_meme_mid_60    AS hoga,
    c.total_household_count
  FROM realty.marts.complexes_pyeong_summary p
  JOIN realty.staging.stg_postgres__complexes c ON p.naver_id = c.naver_id
  LEFT JOIN realty.staging.stg_postgres__bjd_codes b ON c.bjd_code = b.bjd_code
  WHERE p.hoga_meme_mid_60 > 0
    AND b.sido IS NOT NULL
),
gap_59_84 AS (
  SELECT '59_84' AS gap_type,
         s.naver_id, s.danji_name, s.sido, s.sigungu, s.emd,
         s.supply_pyeong  AS pyeong_s,
         lg.supply_pyeong AS pyeong_l,
         s.hoga  AS hoga_s,
         lg.hoga AS hoga_l,
         lg.hoga - s.hoga AS gap,
         ROUND((lg.hoga - s.hoga) * 100.0 / s.hoga, 1) AS gap_pct,
         s.total_household_count
  FROM base s
  JOIN base lg ON s.naver_id = lg.naver_id
  WHERE s.supply_pyeong  BETWEEN 22 AND 26
    AND lg.supply_pyeong BETWEEN 31 AND 35
    AND lg.hoga >= s.hoga
),
gap_84_115 AS (
  SELECT '84_115' AS gap_type,
         s.naver_id, s.danji_name, s.sido, s.sigungu, s.emd,
         s.supply_pyeong  AS pyeong_s,
         lg.supply_pyeong AS pyeong_l,
         s.hoga  AS hoga_s,
         lg.hoga AS hoga_l,
         lg.hoga - s.hoga AS gap,
         ROUND((lg.hoga - s.hoga) * 100.0 / s.hoga, 1) AS gap_pct,
         s.total_household_count
  FROM base s
  JOIN base lg ON s.naver_id = lg.naver_id
  WHERE s.supply_pyeong  BETWEEN 31 AND 35
    AND lg.supply_pyeong BETWEEN 39 AND 45
    AND lg.hoga >= s.hoga
)
SELECT * FROM gap_59_84
UNION ALL
SELECT * FROM gap_84_115
ORDER BY gap_type, gap_pct ASC, hoga_s DESC
"""

print("[1/2] 평형갭 쿼리...")
gap_rows = md.execute(GAP_SQL).fetchall()
gap_cols = [d[0] for d in md.description]
print(f"  {len(gap_rows)}행")

def _v(v):
    if v is None: return None
    try:
        from decimal import Decimal
        if isinstance(v, Decimal): return float(v)
    except ImportError: pass
    if isinstance(v, bool): return int(v)
    return v

# gap 행을 dict로
gap_list = [{c: _v(v) for c, v in zip(gap_cols, r)} for r in gap_rows]

# 유니크 (naver_id, pyeong) 쌍 수집
needed: dict[int, set[int]] = defaultdict(set)
for d in gap_list:
    needed[d["naver_id"]].add(d["pyeong_s"])
    needed[d["naver_id"]].add(d["pyeong_l"])

naver_ids = list(needed.keys())
print(f"  스파크라인 대상: {len(naver_ids)}개 단지")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. 연간 실거래가 쿼리 (스파크라인용)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 배치 처리 (MotherDuck IN 절 크기 제한 방어)
BATCH = 2000
annual_map: dict[tuple[int, int], dict[int, int]] = defaultdict(dict)

print("[2/2] 연간 실거래가 쿼리...")
for i in range(0, len(naver_ids), BATCH):
    batch_ids = naver_ids[i:i+BATCH]
    id_str = ",".join(str(x) for x in batch_ids)
    sql = f"""
    WITH mapping AS (
      SELECT molit_id, naver_id, supply_pyeong
      FROM realty.staging.stg_postgres__naver_molit_pyeong_mapping
      WHERE NOT COALESCE(is_byg, FALSE)
    )
    SELECT nm.naver_id, nm.supply_pyeong,
           YEAR(STRPTIME(m.yyyy_mm, '%Y-%m'))::INTEGER AS yr,
           ROUND(AVG(m.meme_avg_price))::INTEGER        AS avg_price
    FROM realty.marts.molit_trades_monthly m
    JOIN mapping nm ON m.molit_id = nm.molit_id
                   AND m.supply_pyeong = nm.supply_pyeong
    WHERE m.meme_avg_price IS NOT NULL
      AND nm.naver_id IN ({id_str})
    GROUP BY 1, 2, 3
    ORDER BY 1, 2, 3
    """
    rows = md.execute(sql).fetchall()
    for nid, pyeong, yr, price in rows:
        if pyeong in needed.get(nid, set()):
            annual_map[(nid, pyeong)][yr] = price
    print(f"  배치 {i//BATCH+1}/{(len(naver_ids)-1)//BATCH+1}: {len(rows)}행")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. 결합 + JSON 생성
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YEARS = list(range(2006, 2027))  # 2006~2026

def build_spark(naver_id: int, pyeong: int) -> list:
    """연도별 가격 배열 (없으면 null). 단위: 만원"""
    price_by_year = annual_map.get((naver_id, pyeong), {})
    arr = [price_by_year.get(y) for y in YEARS]
    # 앞뒤 null 제거 후 시작 오프셋 기록
    first = next((i for i, v in enumerate(arr) if v is not None), None)
    if first is None:
        return []
    last  = len(arr) - next(i for i, v in enumerate(reversed(arr)) if v is not None) - 1
    return [YEARS[first], arr[first:last+1]]  # [시작연도, 값배열]

result: dict = {
    "updatedAt": datetime.date.today().isoformat(),
    "years": YEARS,
    "59_84":  [],
    "84_115": [],
}

for d in gap_list:
    nid = d["naver_id"]
    ps  = d["pyeong_s"]
    pl  = d["pyeong_l"]
    item = {
        "naverId":        nid,
        "name":           d["danji_name"],
        "sido":           d["sido"],
        "sigungu":        d["sigungu"],
        "emd":            d["emd"],
        "pyeongS":        ps,
        "pyeongL":        pl,
        "hogaS":          d["hoga_s"],
        "hogaL":          d["hoga_l"],
        "gap":            d["gap"],
        "gapPct":         d["gap_pct"],
        "householdCount": d["total_household_count"],
        "sparkS":         build_spark(nid, ps),
        "sparkL":         build_spark(nid, pl),
    }
    result[d["gap_type"]].append(item)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

size = OUT.stat().st_size / 1024 / 1024
print(f"\n{OUT}  ({size:.1f}MB)")
print(f"59_84: {len(result['59_84'])}건 | 84_115: {len(result['84_115'])}건")
md.close()
print(f"완료: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
