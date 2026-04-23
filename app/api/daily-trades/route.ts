import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import type { DailyTradesResponse, ApiErrorResponse } from "@/lib/types/dailyTrades";

export const runtime = "nodejs";

/**
 * GET /api/daily-trades
 *
 * public/data/daily-trades.json 을 읽어 반환.
 * 데이터 갱신: scripts/export_daily_trades.py 실행 (매일 자동화 권장)
 */
export async function GET(): Promise<NextResponse<DailyTradesResponse | ApiErrorResponse>> {
  try {
    const filePath = join(process.cwd(), "public", "data", "daily-trades.json");
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as DailyTradesResponse;

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch {
    return NextResponse.json(
      { error: "데이터 파일 없음. scripts/export_daily_trades.py 를 먼저 실행하세요." },
      { status: 503 }
    );
  }
}
