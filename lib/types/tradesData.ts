/* ============================================================
   trades-silgga.json 공유 타입 정의
   ============================================================ */

export interface NewHighDetailItem {
  rank: number;
  sido: string;
  sigungu: string;
  sggCode: string;
  dong: string;
  aptName: string;
  pyeong: number;
  area: number;       // 전용면적 m²
  floor: number;
  price: number;      // 만원
  prevHigh: number;   // 이전 신고가 (만원)
  prevHighDate: string; // "2025-06-23"
  gap: number;        // price - prevHigh (만원)
  isNewHigh?: boolean; // 신고가 여부
  dealDate?: string;  // 날짜 키에서 주입: "2026-04-06"
}

export interface SidoCard {
  sido: string;
  dealCnt: number;
  newHighCnt: number;
  avg84: number | null;  // 만원
  avg59: number | null;  // 만원
}

export interface DailySummary {
  total: number;
  newHigh: number;
  sidoCards: SidoCard[];
}

export interface SigunguItem {
  sigungu: string;
  sggCode: string;
  dealCnt: number;
  newHighCnt: number;
  avg84: number | null;
  avg59: number | null;
}

export interface AvailableDateItem {
  date: string;  // "2026-04-06"
  cnt: number;
}

export interface TradesSilggaData {
  lastUpdated: string;
  sourceNote: string;
  availableDates: {
    meme: AvailableDateItem[];
    jeonse: AvailableDateItem[];
  };
  summaries: {
    meme: Record<string, DailySummary>;
    jeonse: Record<string, DailySummary>;
  };
  sigunguSummaries: {
    meme: Record<string, Record<string, SigunguItem[]>>;
    jeonse: Record<string, Record<string, SigunguItem[]>>;
  };
  newHighDetails: {
    meme: Record<string, NewHighDetailItem[]>;
    jeonse: Record<string, NewHighDetailItem[]>;
  };
  /** 주간 읍면동 집계 — emdWeekly[type][weekSunday][sggCode] */
  emdWeekly?: {
    meme:   Record<string, Record<string, EmdWeeklyItem[]>>;
    jeonse: Record<string, Record<string, EmdWeeklyItem[]>>;
  };
}

export interface EmdWeeklyItem {
  emd: string;
  dealCnt: number;
  newHighCnt: number;
  maxPrice: number | null;
}
