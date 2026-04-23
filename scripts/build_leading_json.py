"""
Combine 6 batch JSON files into public/data/leading-danji.json
Run: python scripts/build_leading_json.py
"""
import json, pathlib

COLS = [
    "sido","sigungu","emd_name","dong_turn_ym","is_leading","emd_rank",
    "name","naver_id","units","rep_pyeong","rep_hoga_eok","ppp",
    "sgg_avg_price","mktcap_eok","liq_monthly","leading_score",
    "mktcap_pct","ppp_pct","liq_pct","hoga_chg_pct","maemul_chg_pct",
    "hoga_score","maemul_score","turn_status","first_turn_ym",
    "max_rise_pct","cohort","wave_group"
]

base = pathlib.Path(__file__).parent
rows = []
for i in range(1, 7):
    f = base / f"b{i}.json"
    batch = json.loads(f.read_text(encoding="utf-8"))
    rows.extend(batch)
    print(f"  b{i}.json: {len(batch)} rows (total so far: {len(rows)})")

items = [dict(zip(COLS, r)) for r in rows]

dest = pathlib.Path(r"c:\Users\aou89\OneDrive\문서\OneDrive\바탕 화면\Cursor AI 코드\boospatch-landing\public\data\leading-danji.json")
dest.write_text(
    json.dumps(
        {"updatedAt": "2026-04-13T00:00:00", "baseWeek": "2026-04-06",
         "total": len(items), "items": items},
        ensure_ascii=False, separators=(',', ':')
    ),
    encoding="utf-8"
)
print(f"Done: {len(items)} rows → {dest}")
