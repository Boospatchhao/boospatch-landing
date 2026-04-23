/* ============================================================
   GET /api/daily-trades — 공유 타입 정의
   서버(route.ts)와 클라이언트(hook) 양쪽에서 import
   ============================================================ */

/* ------------------------------------------------------------------
   서브탭 A — 신고가 주요거래
------------------------------------------------------------------ */
export interface NewHighTrade {
  rank: number;
  sido: string;
  sigungu: string;
  aptName: string;
  area: string;      // "48평"
  floor: string;     // "23층"
  price: string;     // "62억"
  prevHigh: string;  // "+2억"
  gapMonths: number;
  dealDate: string;  // "2026-04-01"
  danjiId: number | null;  // 부스패치 단지 ID (naver_id)
}

/* ------------------------------------------------------------------
   서브탭 B — 지역별 거래 현황
------------------------------------------------------------------ */
export interface RegionSummary {
  label: string;
  count: number;
  change: number;  // 전일 대비 %
}

export interface RegionBarItem {
  rank: number;
  sido: string;
  count: number;
  prevWeekChange: number;  // 전주 대비 %
}

export interface SurgeItem {
  sido: string;
  change: number;  // 양수 = 급등, 음수 = 급감
}

export interface TradeItem {
  region: string;
  aptName: string;
  area: string;
  price: string;
  floor: string;
  date: string;
}

/* ------------------------------------------------------------------
   서브탭 C — 반등거래 분석
------------------------------------------------------------------ */
export interface ReboundItem {
  rank: number;
  sigungu: string;
  total: number;
  rebound: number;
  rate: number;  // %
  trend: "up" | "down";
}

/** /api/rebound-details 세부 거래 1건 */
export interface ReboundDetailItem {
  emdName:      string;   // 읍면동
  aptName:      string;   // 단지명
  area:         number | null;  // 전용면적 m²
  floor:        number | null;
  price:        number;         // 거래가 (만원)
  dealDate:     string;         // "2026-04-01"
  prevMonthAvg: number;         // 전월 평균가 (만원)
  changePct:    number | null;  // 전월대비 %
}

/* ------------------------------------------------------------------
   서브탭 D — 가격대별 인기 아파트
------------------------------------------------------------------ */
export const PRICE_BUCKETS = ['1억','2억','3억','4억','5억','6억','7억','8억','9억','10억','20억','30억+'] as const;
export type PriceBucket = typeof PRICE_BUCKETS[number];

export interface PriceRangeApt {
  rank: number;
  aptName: string;
  sigungu: string;
  sido: string;
  avgArea: number;    // m²
  avgPyeong: number;  // 평
  tradeCnt: number;
  avgPrice: string;   // "2.28억"
  minPrice: string;
  maxPrice: string;
  latestDate: string; // "2026-04-11"
  latestFloor: number;
  latestPrice: string;
  danjiId: number | null;
}

/* ------------------------------------------------------------------
   API Response — GET /api/daily-trades
------------------------------------------------------------------ */
export interface DailyTradesResponse {
  /** 기준일 "2026.04.12(일)" 형식 */
  reportDate: string;
  newHighTrades: NewHighTrade[];
  regional: {
    summary: RegionSummary[];
    sidoRank: RegionBarItem[];
    surgeRegions: SurgeItem[];
    tradeList: TradeItem[];
  };
  rebound: {
    rank: ReboundItem[];
  };
  priceRange?: {
    generatedRange: string;  // "2026.03.15 ~ 2026.04.15"
    buckets: Record<PriceBucket, PriceRangeApt[]>;
  };
}

/* ------------------------------------------------------------------
   API Error Response
------------------------------------------------------------------ */
export interface ApiErrorResponse {
  error: string;
  detail?: string;
}
