/* ============================================================
   Tab7 — 청약 분석 타입 정의
   ============================================================ */

export interface PyeongType {
  name: string;              // 타입명 e.g. "71A"
  area: number;              // ㎡
  pyeong: number;            // 평
  price: number;             // 분양가 (만원)
  pricePerPyeong: number;    // 평단가 (만원/평)
  nearbyAvgPerPyeong: number;// 인근 평균 평단가 (만원/평)
  safetyMargin: number;      // 안전마진 (만원, 음수=손실)
}

export interface NearbyComp {
  name: string;
  year: number;              // 준공연도
  units: number;             // 세대수
  pyeong: number;            // 평형
  pricePerPyeong: number;    // 평단가 (만원/평)
  distanceKm: number;        // 직선거리 (km)
}

export interface AptSchedule {
  announcement: string;      // 모집공고 (YYYY-MM-DD)
  specialSupply: string;     // 특별공급
  firstPriority: string;     // 1순위
  winner: string;            // 당첨자 발표
}

export interface AptAnalysis {
  name: string;
  address: string;
  totalUnits: number;
  pyeongTypes: PyeongType[];
  nearbyComps: NearbyComp[];
  schedule: AptSchedule;
  region: string;
}
