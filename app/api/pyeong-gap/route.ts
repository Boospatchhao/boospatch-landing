import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

interface GapItem {
  naverId: number;
  name: string;
  sido: string;
  sigungu: string;
  emd: string;
  pyeongS: number;
  pyeongL: number;
  hogaS: number;
  hogaL: number;
  gap: number;
  gapPct: number;
  householdCount: number;
  sparkS: [number, (number | null)[]] | [];
  sparkL: [number, (number | null)[]] | [];
}

interface GapFile {
  updatedAt: string;
  years: number[];
  "59_84": GapItem[];
  "84_115": GapItem[];
}

let _cache: { data: GapFile; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000;

function getFile(): GapFile {
  if (!_cache || Date.now() - _cache.ts > CACHE_MS) {
    const p = join(process.cwd(), "public", "data", "pyeong-gap.json");
    _cache = { data: JSON.parse(readFileSync(p, "utf-8")) as GapFile, ts: Date.now() };
  }
  return _cache.data;
}

/**
 * GET /api/pyeong-gap?type=59_84&sido=서울특별시&limit=200
 */
export async function GET(req: NextRequest) {
  const type   = req.nextUrl.searchParams.get("type") ?? "59_84";
  const sido   = req.nextUrl.searchParams.get("sido") ?? "";
  const limit  = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "300"), 500);

  try {
    const file  = getFile();
    const pool  = type === "84_115" ? file["84_115"] : file["59_84"];
    const items = sido ? pool.filter((d) => d.sido === sido) : pool;

    return NextResponse.json(
      { items: items.slice(0, limit), total: items.length, updatedAt: file.updatedAt },
      { headers: { "Cache-Control": "public, s-maxage=1800" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
