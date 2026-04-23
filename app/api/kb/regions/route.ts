import { NextResponse } from "next/server";
import { listRegions, type KBPeriodic, type KBIndexType } from "@/lib/db/kb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const periodic  = (url.searchParams.get("periodic")  ?? "weekly") as KBPeriodic;
    const indexType = (url.searchParams.get("indexType") ?? undefined) as KBIndexType | undefined;

    const regions = listRegions(periodic, indexType);
    return NextResponse.json(
      { regions, periodic, indexType: indexType ?? null },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    console.error("[GET /api/kb/regions]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
