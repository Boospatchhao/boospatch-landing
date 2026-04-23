"""
danji.db 재생성 — monthly_prices를 20년 전체(2006~) 기간으로 교체.

MotherDuck realty.marts.molit_trades_monthly → data/danji/danji.db

* danji 테이블: 기존 유지 (변경 없음)
* monthly_prices 테이블: DROP + 20년치 재적재

실행:  python scripts/rebuild_danji_db.py
"""
import os
import sqlite3
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "danji" / "danji.db"

env_path = ROOT / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("MOTHERDUCK_TOKEN="):
            os.environ["MOTHERDUCK_TOKEN"] = line.split("=", 1)[1].strip()

TOKEN = os.environ.get("MOTHERDUCK_TOKEN")
if not TOKEN:
    raise SystemExit("MOTHERDUCK_TOKEN 이 없습니다.")

import duckdb
md = duckdb.connect(f"md:?motherduck_token={TOKEN}")
print("✓ MotherDuck 연결")

# ── 1. MotherDuck에서 전체 monthly_prices 가져오기 ──
print("[1/3] monthly_prices 전체 기간 쿼리 (2006~현재, 실거래 + 분양권 분리)…")
rows = md.execute("""
    SELECT
      m.naver_id                          AS danji_id,
      t.supply_pyeong                     AS supply_pyeong,
      t.yyyy_mm                           AS yyyy_mm,
      t.meme_avg_price                    AS avg_price,
      CASE WHEN COALESCE(m.is_byg, FALSE) THEN 1 ELSE 0 END AS is_byg
    FROM realty.marts.molit_trades_monthly t
    INNER JOIN realty.staging.stg_postgres__naver_molit_pyeong_mapping m
      ON t.molit_id = m.molit_id AND t.supply_pyeong = m.supply_pyeong
    WHERE t.meme_avg_price IS NOT NULL
      AND m.naver_id IS NOT NULL
    ORDER BY m.naver_id, t.supply_pyeong, t.yyyy_mm
""").fetchall()
print(f"       {len(rows):,} 행 가져옴  ({rows[0][2] if rows else '?'} ~ {rows[-1][2] if rows else '?'})")

# ── 2. 기존 danji_id 집합 확인 (monthly_prices에 danji 테이블에 없는 ID 제거) ──
print("[2/3] danji 테이블 ID 확인…")
local = sqlite3.connect(str(DB_PATH))
cur = local.cursor()
existing_ids = set(r[0] for r in cur.execute("SELECT id FROM danji").fetchall())
print(f"       danji 테이블: {len(existing_ids):,} 단지")

# 기존 danji에 있는 것만 필터
filtered = [r for r in rows if r[0] in existing_ids]
print(f"       매칭된 행: {len(filtered):,} / {len(rows):,}")

# ── 3. monthly_prices 교체 ──
print("[3/3] monthly_prices DROP + 재적재…")
cur.execute("DROP TABLE IF EXISTS monthly_prices")
cur.execute("""
    CREATE TABLE monthly_prices (
        danji_id       INTEGER NOT NULL,
        supply_pyeong  INTEGER NOT NULL,
        yyyy_mm        TEXT    NOT NULL,
        avg_price      INTEGER NOT NULL,
        is_byg         INTEGER NOT NULL DEFAULT 0
    )
""")
cur.execute("CREATE INDEX idx_mp_danji ON monthly_prices (danji_id, supply_pyeong, yyyy_mm, is_byg)")

BATCH = 50000
for i in range(0, len(filtered), BATCH):
    batch = filtered[i:i + BATCH]
    cur.executemany(
        "INSERT INTO monthly_prices (danji_id, supply_pyeong, yyyy_mm, avg_price, is_byg) VALUES (?, ?, ?, ?, ?)",
        batch,
    )
    if (i // BATCH) % 20 == 0:
        print(f"       {i + len(batch):,} / {len(filtered):,}")

local.commit()

# 검증
cnt = cur.execute("SELECT COUNT(*) FROM monthly_prices").fetchone()[0]
first = cur.execute("SELECT MIN(yyyy_mm) FROM monthly_prices").fetchone()[0]
last = cur.execute("SELECT MAX(yyyy_mm) FROM monthly_prices").fetchone()[0]
local.close()

print(f"\n✓ {DB_PATH}")
print(f"  monthly_prices: {cnt:,} 행 · {first} ~ {last}")
print(f"  완료: {datetime.datetime.now().isoformat(timespec='seconds')}")
