import { NextRequest, NextResponse } from "next/server";
import { getDanjiDb } from "@/lib/db/danji";

export const runtime = "nodejs";

/**
 * GET /api/danji/[id]/coupling?pyeong=32&limit=10
 *
 * 커플링 단지 = 평단가 ±5% 이내 + 월별 가격 상관계수 상위 순 정렬
 * 반환: 상관계수 상위 단지 목록
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const naverId = Number(id);
  const pyeong  = Number(req.nextUrl.searchParams.get("pyeong") ?? "0");
  const limit   = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "15"), 30);

  if (isNaN(naverId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  try {
    const db = getDanjiDb();

    // 기준 단지 평단가 + 시도 + 시계열
    const base = db.prepare(`
      SELECT id, supply_pyeong, price_per_pyeong, sigungu, sido
      FROM danji WHERE id = ?
      ORDER BY ${pyeong ? `ABS(supply_pyeong - ${pyeong})` : "household_count DESC"}
      LIMIT 1
    `).get(naverId) as { id: number; supply_pyeong: number; price_per_pyeong: number; sigungu: string; sido: string } | undefined;

    if (!base || !base.price_per_pyeong) {
      return NextResponse.json({ candidates: [] });
    }

    const targetPyeong = pyeong || base.supply_pyeong;
    const priceLow  = Math.floor(base.price_per_pyeong * 0.95);
    const priceHigh = Math.ceil(base.price_per_pyeong * 1.05);

    // 평단가 ±5% + 같은 시도 또는 전국 (최대 300개 후보)
    const candidates = db.prepare(`
      SELECT DISTINCT d.id, d.name, d.sido, d.sigungu, d.address,
             d.household_count, d.approve_year, d.supply_pyeong,
             d.price_per_pyeong, d.recent_price, d.jeonse_price, d.jeonse_ratio,
             d.location_score, d.nationwide_percentile,
             d.is_brand, d.is_large, d.is_new, d.is_station,
             d.latitude, d.longitude
      FROM danji d
      WHERE d.id != ?
        AND d.price_per_pyeong BETWEEN ? AND ?
        AND d.supply_pyeong BETWEEN ? AND ?
      ORDER BY ABS(d.price_per_pyeong - ?) ASC
      LIMIT 300
    `).all(
      naverId,
      priceLow, priceHigh,
      targetPyeong - 5, targetPyeong + 5,
      base.price_per_pyeong
    ) as Array<Record<string, unknown>>;

    if (candidates.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // 기준 단지 시계열 (최근 24개월)
    const baseTs = db.prepare(`
      SELECT yyyy_mm, avg_price FROM monthly_prices
      WHERE danji_id = ? AND supply_pyeong BETWEEN ? AND ?
      ORDER BY yyyy_mm DESC LIMIT 24
    `).all(naverId, targetPyeong - 5, targetPyeong + 5) as Array<{ yyyy_mm: string; avg_price: number }>;

    if (baseTs.length < 6) {
      // 시계열 너무 짧으면 가격 유사도만으로 정렬
      return NextResponse.json({
        candidates: candidates.slice(0, limit).map(c => ({ ...c, correlation: null }))
      });
    }

    const baseMap = new Map<string, number>(baseTs.map(r => [r.yyyy_mm, r.avg_price]));
    const months  = [...baseMap.keys()].sort();

    // 후보들의 상관계수 계산
    const candIds = candidates.map(c => Number(c.id));
    const placeholders = candIds.map(() => "?").join(",");
    const candTs = db.prepare(`
      SELECT danji_id, yyyy_mm, avg_price FROM monthly_prices
      WHERE danji_id IN (${placeholders})
        AND supply_pyeong BETWEEN ? AND ?
        AND yyyy_mm IN (${months.map(() => "?").join(",")})
    `).all(...candIds, targetPyeong - 5, targetPyeong + 5, ...months) as Array<{ danji_id: number; yyyy_mm: string; avg_price: number }>;

    // danji_id → {yyyy_mm: avg_price}
    const tsMap = new Map<number, Map<string, number>>();
    for (const r of candTs) {
      if (!tsMap.has(r.danji_id)) tsMap.set(r.danji_id, new Map());
      tsMap.get(r.danji_id)!.set(r.yyyy_mm, r.avg_price);
    }

    function pearson(xs: number[], ys: number[]): number {
      const n = xs.length;
      if (n < 4) return 0;
      const mx = xs.reduce((a, b) => a + b) / n;
      const my = ys.reduce((a, b) => a + b) / n;
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < n; i++) {
        const ex = xs[i] - mx, ey = ys[i] - my;
        num += ex * ey; dx += ex * ex; dy += ey * ey;
      }
      return dx * dy === 0 ? 0 : num / Math.sqrt(dx * dy);
    }

    const ranked = candidates
      .map(c => {
        const cTs = tsMap.get(Number(c.id));
        if (!cTs || cTs.size < 6) return { ...c, correlation: null };
        const xs: number[] = [], ys: number[] = [];
        for (const m of months) {
          const bv = baseMap.get(m), cv = cTs.get(m);
          if (bv && cv) { xs.push(bv); ys.push(cv); }
        }
        const corr = xs.length >= 6 ? Math.round(pearson(xs, ys) * 1000) / 1000 : null;
        return { ...c, correlation: corr };
      })
      .sort((a, b) => {
        // 상관계수 있으면 상관계수 내림차순, 없으면 가격 유사도
        if (a.correlation !== null && b.correlation !== null) return (b.correlation as number) - (a.correlation as number);
        if (a.correlation !== null) return -1;
        if (b.correlation !== null) return 1;
        const ca = a as Record<string, unknown>;
        const cb = b as Record<string, unknown>;
        return Math.abs(Number(ca.price_per_pyeong) - base.price_per_pyeong) - Math.abs(Number(cb.price_per_pyeong) - base.price_per_pyeong);
      })
      .slice(0, limit);

    return NextResponse.json({ candidates: ranked }, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
