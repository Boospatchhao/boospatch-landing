import { NextResponse } from "next/server";
import { regionDeltas, regionDeltasRange, type KBPeriodic, type KBIndexType } from "@/lib/db/kb";

export const runtime = "nodejs";

/**
 * GET /api/kb/delta?indexType=매매가격지수&periodic=weekly[&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD]
 * 지도 히트맵용 — 모든 지역의 변동률 반환.
 * fromDate/toDate 지정 시 해당 구간 누적 변동률, 미지정 시 최신 1주간 변동률.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const indexType = (url.searchParams.get("indexType") ?? "매매가격지수") as KBIndexType;
    const periodic  = (url.searchParams.get("periodic")  ?? "weekly") as KBPeriodic;
    const fromDate  = url.searchParams.get("fromDate");
    const toDate    = url.searchParams.get("toDate");

    const deltas = fromDate && toDate
      ? regionDeltasRange(indexType, periodic, fromDate, toDate).map((r) => ({
          region: r.region,
          latest: r.endVal,
          prev: r.startVal,
          deltaPct: r.deltaPct,
          latestDate: r.endDate,
        }))
      : regionDeltas(indexType, periodic);

    return NextResponse.json(
      { indexType, periodic, count: deltas.length, deltas },
      { headers: { "Cache-Control": fromDate ? "no-store" : "public, s-maxage=21600, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    console.error("[GET /api/kb/delta]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
