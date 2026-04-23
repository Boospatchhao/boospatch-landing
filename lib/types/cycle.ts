/* ============================================================
   Tab4 — 상승순서 사이클 타입 정의
   ============================================================ */

export interface CyclePhase {
  order: number;
  region: string;
  period: string;           // "2006.Q1" | "미정"
  priceChange: string;      // "+42%" | "예상"
  isCurrentPosition?: boolean;
}

export interface CycleData {
  id: string;
  label: string;            // "2006~2008"
  phases: CyclePhase[];
}
