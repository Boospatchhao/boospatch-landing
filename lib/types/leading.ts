/* ============================================================
   Tab3 — 리딩단지 타입 정의 (leading_danji_master + fi_hoga_maemul_weekly)
   ============================================================ */

export type TurnStatus = "전환" | "미전환";
export type FieldStage = "약세" | "약보합" | "보합" | "강보합" | "강세";
export type DanjiTier = "leading" | "local_rep" | "local_top";

export interface LeadingDanji {
  // 식별
  sido: string;
  sigungu: string;
  emd_name: string;
  dong_turn_ym: string;       // 읍면동 확정전환 시점 (null이면 "")
  is_leading: boolean;
  emd_rank: number;
  danji_tier: DanjiTier;      // "leading" | "local_rep" | "local_top"
  name: string;               // 단지명
  naver_id: number;
  units: number;              // 세대수 (hh)

  // 대표평형 + 시세 (fi_hoga_maemul_weekly)
  rep_pyeong: number | null;  // 대표평형 (평)
  rep_hoga_eok: number | null; // 대표평형 현재 평균호가 (억)

  // 가격 지표
  ppp: number;                // 평단가 만원/평 (max_ppp)
  sgg_avg_price: number;      // 구평단가 만원/평
  mktcap_eok: number;         // 시총 (억원)
  liq_monthly: number;        // 환금성: 월평균 거래건수

  // 리딩점수 세부
  leading_score: number;      // 0~100점
  mktcap_pct: number;         // 시총 점수
  ppp_pct: number;            // 평단가 점수
  liq_pct: number;            // 환금성 점수

  // 시장 분위기 (매주 업데이트)
  hoga_chg_pct: number | null;    // 호가 전월대비 증감률 (%)
  maemul_chg_pct: number | null;  // 매물 전월대비 증감률 (%)
  hoga_score: number | null;      // 호가 점수 1~10
  maemul_score: number | null;    // 매물 점수 1~10

  // 전환 이력
  turn_status: TurnStatus;
  first_turn_ym: string;      // 상승전환월 YYYY-MM
  max_rise_pct: number;       // 최대 상승률 (%)
  cohort: string;
  wave_group: number;

  // UI 파생
  fieldStage: FieldStage;
}

export interface LeadingDanjiResponse {
  ok: boolean;
  updatedAt: string;
  baseWeek: string;
  total: number;
  items: LeadingDanji[];
}

/* 리딩점수 → 현장 강도 */
export function scoreToStage(score: number, turnStatus: string): FieldStage {
  if (turnStatus === "전환") {
    if (score >= 90) return "강세";
    if (score >= 75) return "강보합";
    return "보합";
  }
  if (score >= 60) return "약보합";
  return "약세";
}

/* 만원/평 → "X,XXX만" / "X.X억" */
export function formatPpp(v: number): string {
  if (!v) return "-";
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

/* 억원 → "X,XXX억" / "X.X조" */
export function formatMktcap(eok: number): string {
  if (!eok) return "-";
  if (eok >= 10000) return `${(eok / 10000).toFixed(1)}조`;
  return `${eok.toLocaleString()}억`;
}

/* % → "+X.X%" */
export function formatPct(v: number): string {
  if (!v) return "-";
  return v > 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;
}

/* 호가 변화 포맷: 오름=빨강▲, 내림=파랑▼ */
export function formatHoga(v: number | null): { text: string; color: string } {
  if (v == null) return { text: "-", color: "var(--bp-gray-350)" };
  if (v > 0) return { text: `▲+${v.toFixed(2)}%`, color: "var(--bp-red-500)" };
  if (v < 0) return { text: `▼${v.toFixed(2)}%`, color: "#3b82f6" };
  return { text: "0%", color: "var(--bp-gray-400)" };
}

/* 매물 변화 포맷: 감소=빨강▼(긍정), 증가=파랑▲(부정) */
export function formatMaemul(v: number | null): { text: string; color: string } {
  if (v == null) return { text: "-", color: "var(--bp-gray-350)" };
  if (v < 0) return { text: `▼${v.toFixed(1)}%`, color: "var(--bp-red-500)" };
  if (v > 0) return { text: `▲+${v.toFixed(1)}%`, color: "#3b82f6" };
  return { text: "0%", color: "var(--bp-gray-400)" };
}
