"use client";

import { useState, useMemo } from "react";
import { useLeadingDanji, useSigunguList } from "@/lib/api/leadingDanji";
import {
  formatPpp, formatMktcap,
  formatHoga, formatMaemul, scoreToStage,
} from "@/lib/types/leading";
import type { LeadingDanji, DanjiTier } from "@/lib/types/leading";

/* ============================================================
   상수
   ============================================================ */
const SIDO_LIST = ["전체", "서울", "경기", "인천"] as const;
type SidoFilter = (typeof SIDO_LIST)[number];

type TierFilter = "all" | "leading" | "local_rep";

const DANJI_BASE_URL = "https://www.boospatch.com/danji";

// # | 시군구 | 읍면동 | 단지명+대표평형 | 시세 | 평단가 | 구평단가 | 시총 | 환금성 | 리딩점수 | 상승전환월 | 호가 | 매물 | 입지레포트
const GRID = "80px 72px 64px minmax(140px,200px) 66px 72px 72px 72px 56px 70px 68px 66px 60px 60px";

const COL_HEADERS: { label: string; cls: string; right: boolean; tooltip?: boolean }[] = [
  { label: "구분",      cls: "",       right: false },
  { label: "시군구",   cls: "col-md", right: false },
  { label: "읍면동",   cls: "col-lg", right: false },
  { label: "단지명",   cls: "",       right: false },
  { label: "시세",     cls: "col-lg", right: true  },
  { label: "평단가",   cls: "col-lg", right: true  },
  { label: "구평단가", cls: "col-xl", right: true  },
  { label: "시총",     cls: "col-lg", right: true  },
  { label: "환금성",   cls: "col-lg", right: true  },
  { label: "리딩점수", cls: "",       right: true,  tooltip: true },
  { label: "상승전환월", cls: "col-lg", right: false },
  { label: "호가증감\n(전월대비)",   cls: "col-xl", right: true  },
  { label: "매물수증감\n(전월대비)", cls: "col-xl", right: true  },
  { label: "입지\n레포트", cls: "",     right: false },
];

/* ============================================================
   tier 스타일 정의
   ============================================================ */
const TIER_CONFIG: Record<DanjiTier, {
  label: string;
  pillBg: string;
  pillColor: string;
  pillBorder?: string;
  rowBorderColor: string;
  rowBg: string;
}> = {
  leading: {
    label: "★ 리딩",
    pillBg: "var(--bp-primary)",
    pillColor: "#fff",
    rowBorderColor: "var(--bp-primary)",
    rowBg: "rgba(6,178,129,0.03)",
  },
  local_rep: {
    label: "지역대표",
    pillBg: "var(--bp-green-50)",
    pillColor: "var(--bp-primary-500)",
    pillBorder: "1px solid var(--bp-green-200)",
    rowBorderColor: "var(--bp-green-200)",
    rowBg: "transparent",
  },
  local_top: {
    label: "지역",
    pillBg: "var(--bp-gray-100)",
    pillColor: "var(--bp-gray-400)",
    rowBorderColor: "var(--bp-gray-200)",
    rowBg: "transparent",
  },
};

/* ============================================================
   Tier 배지 (pill)
   ============================================================ */
function TierBadge({ tier, size = "sm" }: { tier: DanjiTier; size?: "sm" | "md" }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: size === "md" ? "3px 10px" : "2px 7px",
      borderRadius: 12,
      background: cfg.pillBg,
      color: cfg.pillColor,
      border: cfg.pillBorder ?? "none",
      fontSize: size === "md" ? 11 : 10,
      fontWeight: 700,
      whiteSpace: "nowrap",
      lineHeight: 1.4,
      letterSpacing: "0.01em",
    }}>
      {cfg.label}
    </span>
  );
}

/* ============================================================
   리딩점수 헤더 툴팁
   ============================================================ */
function ScoreTooltipHeader() {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }} className="score-tooltip-wrap">
      <span style={{ fontSize: 12, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-400)" }}>리딩점수</span>
      <span className="score-tooltip-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "var(--bp-gray-200)", color: "var(--bp-gray-500)", fontSize: 9, fontWeight: "var(--font-weight-bold)", cursor: "default", flexShrink: 0 }}>?</span>
      <div className="score-tooltip-popup" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50, width: 220, background: "var(--bp-gray-900)", borderRadius: 10, padding: "12px 14px", boxShadow: "0 8px 24px rgba(26,30,35,0.22)", display: "none", flexDirection: "column", gap: 8 }}>
        <span style={{ position: "absolute", top: -5, right: 10, width: 10, height: 10, background: "var(--bp-gray-900)", transform: "rotate(45deg)", borderRadius: 2 }} />
        <p style={{ margin: 0, fontSize: 12, fontWeight: "var(--font-weight-semibold)", color: "#fff" }}>리딩점수 산정 기준</p>
        {[
          { label: "시가총액 점수", desc: "전국 시총 상위 백분위 · 40%" },
          { label: "평단가 점수",   desc: "전국 평단가 상위 백분위 · 35%" },
          { label: "환금성 점수",   desc: "월평균 거래량 상위 백분위 · 25%" },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: "var(--font-weight-medium)", color: "rgba(255,255,255,0.85)" }}>{r.label}</p>
              <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{r.desc}</p>
            </div>
          </div>
        ))}
        <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.12)", paddingTop: 8 }}>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>세 점수 가중 평균 = 리딩점수 (0~100점)</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   단지별 리딩점수 셀 + 툴팁
   ============================================================ */
function ScoreCell({ item }: { item: LeadingDanji }) {
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "flex-end" }} className="score-tooltip-wrap">
      <span style={{ fontSize: 14, fontWeight: "var(--font-weight-bold)", color: "var(--bp-gray-900)", cursor: "default" }}>
        {item.leading_score.toFixed(0)}
      </span>
      <div className="score-tooltip-popup" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, width: 190, background: "var(--bp-gray-900)", borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 24px rgba(26,30,35,0.22)", display: "none", flexDirection: "column", gap: 6 }}>
        <span style={{ position: "absolute", top: -5, right: 8, width: 10, height: 10, background: "var(--bp-gray-900)", transform: "rotate(45deg)", borderRadius: 2 }} />
        {[
          { label: "시총 점수",   val: item.mktcap_pct },
          { label: "평단가 점수", val: item.ppp_pct },
          { label: "환금성 점수", val: item.liq_pct },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{r.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 48, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(r.val, 100)}%`, height: "100%", background: "var(--bp-primary)", borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: "#fff", fontWeight: "var(--font-weight-semibold)", width: 28, textAlign: "right" }}>{r.val.toFixed(0)}</span>
            </div>
          </div>
        ))}
        <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.12)", paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>리딩점수</span>
          <span style={{ fontSize: 12, fontWeight: "var(--font-weight-bold)", color: "var(--bp-green-200)" }}>{item.leading_score.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   필터 칩
   ============================================================ */
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px", borderRadius: 6,
        border: active ? "none" : "1px solid var(--bp-gray-200)",
        background: active ? "var(--bp-primary)" : "#fff",
        color: active ? "#fff" : "var(--bp-gray-600)",
        fontSize: 13, fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
        cursor: "pointer", whiteSpace: "nowrap",
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      {label}
    </button>
  );
}

/* ============================================================
   리포트 링크
   ============================================================ */
function ReportLink({ item }: { item: LeadingDanji }) {
  return (
    <a
      href={`${DANJI_BASE_URL}/${item.naver_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="danji-link"
      aria-label={`${item.name} 입지레포트`}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "var(--bp-gray-100)", color: "var(--bp-gray-500)", flexShrink: 0, textDecoration: "none", transition: "background var(--transition-fast), color var(--transition-fast)" }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M2 12L12 2M12 2H6M12 2V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

/* ============================================================
   리딩단지 행
   ============================================================ */
function DanjiRow({ item }: { item: LeadingDanji }) {
  const hoga   = formatHoga(item.hoga_chg_pct);
  const maemul = formatMaemul(item.maemul_chg_pct);
  const tier   = item.danji_tier ?? "local_top";
  const tierCfg = TIER_CONFIG[tier];

  return (
    <>
      {/* ── 데스크탑 테이블 행 ── */}
      <div
        className="leading-row leading-desktop"
        style={{
          display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: "12px",
          padding: "11px 16px", borderBottom: "0.5px solid var(--bp-gray-100)",
          background: tierCfg.rowBg,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <TierBadge tier={tier} />
        </div>
        <span className="col-md" style={{ fontSize: 13, color: "var(--bp-gray-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sigungu}</span>
        <span className="col-lg" style={{ fontSize: 13, color: "var(--bp-gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.emd_name}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--bp-gray-400)" }}>
            {item.units.toLocaleString()}세대
            {item.rep_pyeong != null && <span style={{ marginLeft: 6, color: "var(--bp-gray-350)" }}>{item.rep_pyeong}평</span>}
          </p>
        </div>
        <span className="col-lg" style={{ fontSize: 13, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-900)", textAlign: "right", whiteSpace: "nowrap" }}>
          {item.rep_hoga_eok != null ? `${item.rep_hoga_eok.toFixed(1)}억` : "-"}
        </span>
        <span className="col-lg" style={{ fontSize: 13, color: "var(--bp-gray-700)", textAlign: "right", whiteSpace: "nowrap" }}>{formatPpp(item.ppp)}</span>
        <span className="col-xl" style={{ fontSize: 12, color: "var(--bp-gray-400)", textAlign: "right", whiteSpace: "nowrap" }}>{formatPpp(item.sgg_avg_price)}</span>
        <span className="col-lg" style={{ fontSize: 13, color: "var(--bp-gray-600)", textAlign: "right", whiteSpace: "nowrap" }}>{formatMktcap(item.mktcap_eok)}</span>
        <span className="col-lg" style={{ fontSize: 13, fontWeight: "var(--font-weight-medium)", color: item.liq_monthly >= 5 ? "var(--bp-primary)" : item.liq_monthly >= 2 ? "var(--bp-gray-700)" : "var(--bp-gray-400)", textAlign: "right", whiteSpace: "nowrap" }}>
          {item.liq_monthly > 0 ? item.liq_monthly.toFixed(2) : "-"}
        </span>
        <ScoreCell item={item} />
        <span className="col-lg" style={{ fontSize: 12, color: item.first_turn_ym ? "var(--bp-primary-500)" : "var(--bp-gray-300)", textAlign: "center", whiteSpace: "nowrap" }}>
          {item.first_turn_ym || "-"}
        </span>
        <span className="col-xl" style={{ fontSize: 12, fontWeight: "var(--font-weight-semibold)", color: hoga.color, textAlign: "right", whiteSpace: "nowrap" }}>{hoga.text}</span>
        <span className="col-xl" style={{ fontSize: 12, fontWeight: "var(--font-weight-semibold)", color: maemul.color, textAlign: "right", whiteSpace: "nowrap" }}>{maemul.text}</span>
        <ReportLink item={item} />
      </div>

      {/* ── 모바일 카드 ── */}
      <div
        className="leading-card"
        style={{
          padding: "12px 14px", borderBottom: "0.5px solid var(--bp-gray-100)",
          borderLeft: `3px solid ${tierCfg.rowBorderColor}`,
          background: tierCfg.rowBg,
        }}
      >
        {/* 카드 헤더: 배지 + 단지명 + 지역 + 레포트 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <TierBadge tier={tier} size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--bp-gray-400)" }}>
              {item.sigungu} {item.emd_name}
              {item.rep_pyeong != null && <span style={{ marginLeft: 6 }}>{item.rep_pyeong}평</span>}
              <span style={{ marginLeft: 4 }}>· {item.units.toLocaleString()}세대</span>
            </p>
          </div>
          <ReportLink item={item} />
        </div>

        {/* 카드 바디: 핵심 지표 4개 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, marginTop: 10 }}>
          <div style={{ background: "var(--bp-gray-50)", borderRadius: 6, padding: "6px 8px" }}>
            <p style={{ margin: 0, fontSize: 10, color: "var(--bp-gray-400)" }}>시세</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-900)" }}>
              {item.rep_hoga_eok != null ? `${item.rep_hoga_eok.toFixed(1)}억` : "-"}
            </p>
          </div>
          <div style={{ background: "var(--bp-gray-50)", borderRadius: 6, padding: "6px 8px" }}>
            <p style={{ margin: 0, fontSize: 10, color: "var(--bp-gray-400)" }}>리딩점수</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: "var(--font-weight-bold)", color: "var(--bp-gray-900)" }}>
              {item.leading_score.toFixed(0)}
            </p>
          </div>
          <div style={{ background: "var(--bp-gray-50)", borderRadius: 6, padding: "6px 8px" }}>
            <p style={{ margin: 0, fontSize: 10, color: "var(--bp-gray-400)" }}>호가증감</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: "var(--font-weight-semibold)", color: hoga.color }}>
              {hoga.text}
            </p>
          </div>
          <div style={{ background: "var(--bp-gray-50)", borderRadius: 6, padding: "6px 8px" }}>
            <p style={{ margin: 0, fontSize: 10, color: "var(--bp-gray-400)" }}>매물증감</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: "var(--font-weight-semibold)", color: maemul.color }}>
              {maemul.text}
            </p>
          </div>
        </div>

        {/* 보조 지표 */}
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--bp-gray-400)" }}>평단가 <b style={{ color: "var(--bp-gray-600)" }}>{formatPpp(item.ppp)}</b></span>
          <span style={{ fontSize: 11, color: "var(--bp-gray-400)" }}>시총 <b style={{ color: "var(--bp-gray-600)" }}>{formatMktcap(item.mktcap_eok)}</b></span>
          {item.first_turn_ym && (
            <span style={{ fontSize: 11, color: "var(--bp-gray-400)" }}>전환 <b style={{ color: "var(--bp-primary-500)" }}>{item.first_turn_ym}</b></span>
          )}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   스켈레톤
   ============================================================ */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: GRID, gap: "12px", padding: "11px 16px", borderBottom: "0.5px solid var(--bp-gray-100)", alignItems: "center" }}>
          {Array.from({ length: 14 }).map((_, j) => (
            <div key={j} style={{ height: 13, background: "var(--bp-gray-100)", borderRadius: 4 }} />
          ))}
        </div>
      ))}
    </>
  );
}

/* ============================================================
   Tab3Leading — 메인 컴포넌트
   ============================================================ */
export default function Tab3Leading() {
  const [activeSido, setActiveSido]       = useState<SidoFilter>("전체");
  const [activeSigungu, setActiveSigungu] = useState<string>("전체");
  const [tierFilter, setTierFilter]       = useState<TierFilter>("all");

  const apiFilter = tierFilter === "all" ? "all" : tierFilter;
  const state        = useLeadingDanji(activeSido, apiFilter, 300);
  const sigunguState = useSigunguList(activeSido);

  const sigunguList = useMemo(() => {
    if (sigunguState.status !== "success") return [];
    return ["전체", ...sigunguState.list];
  }, [sigunguState]);

  const displayItems = useMemo(() => {
    if (state.status !== "success") return [];
    if (activeSigungu === "전체") return state.data.items;
    return state.data.items.filter((d) => d.sigungu === activeSigungu);
  }, [state, activeSigungu]);

  function handleSidoChange(sido: SidoFilter) {
    setActiveSido(sido);
    setActiveSigungu("전체");
  }

  const baseWeek = state.status === "success" ? state.data.baseWeek : null;

  /* 단지 tier별 카운트 */
  const tierCounts = useMemo(() => {
    if (state.status !== "success") return { leading: 0, local_rep: 0, local_top: 0 };
    const items = state.data.items;
    return {
      leading:   items.filter((d) => d.danji_tier === "leading").length,
      local_rep: items.filter((d) => d.danji_tier === "local_rep").length,
      local_top: items.filter((d) => d.danji_tier === "local_top").length,
    };
  }, [state]);

  return (
    <section style={{ padding: "var(--space-6) 0", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* ── 시도 필터 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {SIDO_LIST.map((s) => (
          <FilterChip key={s} label={s} active={activeSido === s} onClick={() => handleSidoChange(s)} />
        ))}
      </div>

      {/* ── 시군구 필터 ── */}
      {sigunguList.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", padding: "10px 14px", background: "var(--bp-gray-50)", borderRadius: 8 }}>
          {sigunguList.map((sg) => (
            <button
              key={sg}
              onClick={() => setActiveSigungu(sg)}
              style={{ padding: "4px 12px", borderRadius: 20, border: "none", background: activeSigungu === sg ? "var(--bp-primary)" : "var(--bp-gray-200)", color: activeSigungu === sg ? "#fff" : "var(--bp-gray-600)", fontSize: 13, fontWeight: activeSigungu === sg ? "var(--font-weight-semibold)" : "var(--font-weight-regular)", cursor: "pointer", transition: "background var(--transition-fast), color var(--transition-fast)" }}
            >
              {sg}
            </button>
          ))}
        </div>
      )}

      {/* ── tier 필터 + 범례 ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>

        {/* tier 필터 버튼 그룹 */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {(["all", "leading", "local_rep"] as TierFilter[]).map((t) => {
            const labels: Record<TierFilter, string> = {
              all: "전체",
              leading: "★ 리딩단지만",
              local_rep: "리딩 + 지역대표",
            };
            const active = tierFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  padding: "4px 12px", borderRadius: 6,
                  border: active ? "none" : "1px solid var(--bp-gray-200)",
                  background: active
                    ? (t === "leading" ? "var(--bp-primary)" : t === "local_rep" ? "var(--bp-green-50)" : "var(--bp-gray-800)")
                    : "#fff",
                  color: active
                    ? (t === "leading" ? "#fff" : t === "local_rep" ? "var(--bp-primary-500)" : "#fff")
                    : "var(--bp-gray-600)",
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "background var(--transition-fast)",
                }}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {(["leading", "local_rep", "local_top"] as DanjiTier[]).map((tier) => {
            const descs: Record<DanjiTier, string> = {
              leading: "리딩단지 (80점↑)",
              local_rep: "지역대표단지 (60~79점)",
              local_top: "지역 (60점↓)",
            };
            return (
              <span key={tier} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--bp-gray-500)" }}>
                <TierBadge tier={tier} />
                <span>{descs[tier]}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── 통계 ── */}
      {state.status === "success" && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--bp-gray-400)", padding: "0 2px" }}>
          기준일: {baseWeek ?? state.data.updatedAt.slice(0, 10)} · {displayItems.length.toLocaleString()}개 단지
          {activeSigungu !== "전체" && ` · ${activeSigungu}`}
          {tierFilter === "all" && state.status === "success" && (
            <span style={{ marginLeft: 8 }}>
              (리딩 {tierCounts.leading} · 지역대표 {tierCounts.local_rep} · 지역 {tierCounts.local_top})
            </span>
          )}
        </p>
      )}

      {/* ── 테이블 ── */}
      <div style={{ background: "#fff", border: "0.5px solid var(--bp-gray-200)", borderRadius: 10, overflowX: "auto" }}>
        {/* 헤더 */}
        <div className="leading-thead" style={{ display: "grid", gridTemplateColumns: GRID, gap: "12px", padding: "9px 16px", borderBottom: "1.5px solid var(--color-border)", background: "var(--bp-gray-50)", minWidth: 900, alignItems: "start" }}>
          {COL_HEADERS.map((h, i) =>
            h.tooltip ? (
              <div key={i} className={h.cls} style={{ display: "flex", justifyContent: "flex-end" }}>
                <ScoreTooltipHeader />
              </div>
            ) : (
              <span key={i} className={h.cls} style={{ fontSize: 12, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-400)", whiteSpace: "pre-line", textAlign: h.right ? "right" : "left", lineHeight: 1.3 }}>
                {h.label}
              </span>
            )
          )}
        </div>

        <div>
          {state.status === "loading" && <SkeletonRows />}
          {state.status === "error" && (
            <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 14, color: "var(--bp-red-500)" }}>{state.message}</div>
          )}
          {state.status === "success" && displayItems.length === 0 && (
            <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 14, color: "var(--bp-gray-350)" }}>해당 지역 데이터가 없습니다.</div>
          )}
          {state.status === "success" &&
            displayItems.map((item, idx) => <DanjiRow key={`${item.naver_id}-${idx}`} item={item} />)}
        </div>
      </div>

      {/* 하단 코멘트 */}
      <p style={{ margin: 0, fontSize: 11, color: "var(--bp-gray-350)", padding: "0 2px" }}>
        리딩단지: 시군구 내 리딩점수 80점↑ · 지역대표단지: 시군구 최고점 60~79점 구간 상위 5개 · 환금성(건/월): 최근 3년 월평균 거래량 · 호가/매물: 전월대비
      </p>

      {/* BM CTA */}
      <button
        onClick={() => console.log("[Tab3 CTA] 내가 보는 단지 AI로 분석하기 클릭")}
        style={{ width: "100%", padding: "10px", background: "var(--bp-primary-100)", color: "var(--bp-primary-500)", border: "none", borderRadius: 6, fontSize: 12, fontWeight: "var(--font-weight-medium)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", transition: "background var(--transition-fast)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bp-green-100)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bp-primary-100)"; }}
      >
        내가 보는 단지 AI로 분석하기
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M2 12L12 2M12 2H6M12 2V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <style>{`
        .leading-row:hover { background: #f8f9fc !important; }
        .danji-link:hover  { background: var(--bp-primary-100) !important; color: var(--bp-primary) !important; }
        .score-tooltip-wrap:hover .score-tooltip-popup { display: flex !important; }
        .score-tooltip-icon { user-select: none; }
        @media (max-width: 1024px) { .col-xl { display: none !important; } }
        .leading-card    { display: none; }
        .leading-desktop { display: grid !important; }
        .leading-thead   { display: grid !important; }
        @media (max-width: 768px) {
          .leading-card    { display: block !important; }
          .leading-desktop { display: none !important; }
          .leading-thead   { display: none !important; }
        }
      `}</style>
    </section>
  );
}
