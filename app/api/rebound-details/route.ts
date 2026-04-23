import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

let cache: { data: Record<string, Record<string, Record<string, unknown[]>>>; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30분

function loadData() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  const filePath = join(process.cwd(), "public", "data", "rebound-details.json");
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as {
    monthly: Record<string, Record<string, unknown[]>>;
    weekly:  Record<string, Record<string, unknown[]>>;
  };
  cache = { data: { monthly: parsed.monthly, weekly: parsed.weekly }, ts: Date.now() };
  return cache.data;
}

/**
 * GET /api/rebound-details?granularity=monthly&period=2026-04-01&sggCode=26410
 * 반환: { details: ReboundDetailItem[] }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const granularity = searchParams.get("granularity") ?? "monthly";
  const period      = searchParams.get("period");
  const sggCode     = searchParams.get("sggCode");

  if (!period || !sggCode) {
    return NextResponse.json({ error: "period, sggCode 파라미터 필수" }, { status: 400 });
  }

  try {
    const data = loadData();
    const byPeriod = granularity === "weekly" ? data.weekly : data.monthly;
    const details = byPeriod?.[period]?.[sggCode] ?? [];
    return NextResponse.json({ details }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch {
    return NextResponse.json({ error: "rebound-details.json 파일 없음" }, { status: 503 });
  }
}
