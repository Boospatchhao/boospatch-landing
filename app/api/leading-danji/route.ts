import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

type RawItem = Record<string, unknown>;
type DataFile = { updatedAt: string; baseWeek: string; total: number; items: RawItem[] };

function loadData(): DataFile {
  const filePath = join(process.cwd(), "public", "data", "leading-danji.json");
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export async function GET(req: NextRequest) {
  const sido     = req.nextUrl.searchParams.get("sido")    ?? "전체";
  const sigungu  = req.nextUrl.searchParams.get("sigungu") ?? "전체";
  const filter   = req.nextUrl.searchParams.get("filter")  ?? "all";  // "all" | "leading"
  const limit    = Math.min(Number(req.nextUrl.searchParams.get("limit")  ?? "100"), 300);
  const offset   = Number(req.nextUrl.searchParams.get("offset") ?? "0");

  try {
    const { items, updatedAt, baseWeek } = loadData();

    let filtered = items;
    if (sido !== "전체")    filtered = filtered.filter((d) => d.sido === sido);
    if (sigungu !== "전체") filtered = filtered.filter((d) => d.sigungu === sigungu);
    if (filter === "leading")   filtered = filtered.filter((d) => d.danji_tier === "leading");
    if (filter === "local_rep") filtered = filtered.filter((d) => d.danji_tier === "local_rep" || d.danji_tier === "leading");

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit).map((d, i) => ({
      ...d,
      rank: offset + i + 1,
    }));

    return NextResponse.json(
      { ok: true, updatedAt, baseWeek, total, items: paged },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "데이터 파일 없음. scripts/export_leading_danji.py 를 먼저 실행하세요." },
      { status: 503 }
    );
  }
}
