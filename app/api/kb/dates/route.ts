import { NextResponse } from "next/server";
import { listDates, type KBPeriodic, type KBIndexType } from "@/lib/db/kb";

export const runtime = "nodejs";

/**
 * GET /api/kb/dates?indexType=매매가격지수&periodic=weekly
 * 사용 가능한 날짜 목록 반환 (기간 슬라이더용)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const indexType = (url.searchParams.get("indexType") ?? "매매가격지수") as KBIndexType;
    const periodic  = (url.searchParams.get("periodic")  ?? "weekly") as KBPeriodic;
    const dates = listDates(indexType, periodic);
    return NextResponse.json(
      { dates },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
