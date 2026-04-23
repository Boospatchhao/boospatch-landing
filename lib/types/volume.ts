/* ============================================================
   Tab8 — 지역별 거래량 타입 정의
   ============================================================ */

/** 기간 필터 옵션 */
export type VolumePeriod = "1w" | "1m" | "3m";

export const PERIOD_LABELS: Record<VolumePeriod, string> = {
  "1w": "최근 1주",
  "1m": "최근 1개월",
  "3m": "최근 3개월",
};

/* ------------------------------------------------------------------
   시도별 거래량 순위
------------------------------------------------------------------ */
export interface SidoVolumeItem {
  rank: number;
  sido: string;
  count: number;           // 거래 건수
  prevWeekChange: number;  // 전주 대비 % (양수 = 증가)
}

/* ------------------------------------------------------------------
   급등·급감 지역
------------------------------------------------------------------ */
export interface SurgeItem {
  sido: string;
  change: number;          // 양수 = 급등, 음수 = 급감
}

/* ------------------------------------------------------------------
   기간별 데이터 묶음
------------------------------------------------------------------ */
export interface VolumeDataByPeriod {
  reportDate: string;
  sidoRank: SidoVolumeItem[];
  surgeUp: SurgeItem[];    // 급등 지역
  surgeDown: SurgeItem[];  // 급감 지역
}

export type VolumeData = Record<VolumePeriod, VolumeDataByPeriod>;
