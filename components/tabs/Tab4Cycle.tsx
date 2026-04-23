"use client";

import { useState } from "react";
import { MOCK_CYCLES } from "@/lib/mock/tab4";
import type { CycleData, CyclePhase } from "@/lib/types/cycle";

/* ============================================================
   유틸
   ============================================================ */
function getPhaseState(phase: CyclePhase, isCurrent: boolean): "done" | "current" | "future" {
  if (!isCurrent) return "done";
  if (phase.isCurrentPosition) return "current";
  if (phase.priceChange === "예상") return "future";
  return "done";
}

/* ============================================================
   사이클 선택 버튼
   ============================================================ */
function CycleSelector({
  cycles,
  activeId,
  onChange,
}: {
  cycles: CycleData[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
      {cycles.map((c) => {
        const isActive = c.id === activeId;
        const isCurrent = c.id === "current";
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: isActive ? "var(--bp-primary)" : "var(--bp-gray-100)",
              color: isActive ? "#fff" : "var(--bp-gray-600)",
              fontSize: "var(--font-size-sm)",
              fontWeight: isActive
                ? "var(--font-weight-semibold)"
                : "var(--font-weight-medium)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "background var(--transition-fast), color var(--transition-fast)",
            }}
          >
            {c.label}
            {isCurrent && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: isActive ? "#fff" : "var(--bp-primary)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   노드 스타일 헬퍼
   ============================================================ */
function nodeCircleStyle(state: "done" | "current" | "future"): React.CSSProperties {
  switch (state) {
    case "current":
      return { background: "var(--bp-primary)", color: "#fff", border: "none" };
    case "done":
      return { background: "#ade2d5", color: "#fff", border: "none" };
    case "future":
      return {
        background: "var(--bp-gray-100)",
        color: "var(--bp-gray-400)",
        border: "1.5px dashed var(--bp-gray-350)",
      };
  }
}

/* ============================================================
   가로 연결선 (PC)
   ============================================================ */
function HConnector({ done }: { done: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        height: 2,
        marginTop: 13, // 노드 원형 중심 맞춤
        borderTop: done ? "2px solid var(--bp-primary)" : "2px dashed var(--bp-gray-350)",
      }}
    />
  );
}

/* ============================================================
   세로 연결선 (모바일)
   ============================================================ */
function VConnector({ done }: { done: boolean }) {
  return (
    <div
      style={{
        width: 2,
        height: 28,
        marginLeft: 13, // 노드 원형 중심 맞춤
        borderLeft: done ? "2px solid var(--bp-primary)" : "2px dashed var(--bp-gray-350)",
      }}
    />
  );
}

/* ============================================================
   타임라인 노드
   ============================================================ */
function PhaseNode({
  phase,
  state,
}: {
  phase: CyclePhase;
  state: "done" | "current" | "future";
}) {
  const circleStyle = nodeCircleStyle(state);
  const isExpected = phase.priceChange === "예상";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-2)",
        minWidth: 80,
        position: "relative",
      }}
    >
      {/* "현재 여기" 레이블 */}
      {state === "current" && (
        <div
          style={{
            position: "absolute",
            top: -22,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--bp-primary)",
              whiteSpace: "nowrap",
            }}
          >
            현재 여기
          </span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
            <path d="M5 6L0 0h10L5 6z" fill="var(--bp-primary)" />
          </svg>
        </div>
      )}

      {/* 순위 원형 */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: "var(--font-weight-bold)",
          flexShrink: 0,
          ...circleStyle,
        }}
      >
        {phase.order}
      </div>

      {/* 지역명 */}
      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: "var(--font-weight-medium)",
          color: state === "future" ? "var(--bp-gray-400)" : "var(--bp-gray-900)",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {phase.region}
      </p>

      {/* 시기 */}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: "var(--bp-gray-500)",
          textAlign: "center",
        }}
      >
        {phase.period}
      </p>

      {/* 상승률 */}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: isExpected ? "#b7babe" : "var(--bp-primary)",
          fontStyle: isExpected ? "italic" : "normal",
          fontWeight: isExpected
            ? "var(--font-weight-medium)"
            : "var(--font-weight-semibold)",
          textAlign: "center",
        }}
      >
        {phase.priceChange}
      </p>
    </div>
  );
}

/* ============================================================
   가로 타임라인 (PC)
   ============================================================ */
function HorizontalTimeline({
  cycle,
  isCurrent,
}: {
  cycle: CycleData;
  isCurrent: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        padding: "var(--space-8) var(--space-4) var(--space-4)",
        overflowX: "auto",
      }}
      className="hide-scrollbar"
    >
      {cycle.phases.map((phase, idx) => {
        const state = getPhaseState(phase, isCurrent);
        const isLast = idx === cycle.phases.length - 1;
        // 연결선: 이 노드 다음 노드가 done이면 done 선
        const nextPhase = cycle.phases[idx + 1];
        const connectorDone =
          nextPhase !== undefined &&
          getPhaseState(nextPhase, isCurrent) === "done";

        return (
          <div
            key={phase.order}
            style={{
              display: "flex",
              alignItems: "flex-start",
              flex: isLast ? "0 0 auto" : "1 1 0",
            }}
          >
            <PhaseNode phase={phase} state={state} />
            {!isLast && <HConnector done={connectorDone} />}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   세로 타임라인 (모바일)
   ============================================================ */
function VerticalTimeline({
  cycle,
  isCurrent,
}: {
  cycle: CycleData;
  isCurrent: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "var(--space-4)" }}>
      {cycle.phases.map((phase, idx) => {
        const state = getPhaseState(phase, isCurrent);
        const isLast = idx === cycle.phases.length - 1;
        const nextPhase = cycle.phases[idx + 1];
        const connectorDone =
          nextPhase !== undefined &&
          getPhaseState(nextPhase, isCurrent) === "done";

        return (
          <div key={phase.order}>
            {/* 노드: 가로 배치 (원 + 텍스트) */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-4)",
                position: "relative",
              }}
            >
              {/* 왼쪽: 원 + 세로선 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {/* "현재 여기" */}
                {state === "current" && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--bp-primary)",
                      whiteSpace: "nowrap",
                      marginBottom: 2,
                    }}
                  >
                    ▼ 현재 여기
                  </span>
                )}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: "var(--font-weight-bold)",
                    flexShrink: 0,
                    ...nodeCircleStyle(state),
                  }}
                >
                  {phase.order}
                </div>
                {!isLast && <VConnector done={connectorDone} />}
              </div>

              {/* 오른쪽: 텍스트 */}
              <div
                style={{
                  paddingBottom: isLast ? 0 : "var(--space-2)",
                  paddingTop: state === "current" ? 22 : 4,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: "var(--font-weight-medium)",
                    color: state === "future" ? "var(--bp-gray-400)" : "var(--bp-gray-900)",
                  }}
                >
                  {phase.region}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--bp-gray-500)" }}>
                  {phase.period}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12,
                    color: phase.priceChange === "예상" ? "#b7babe" : "var(--bp-primary)",
                    fontStyle: phase.priceChange === "예상" ? "italic" : "normal",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  {phase.priceChange}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   현재 사이클 인사이트 카드
   ============================================================ */
function InsightCard({ cycle }: { cycle: CycleData }) {
  const currentPhase = cycle.phases.find((p) => p.isCurrentPosition);
  const nextPhase = currentPhase
    ? cycle.phases.find((p) => p.order === currentPhase.order + 1)
    : null;

  if (!currentPhase) return null;

  return (
    <div
      style={{
        background: "var(--bp-primary-100)",
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--bp-primary-500)",
        }}
      >
        현재 {currentPhase.order}순위({currentPhase.region}) 진행 중
      </p>
      {nextPhase && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--bp-primary-500)" }}>
          과거 패턴 기준 다음 예상 지역:{" "}
          <strong style={{ fontWeight: "var(--font-weight-semibold)" }}>
            {nextPhase.region}
          </strong>
        </p>
      )}
    </div>
  );
}

/* ============================================================
   Tab4Cycle — 메인 컴포넌트
   ============================================================ */
export default function Tab4Cycle() {
  const [activeId, setActiveId] = useState("current");

  const activeCycle = MOCK_CYCLES.find((c) => c.id === activeId) ?? MOCK_CYCLES[0];
  const isCurrent = activeId === "current";

  return (
    <section
      style={{
        padding: "var(--space-6) 0",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* 사이클 선택 버튼 */}
      <CycleSelector
        cycles={MOCK_CYCLES}
        activeId={activeId}
        onChange={setActiveId}
      />

      {/* 타임라인 카드 */}
      <div
        style={{
          background: "#fff",
          border: "0.5px solid var(--bp-gray-200)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* 카드 헤더 */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "0.5px solid var(--bp-gray-100)",
            background: "var(--bp-gray-50)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--bp-gray-900)",
            }}
          >
            {activeCycle.label} 상승 순서
          </span>
          {isCurrent && (
            <span
              style={{
                padding: "2px 8px",
                background: "var(--bp-primary-100)",
                color: "var(--bp-primary-500)",
                borderRadius: "var(--radius-full)",
                fontSize: 11,
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              진행 중
            </span>
          )}
        </div>

        {/* PC: 가로 타임라인 */}
        <div className="cycle-horizontal">
          <HorizontalTimeline cycle={activeCycle} isCurrent={isCurrent} />
        </div>

        {/* 모바일: 세로 타임라인 */}
        <div className="cycle-vertical">
          <VerticalTimeline cycle={activeCycle} isCurrent={isCurrent} />
        </div>
      </div>

      {/* 현재 사이클 인사이트 카드 */}
      {isCurrent && <InsightCard cycle={activeCycle} />}

      {/* BM CTA */}
      <button
        onClick={() => console.log("[Tab4 CTA] 현재 사이클 상세 리포트 받기 클릭")}
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
        현재 사이클 상세 리포트 받기
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

      {/* 반응형: PC=가로 / 모바일=세로 */}
      <style>{`
        .cycle-horizontal { display: block; }
        .cycle-vertical   { display: none; }
        @media (max-width: 768px) {
          .cycle-horizontal { display: none; }
          .cycle-vertical   { display: block; }
        }
      `}</style>
    </section>
  );
}
