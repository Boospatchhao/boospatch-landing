import { NextRequest, NextResponse } from "next/server";
import { getDanjiDb } from "@/lib/db/danji";

export const runtime = "nodejs";

/**
 * GET /api/danji/search?q=래미안&sido=경기도&limit=20
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q    = (searchParams.get("q") ?? "").trim();
  const sido = searchParams.get("sido") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);

  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const db = getDanjiDb();
    const params: (string | number)[] = [`%${q}%`];
    let sql = `
      SELECT id, name, sido, sigungu, emd, address,
             household_count, approve_year, supply_pyeong,
             price_per_pyeong, recent_price, jeonse_ratio,
             nationwide_percentile, location_score,
             is_brand, is_large, is_new, is_station
      FROM danji
      WHERE name LIKE ?
    `;
    if (sido) {
      sql += ` AND sido = ?`;
      params.push(sido);
    }
    sql += `
      GROUP BY id
      HAVING supply_pyeong = MAX(supply_pyeong)
      ORDER BY household_count DESC NULLS LAST, price_per_pyeong DESC NULLS LAST
      LIMIT ?
    `;
    params.push(limit);

    const rows = db.prepare(sql).all(...params);
    return NextResponse.json({ results: rows }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
