import { NextRequest, NextResponse } from "next/server";
import { getDanjiDb } from "@/lib/db/danji";

export const runtime = "nodejs";

/**
 * GET /api/danji/[id]?pyeong=32
 * 단지 상세 + 평형별 시세 목록
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const naverId = Number(id);
  if (isNaN(naverId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const db = getDanjiDb();

    // 대표 행 (최대 평형 기준)
    const detail = db.prepare(`
      SELECT * FROM danji WHERE id = ?
      ORDER BY household_count DESC, supply_pyeong DESC
      LIMIT 1
    `).get(naverId);

    if (!detail) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    // 평형 목록
    const pyeongs = db.prepare(`
      SELECT supply_pyeong, price_per_pyeong, recent_price, jeonse_price,
             jeonse_ratio, highest_price, hoga_price, nationwide_percentile, cagr
      FROM danji WHERE id = ?
      ORDER BY supply_pyeong
    `).all(naverId);

    // 월별 시세 — 전체 기간, 모든 평형 (06년~현재), 분양권 구분
    const monthlyPrices = db.prepare(`
      SELECT yyyy_mm, avg_price, supply_pyeong, is_byg
      FROM monthly_prices
      WHERE danji_id = ?
      ORDER BY supply_pyeong, yyyy_mm ASC
    `).all(naverId);

    return NextResponse.json({ detail, pyeongs, monthlyPrices }, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
