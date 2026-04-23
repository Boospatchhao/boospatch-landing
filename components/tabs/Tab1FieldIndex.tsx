"use client";

import { useState } from "react";
import { MOCK_SIDO, SIGUNGU_MAP } from "@/lib/mock/tab1";
import type { RegionFieldIndex } from "@/lib/types/fieldIndex";
import Tab1DrillDown, { StageBadge } from "./Tab1DrillDown";

/* ============================================================
   카드 배경색 (현장지수 구간)
   ============================================================ */
function cardBg(index: number): string {
  if (index <= 20) return "#dbeafe";
  if (index <= 40) return "#eff6ff";
  if (index <= 60) return "var(--bp-gray-50)";
  if (index <= 80) return "var(--bp-primary-100)";
  return "#d1fae5";
}

/* ============================================================
   브레드크럼 네비게이션
   ============================================================ */
function Breadcrumb({
  sido,
  sigungu,
  onClickRoot,
  onClickSido,
}: {
  sido: string | null;
  sigungu: string | null;
  onClickRoot: () => void;
  onClickSido: () => void;
}) {
  const sepStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--bp-gray-300)",
    margin: "0 4px",
  };
  const activeStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--bp-gray-900)",
    fontWeight: "var(--font-weight-medium)",
  };
  const linkStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--color-primary)",
    fontWeight: "var(--font-weight-medium)",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    textDecoration: "underline",
    textDecorationColor: "transparent",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--space-4)" }}>
      {sido ? (
        <>
          <button style={linkStyle} onClick={onClickRoot}>전국</button>
          <span style={sepStyle}>›</span>
          {sigungu ? (
            <>
              <button style={linkStyle} onClick={onClickSido}>{sido}</button>
              <span style={sepStyle}>›</span>
              <span style={activeStyle}>{sigungu}</span>
            </>
          ) : (
            <span style={activeStyle}>{sido}</span>
          )}
        </>
      ) : (
        <span style={activeStyle}>전국</span>
      )}
    </div>
  );
}

/* ============================================================
   지역 카드
   ============================================================ */
function RegionCard({
  region,
  onClick,
  drillable,
}: {
  region: RegionFieldIndex;
  onClick: () => void;
  drillable: boolean;
}) {
  const label = region.sigungu ?? region.sido;
  const bg = cardBg(region.fieldIndex);
  const hogaPos = region.hogaChg >= 0;
  const maemulNeg = region.maemulChg <= 0; // 매물 감소가 good

  return (
    <button
      onClick={onClick}
      className="field-card"
      style={{
        background: bg,
        border: "0.5px solid rgba(0,0,0,0.06)",
        borderRadius: 10,
        padding: "var(--space-4)",
        textAlign: "left",
        cursor: drillable ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        transition: "transform var(--transition-fast), box-shadow var(--transition-fast)",
        width: "100%",
      }}
    >
      {/* 지역명 + 드릴 가능 표시 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: "var(--font-weight-medium)",
            color: "var(--bp-gray-900)",
          }}
        >
          {label}
        </span>
        {drillable && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M4 2L8 6L4 10" stroke="var(--bp-gray-350)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* 현장지수 크게 */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: "var(--font-weight-bold)",
            color: "var(--bp-gray-900)",
            lineHeight: 1,
          }}
        >
          {region.fieldIndex}
        </span>
        <span style={{ fontSize: 12, color: "var(--bp-gray-500)" }}>점</span>
      </div>

      {/* 단계 뱃지 */}
      <StageBadge stage={region.fieldStage} />

      {/* 호가 / 매물 변화 */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: 2 }}>
        <span
          style={{
            fontSize: 11,
            color: hogaPos ? "var(--bp-primary)" : "var(--bp-red-500)",
          }}
        >
          호가 {region.hogaChg >= 0 ? "+" : ""}{region.hogaChg.toFixed(2)}%
        </span>
        <span
          style={{
            fontSize: 11,
            color: maemulNeg ? "var(--bp-primary)" : "var(--bp-red-500)",
          }}
        >
          매물 {region.maemulChg >= 0 ? "+" : ""}{region.maemulChg.toFixed(2)}%
        </span>
      </div>
    </button>
  );
}

/* ============================================================
   지역 그리드
   ============================================================ */
function RegionGrid({
  items,
  onSelect,
  drillable,
}: {
  items: RegionFieldIndex[];
  onSelect: (item: RegionFieldIndex) => void;
  drillable: boolean;
}) {
  return (
    <div className="field-grid">
      {items.map((item) => (
        <RegionCard
          key={item.sigungu ?? item.sido}
          region={item}
          onClick={() => onSelect(item)}
          drillable={drillable}
        />
      ))}
    </div>
  );
}

/* ============================================================
   Tab1FieldIndex — 메인 컴포넌트
   ============================================================ */
export default function Tab1FieldIndex() {
  const [selectedSido, setSelectedSido] = useState<string | null>(null);
  const [selectedSigungu, setSelectedSigungu] = useState<RegionFieldIndex | null>(null);

  const handleSidoSelect = (item: RegionFieldIndex) => {
    const hasDrill = !!SIGUNGU_MAP[item.sido];
    if (hasDrill) {
      setSelectedSido(item.sido);
      setSelectedSigungu(null);
    }
    // 데이터 없는 시도: 드릴다운 없이 패널만 표시
    else {
      setSelectedSido(item.sido);
      setSelectedSigungu(item);
    }
  };

  const handleSigunguSelect = (item: RegionFieldIndex) => {
    setSelectedSigungu(item);
  };

  const handleBackToRoot = () => {
    setSelectedSido(null);
    setSelectedSigungu(null);
  };

  const handleBackToSido = () => {
    setSelectedSigungu(null);
  };

  // 현재 표시할 데이터
  const gridItems = selectedSido && !selectedSigungu
    ? (SIGUNGU_MAP[selectedSido] ?? [])
    : MOCK_SIDO;

  const isShowingDrill = !!selectedSigungu;
  const isShowingSigunguGrid = !!selectedSido && !selectedSigungu && !!SIGUNGU_MAP[selectedSido];

  return (
    <section
      style={{
        padding: "var(--space-6) 0",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* 브레드크럼 */}
      <Breadcrumb
        sido={selectedSido}
        sigungu={selectedSigungu?.sigungu ?? null}
        onClickRoot={handleBackToRoot}
        onClickSido={handleBackToSido}
      />

      {/* 드릴다운 상세 패널 */}
      {isShowingDrill ? (
        <Tab1DrillDown
          region={selectedSigungu!}
          onBack={handleBackToSido}
        />
      ) : (
        <>
          {/* 지역 그리드 */}
          <RegionGrid
            items={gridItems}
            onSelect={isShowingSigunguGrid ? handleSigunguSelect : handleSidoSelect}
            drillable={!isShowingSigunguGrid}
          />

          {/* 안내 문구 */}
          <p style={{ margin: 0, fontSize: 11, color: "var(--bp-gray-350)", padding: "0 var(--space-1)" }}>
            {isShowingSigunguGrid
              ? "구 카드를 클릭하면 세부 지표를 확인할 수 있습니다."
              : "시도 카드를 클릭하면 시군구별 현황을 확인할 수 있습니다. (서울 드릴다운 지원)"}
          </p>
        </>
      )}

      {/* BM CTA (드릴다운 패널이 없을 때) */}
      {!isShowingDrill && (
        <button
          onClick={() => console.log("[Tab1 CTA] 현장지수 상세 리포트 받기 클릭")}
          style={{
            width: "100%",
            padding: "10px",
            background: "var(--bp-primary-100)",
            color: "var(--bp-primary-500)",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: "var(--font-weight-medium)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            transition: "background var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bp-green-100)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bp-primary-100)";
          }}
        >
          현장지수 상세 리포트 받기
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M2 12L12 2M12 2H6M12 2V8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* 그리드 + 카드 반응형 */}
      <style>{`
        .field-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
        }
        .field-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        @media (max-width: 768px) {
          .field-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </section>
  );
}
