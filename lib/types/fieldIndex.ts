/* ============================================================
   Tab1 — 현장지수 타입 정의
   ============================================================ */

export type FieldStage = "약세" | "약보합" | "보합" | "강보합" | "강세";

export interface RegionFieldIndex {
  sido: string;
  sigungu?: string;
  eupmyeondong?: string;
  fieldIndex: number;
  fieldStage: FieldStage;
  hogaChg: number;       // 호가증감률 %
  maemulChg: number;     // 매물증감률 %
  quickSaleRate: number; // 급매율 %
  weeklyTrend: number[]; // 최근 4주 지수
}
