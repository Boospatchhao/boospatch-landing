import { NextResponse } from "next/server";
import { querySeries, type KBPeriodic, type KBIndexType } from "@/lib/db/kb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type     = url.searchParams.get("type")     as KBIndexType | null;
    const periodic = url.searchParams.get("periodic") as KBPeriodic  | null;
    const region   = url.searchParams.get("region");
    const since    = url.searchParams.get("since")    ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit    = limitRaw ? Math.min(parseInt(limitRaw, 10), 5000) : undefined;

    if (!type || !periodic || !region) {
      return NextResponse.json(
        { error: "type, periodic, region 파라미터가 모두 필요합니다." },
        { status: 400 }
      );
    }

    const points = querySeries({ type, periodic, region, since, limit });
    return NextResponse.json(
      { type, periodic, region, count: points.length, points },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    console.error("[GET /api/kb/series]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
