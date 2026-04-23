import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

type RawItem = { sido: string; sigungu: string };

function loadData(): { items: RawItem[] } {
  const filePath = join(process.cwd(), "public", "data", "leading-danji.json");
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * GET /api/leading-danji/sigungu?sido=경기
 * → 해당 시도의 모든 시군구 목록 반환 (페이지네이션 없음)
 */
export async function GET(req: NextRequest) {
  const sido = req.nextUrl.searchParams.get("sido") ?? "전체";

  try {
    const { items } = loadData();

    // sido 필터 후 distinct sigungu 추출
    const filtered = sido === "전체" ? items : items.filter((d) => d.sido === sido);
    const set = new Set(filtered.map((d) => d.sigungu));
    const sigunguList = Array.from(set).sort();

    return NextResponse.json(
      { ok: true, sido, sigunguList },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "데이터 파일 없음" }, { status: 503 });
  }
}
