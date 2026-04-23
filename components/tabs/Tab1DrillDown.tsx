"use client";

import type { RegionFieldIndex } from "@/lib/types/fieldIndex";

/* ============================================================
   유틸
   ============================================================ */
const fmtChg = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

/* ============================================================
   구성요소 막대 행
   ============================================================ */
function MetricBar({
  label,
  value,
  isGoodWhenNeg = false,
  maxAbs = 2,
}: {
  label: string;
  value: number;         // %
  isGoodWhenNeg?: boolean; // 매물증감: 음수가 좋음
  maxAbs?: number;
}) {
  // isGoodWhenNeg=true이면 음수일 때 green
  const isPositive = value >= 0;
  const isGood = isGoodWhenNeg ? !isPositive : isPositive;

  const bgColor = isGood ? "var(--bp-primary-100)" : "var(--bp-red-50)";
  const barColor = isGood ? "var(--bp-primary)" : "var(--bp-red-500)";
  const barWidth = Math.min((Math.abs(value) / maxAbs) * 100, 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--bp-gray-500)" }}>{label}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: "var(--font-weight-semibold)",
            color: isGood ? "var(--bp-primary)" : "var(--bp-red-500)",
          }}
        >
          {fmtChg(value)}
        </span>
      </div>
      <div
        style={{
          background: bgColor,
          borderRadius: "var(--radius-full)",
          height: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            background: barColor,
            borderRadius: "var(--radius-full)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   급매율 막대
   ============================================================ */
function QuickSaleBar({ value }: { value: number }) {
  // 급매율: 낮을수록 good
  const isGood = value <= 1.5;
  const bgColor = isGood ? "var(--bp-primary-100)" : "var(--bp-red-50)";
  const barColor = isGood ? "var(--bp-primary)" : "var(--bp-red-500)";
  const barWidth = Math.min((value / 5) * 100, 100); // 5% 기준 최대

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--bp-gray-500)" }}>급매율</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: "var(--font-weight-semibold)",
            color: isGood ? "var(--bp-primary)" : "var(--bp-red-500)",
          }}
        >
          {value.toFixed(1)}%
        </span>
      </div>
      <div
        style={{
          background: bgColor,
          borderRadius: "var(--radius-full)",
          height: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            background: barColor,
            borderRadius: "var(--radius-full)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   4주 추이 SVG 미니차트
   ============================================================ */
function TrendChart({ data }: { data: number[] }) {
  const W = 160;
  const H = 40;
  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 8) - 4,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--bp-gray-500)" }}>4주 추이</p>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-label="4주 현장지수 추이"
        style={{ overflow: "visible" }}
      >
        <path
          d={pathD}
          fill="none"
          stroke="var(--bp-primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 마지막 주 점 */}
        <circle cx={last.x} cy={last.y} r={4} fill="var(--bp-primary)" />
        {/* 마지막 값 레이블 */}
        <text
          x={last.x + 7}
          y={last.y + 4}
          fontSize={10}
          fill="var(--bp-primary)"
          fontWeight="600"
        >
          {data[data.length - 1]}
        </text>
      </svg>
    </div>
  );
}

/* ============================================================
   Tab1DrillDown — 시군구 상세 패널
   ============================================================ */
export default function Tab1DrillDown({
  region,
  onBack,
}: {
  region: RegionFieldIndex;
  onBack: () => void;
}) {
  const label = region.sigungu ?? region.sido;

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid var(--bp-gray-200)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: "var(--space-4)",
          borderBottom: "0.5px solid var(--bp-gray-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button
            onClick={onBack}
            aria-label="목록으로 돌아가기"
            style={{
              background: "var(--bp-gray-100)",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              color: "var(--bp-gray-600)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            목록
          </button>
          <div>
            <span style={{ fontSize: 16, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-900)" }}>
              {label}
            </span>
            <span
              style={{
                marginLeft: 8,
                fontSize: 22,
                fontWeight: "var(--font-weight-bold)",
                color: "var(--bp-gray-900)",
              }}
            >
              {region.fieldIndex}
            </span>
            <span style={{ marginLeft: 4, fontSize: 13, color: "var(--bp-gray-500)" }}>점</span>
          </div>
        </div>
        <StageBadge stage={region.fieldStage} />
      </div>

      {/* 지표 분해 + 추이 차트 */}
      <div
        style={{
          padding: "var(--space-4)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "var(--space-6)",
          alignItems: "start",
        }}
        className="drilldown-grid"
      >
        {/* 막대 지표 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <MetricBar label="호가증감률" value={region.hogaChg} isGoodWhenNeg={false} />
          <MetricBar label="매물증감률" value={region.maemulChg} isGoodWhenNeg={true} />
          <QuickSaleBar value={region.quickSaleRate} />
        </div>

        {/* 추이 차트 */}
        <TrendChart data={region.weeklyTrend} />
      </div>

      {/* BM CTA */}
      <div style={{ padding: "0 var(--space-4) var(--space-4)" }}>
        <button
          onClick={() => console.log(`[Tab1 CTA] ${label} 상세 컨설팅 받기 클릭`)}
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
          이 지역 상세 컨설팅 받기
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
      </div>

      {/* 모바일: 차트 아래로 */}
      <style>{`
        @media (max-width: 768px) {
          .drilldown-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   단계 뱃지 (공용)
   ============================================================ */
export function StageBadge({ stage }: { stage: RegionFieldIndex["fieldStage"] }) {
  const map: Record<string, { bg: string; color: string }> = {
    강세:   { bg: "var(--bp-green-100)", color: "var(--bp-green-800)" },
    강보합: { bg: "var(--bp-primary-100)", color: "var(--bp-primary-500)" },
    보합:   { bg: "var(--bp-gray-100)", color: "var(--bp-gray-600)" },
    약보합: { bg: "#fff",    color: "var(--bp-gray-400)" },
    약세:   { bg: "var(--bp-red-50)", color: "var(--bp-red-500)" },
  };
  const s = map[stage] ?? map["보합"];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: stage === "약보합" ? "0.5px solid var(--bp-gray-200)" : "none",
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: 12,
        fontWeight: "var(--font-weight-semibold)",
        whiteSpace: "nowrap",
      }}
    >
      {stage}
    </span>
  );
}
