import { NextResponse } from "next/server";
import { summary, type KBPeriodic } from "@/lib/db/kb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const region   = url.searchParams.get("region");
    const periodic = (url.searchParams.get("periodic") ?? "weekly") as KBPeriodic;

    if (!region) {
      return NextResponse.json({ error: "region 파라미터가 필요합니다." }, { status: 400 });
    }

    const indicators = summary(region, periodic);
    return NextResponse.json(
      { region, periodic, indicators },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    console.error("[GET /api/kb/summary]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
