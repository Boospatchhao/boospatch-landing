/* ============================================================
   Tab6 — 평형갭 타입 정의
   ============================================================ */

export interface GapDanji {
  name: string;
  sigungu: string;
  region: string;          // 시도 (예: "서울")
  smallArea: string;       // "59㎡"
  smallPrice: number;      // 만원
  largeArea: string;       // "84㎡"
  largePrice: number;      // 만원
  gap: number;             // largePrice - smallPrice (만원)
  gapTrend: "narrowing" | "stable" | "widening";
  gapChangeWeeks: number;  // 몇 주째 변화 중 (0 = stable)
  weeklyGap: number[];     // 최근 8주 갭 추이 (만원)
}
