"use client";

import { useState } from "react";
import { MOCK_VOLUME_DATA } from "@/lib/mock/tab8";
import type {
  VolumePeriod,
  SidoVolumeItem,
  SurgeItem,
  VolumeDataByPeriod,
} from "@/lib/types/volume";
import { PERIOD_LABELS } from "@/lib/types/volume";

/* ============================================================
   카드 스타일 — 기획서 디자인 규칙
   ============================================================ */
const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid var(--bp-gray-200)",
  borderRadius: 10,
  padding: 20,
};

/* ============================================================
   기간 필터 탭
   ============================================================ */
function PeriodFilter({
  active,
  onChange,
}: {
  active: VolumePeriod;
  onChange: (p: VolumePeriod) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "var(--space-2)" }}>
      {(Object.keys(PERIOD_LABELS) as VolumePeriod[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            padding: "var(--space-1) var(--space-4)",
            border: "1px solid",
            borderColor: active === p ? "var(--color-primary)" : "var(--color-border)",
            borderRadius: "var(--radius-full)",
            background: active === p ? "var(--color-primary)" : "transparent",
            color: active === p ? "#fff" : "var(--color-text-muted)",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            whiteSpace: "nowrap",
          }}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   시도별 거래량 TOP 10 (왼쪽 카드)
   ============================================================ */
function SidoRankCard({ items }: { items: SidoVolumeItem[] }) {
  const maxCount = items[0]?.count ?? 1;

  return (
    <div style={cardStyle}>
      <h3
        style={{
          margin: "0 0 var(--space-5)",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-text)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--color-primary)",
            color: "#fff",
            fontSize: 10,
            fontWeight: "var(--font-weight-bold)",
          }}
        >
          10
        </span>
        시도별 거래량 순위
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {items.map((item) => (
          <div key={item.sido}>
            {/* 이름 + 수치 행 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                {/* 순위 뱃지 */}
                <span
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: item.rank <= 3 ? "var(--color-primary)" : "var(--color-bg-subtle)",
                    color: item.rank <= 3 ? "#fff" : "var(--color-text-muted)",
                    fontSize: 10,
                    fontWeight: "var(--font-weight-bold)",
                  }}
                >
                  {item.rank}
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text)",
                  }}
                >
                  {item.sido}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--color-text)",
                  }}
                >
                  {item.count.toLocaleString()}건
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: item.prevWeekChange >= 0 ? "var(--bp-error)" : "var(--bp-info)",
                    width: 52,
                    textAlign: "right",
                  }}
                >
                  {item.prevWeekChange >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(item.prevWeekChange)}%
                </span>
              </div>
            </div>

            {/* 막대 그래프 */}
            <div
              style={{
                width: "100%",
                height: 5,
                background: "var(--color-bg-subtle)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  height: "100%",
                  background: "var(--color-primary)",
                  borderRadius: 3,
                  opacity: item.rank === 1 ? 1 : 0.55 + (10 - item.rank) * 0.04,
                  transition: "width var(--transition-slow)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   급등·급감 지역 (오른쪽 카드)
   ============================================================ */
function SurgeCard({
  surgeUp,
  surgeDown,
}: {
  surgeUp: SurgeItem[];
  surgeDown: SurgeItem[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* 급등 */}
      <div style={cardStyle}>
        <h3
          style={{
            margin: "0 0 var(--space-4)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: 16,
              lineHeight: 1,
              color: "var(--bp-error)",
            }}
            aria-hidden
          >
            🔺
          </span>
          전일 대비 급등
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {surgeUp.map((r) => (
            <div
              key={r.sido}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3) var(--space-4)",
                background: "#FEF2F2",
                borderRadius: "var(--radius-md)",
                border: "1px solid #FEE2E2",
              }}
            >
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text)",
                }}
              >
                {r.sido}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--bp-error)",
                }}
              >
                +{r.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 급감 */}
      <div style={cardStyle}>
        <h3
          style={{
            margin: "0 0 var(--space-4)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: 16,
              lineHeight: 1,
              color: "var(--bp-info)",
            }}
            aria-hidden
          >
            🔻
          </span>
          전일 대비 급감
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {surgeDown.map((r) => (
            <div
              key={r.sido}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3) var(--space-4)",
                background: "#EFF6FF",
                borderRadius: "var(--radius-md)",
                border: "1px solid #DBEAFE",
              }}
            >
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text)",
                }}
              >
                {r.sido}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--bp-info)",
                }}
              >
                {r.change}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BM CTA
   ============================================================ */
function VolumeBmCta() {
  const handleClick = () => {
    console.log("[Tab8 CTA] 거래 활발 지역 AI 분석 클릭");
    // TODO: AI 분석 프롬프트 전송으로 교체
  };

  return (
    <button
      onClick={handleClick}
      style={{
        width: "100%",
        marginTop: "var(--space-6)",
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
      거래 활발 지역 AI 분석
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 12L12 2M12 2H6M12 2V8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ============================================================
   Tab8Volume — 메인 컴포넌트
   ============================================================ */
export default function Tab8Volume() {
  const [period, setPeriod] = useState<VolumePeriod>("1w");
  const data: VolumeDataByPeriod = MOCK_VOLUME_DATA[period];

  return (
    <section style={{ padding: "var(--space-6) 0" }}>
      {/* 헤더 행: 기간 필터 + 기준일 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        <PeriodFilter active={period} onChange={setPeriod} />
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {data.reportDate} 기준 · 매일 09:00 갱신
        </span>
      </div>

      {/* 2컬럼 그리드 — 모바일 1열 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
        className="tab8-grid"
      >
        <SidoRankCard items={data.sidoRank} />
        <SurgeCard surgeUp={data.surgeUp} surgeDown={data.surgeDown} />
      </div>

      <VolumeBmCta />

      {/* 모바일 그리드 1열 전환 */}
      <style>{`
        @media (max-width: 768px) {
          .tab8-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
