import { NextRequest, NextResponse } from "next/server";
import { getDanjiDb } from "@/lib/db/danji";

export const runtime = "nodejs";

/**
 * GET /api/danji/compare?ids=1234,5678,9012&pyeong=32
 *
 * 최대 3개 단지의 상세정보 + 월별 실거래 시계열 반환
 */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const pyeong   = Number(req.nextUrl.searchParams.get("pyeong") ?? "0");

  const ids = idsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => !isNaN(n) && n > 0)
    .slice(0, 3);

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  try {
    const db = getDanjiDb();
    const placeholders = ids.map(() => "?").join(",");

    // 각 단지의 대표 행 (요청 평형 or 최대 평형)
    const details = ids.map((id) => {
      if (pyeong) {
        return db
          .prepare(
            `SELECT * FROM danji WHERE id = ?
             ORDER BY ABS(supply_pyeong - ${pyeong})
             LIMIT 1`
          )
          .get(id);
      }
      return db
        .prepare(
          `SELECT * FROM danji WHERE id = ?
           ORDER BY household_count DESC, supply_pyeong DESC
           LIMIT 1`
        )
        .get(id);
    });

    // 평형 목록 (단지별)
    const pyeongs = ids.map((id) =>
      db
        .prepare(
          `SELECT supply_pyeong, price_per_pyeong, recent_price, jeonse_price,
                  jeonse_ratio, highest_price, hoga_price, nationwide_percentile, cagr
           FROM danji WHERE id = ?
           ORDER BY supply_pyeong`
        )
        .all(id)
    );

    // 월별 시계열 — 공통 평형 범위로 맞춤 (각 단지의 대표 평형 기준)
    const seriesList = ids.map((id, i) => {
      const det = details[i] as Record<string, unknown> | undefined;
      const basePyeong = pyeong || (det ? Number(det.supply_pyeong) : 0);
      if (!basePyeong) return [];
      return db
        .prepare(
          `SELECT yyyy_mm, avg_price, supply_pyeong
           FROM monthly_prices
           WHERE danji_id = ?
             AND supply_pyeong BETWEEN ? AND ?
           ORDER BY yyyy_mm DESC
           LIMIT 60`
        )
        .all(id, basePyeong - 5, basePyeong + 5);
    });

    return NextResponse.json(
      { details, pyeongs, seriesList },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
