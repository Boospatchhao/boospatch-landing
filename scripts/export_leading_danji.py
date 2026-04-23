"""
리딩단지 데이터를 MotherDuck → JSON으로 추출
신규: leading_danji_master + fi_hoga_maemul_weekly 조인
실행: python scripts/export_leading_danji.py
"""
import json
import os
import sys
from pathlib import Path
import datetime

TOKEN = os.getenv(
    "MOTHERDUCK_TOKEN",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFvdTg5MDhAZ21haWwuY29tIiwibWRSZWdpb24iOiJhd3MtdXMtZWFzdC0xIiwic2Vzc2lvbiI6ImFvdTg5MDguZ21haWwuY29tIiwicGF0IjoiQWVCNk53X3lrNVpHRkJxay1rNEJmTVp6T2Vlb1Q2T0EwVkp1STNWYVllbyIsInVzZXJJZCI6ImEwMDE3MGM0LTJmZTUtNGExZC04ODJhLTBhODgxNDQ4N2FlMyIsImlzcyI6Im1kX3BhdCIsInJlYWRPbmx5IjpmYWxzZSwidG9rZW5UeXBlIjoicmVhZF93cml0ZSIsImlhdCI6MTc3NjA1NTg3Nn0.dbUQBfJMQPfWTgnbCLGHcgJdDpDKMPn8FRTpXbtCzW8"
)

SQL = """
WITH rep_pyeong AS (
    SELECT
        naver_id,
        CAST(ROUND(FIRST(supply_pyeong ORDER BY avg_volume DESC, avg_hoga DESC)) AS INTEGER)
            AS rep_pyeong,
        ROUND(FIRST(hoga_chg_pct   ORDER BY avg_volume DESC, avg_hoga DESC), 2) AS hoga_chg_pct,
        ROUND(FIRST(maemul_chg_pct ORDER BY avg_volume DESC, avg_hoga DESC), 2) AS maemul_chg_pct,
        FIRST(hoga_score   ORDER BY avg_volume DESC, avg_hoga DESC) AS hoga_score,
        FIRST(maemul_score ORDER BY avg_volume DESC, avg_hoga DESC) AS maemul_score,
        ROUND(FIRST(avg_hoga ORDER BY avg_volume DESC, avg_hoga DESC) / 10000.0, 1)
            AS rep_hoga_eok
    FROM my_db.main.fi_hoga_maemul_weekly
    WHERE base_week = (SELECT MAX(base_week) FROM my_db.main.fi_hoga_maemul_weekly)
    GROUP BY naver_id
),
deduped AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY naver_id ORDER BY leading_score DESC NULLS LAST) AS dup_rank
    FROM my_db.main.leading_danji_master
    WHERE sido IN ('서울', '경기', '인천')
),
sgg_ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY sigungu ORDER BY leading_score DESC) AS sgg_rank,
        MAX(leading_score)  OVER (PARTITION BY sigungu)                      AS sgg_max_score
    FROM deduped
    WHERE dup_rank = 1
),
tiered AS (
    SELECT *,
        CASE
            WHEN sgg_max_score >= 80 AND leading_score >= 80 THEN 'leading'
            WHEN sgg_max_score >= 60 AND sgg_max_score < 80 AND sgg_rank <= 5 THEN 'local_rep'
            WHEN sgg_max_score < 60  AND sgg_rank <= 2                        THEN 'local_top'
        END AS danji_tier
    FROM sgg_ranked
    WHERE (sgg_max_score >= 80 AND leading_score >= 80)
       OR (sgg_max_score >= 60 AND sgg_max_score < 80 AND sgg_rank <= 5)
       OR (sgg_max_score < 60  AND sgg_rank <= 2)
)
SELECT
    m.sido,
    m.sigungu,
    m.emd_name,
    COALESCE(m.emd_confirmed_turn_ym, '')  AS dong_turn_ym,
    m.is_leading,
    m.emd_rank,
    m.danji_name                            AS name,
    m.naver_id,
    m.hh                                    AS units,
    m.danji_tier,

    r.rep_pyeong,
    r.rep_hoga_eok,

    COALESCE(m.max_ppp, 0)                 AS ppp,
    COALESCE(m.sgg_avg_price, 0)           AS sgg_avg_price,
    COALESCE(m.mktcap_eok, 0)             AS mktcap_eok,
    ROUND(COALESCE(m.liq_monthly, 0), 2)  AS liq_monthly,

    ROUND(m.leading_score, 1)              AS leading_score,
    ROUND(COALESCE(m.mktcap_pct, 0), 1)   AS mktcap_pct,
    ROUND(COALESCE(m.ppp_pct, 0), 1)      AS ppp_pct,
    ROUND(COALESCE(m.liq_pct, 0), 1)      AS liq_pct,

    r.hoga_chg_pct,
    r.maemul_chg_pct,
    r.hoga_score,
    r.maemul_score,

    COALESCE(m.turn_status, '미전환')      AS turn_status,
    COALESCE(m.first_turn_ym, '')          AS first_turn_ym,
    ROUND(COALESCE(m.max_rise_pct, 0), 1) AS max_rise_pct,
    COALESCE(m.cohort, '')                 AS cohort,
    COALESCE(m.wave_group, 0)              AS wave_group

FROM tiered m
LEFT JOIN rep_pyeong r ON m.naver_id = r.naver_id
ORDER BY
    CASE m.danji_tier WHEN 'leading' THEN 1 WHEN 'local_rep' THEN 2 ELSE 3 END,
    m.leading_score DESC,
    m.mktcap_eok DESC
"""

BASE_WEEK_SQL = """
SELECT STRFTIME(MAX(base_week), '%Y-%m-%d') AS base_week
FROM my_db.main.fi_hoga_maemul_weekly
"""

def main():
    try:
        import duckdb
    except ImportError:
        print("ERROR: duckdb 미설치. 'pip install duckdb' 실행 후 재시도하세요.")
        sys.exit(1)

    print("MotherDuck 연결 중...")
    os.environ["motherduck_token"] = TOKEN
    con = duckdb.connect("md:")

    # 호가/매물 기준주
    base_week = con.execute(BASE_WEEK_SQL).fetchone()[0]
    print(f"  호가/매물 기준주: {base_week}")

    print("쿼리 실행 중...")
    rows = con.execute(SQL).fetchall()
    cols = [d[0] for d in con.description]

    data = []
    for row in rows:
        item = dict(zip(cols, row))
        # None → null 처리 (JSON 직렬화)
        for k, v in item.items():
            if v is None:
                item[k] = None
        data.append(item)

    print(f"  → {len(data)}개 단지 로드됨")

    output = {
        "updatedAt": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "baseWeek": base_week,
        "total": len(data),
        "items": data,
    }

    out_path = Path(__file__).parent.parent / "public" / "data" / "leading-danji.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"저장 완료: {out_path}")

if __name__ == "__main__":
    main()
