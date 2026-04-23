"use client";

import { MOCK_APT } from "@/lib/mock/tab7";
import type { PyeongType, NearbyComp, AptSchedule } from "@/lib/types/apt";

/* ============================================================
   유틸
   ============================================================ */
const fmt만원 = (n: number) =>
  n >= 10000
    ? `${(n / 10000).toFixed(1)}억`
    : `${n.toLocaleString()}만`;

const fmtDate = (s: string) => s.replace(/-/g, ".");

/** 오늘 날짜와 비교 (YYYY-MM-DD 문자열) */
const isPast = (dateStr: string) =>
  new Date(dateStr) < new Date(new Date().toDateString());

/* ============================================================
   단지 헤더 카드
   ============================================================ */
function AptHeader() {
  const apt = MOCK_APT;
  return (
    <div
      style={{
        background: "var(--bp-gray-50)",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "var(--space-4)",
      }}
    >
      {/* 좌측: 단지명·주소·세대뱃지 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <h2
          style={{
            margin: 0,
            fontSize: 19,
            fontWeight: 500,
            color: "var(--bp-gray-900)",
            lineHeight: 1.3,
          }}
        >
          {apt.name}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--bp-gray-500)",
          }}
        >
          {apt.address}
        </p>
        <span
          style={{
            alignSelf: "flex-start",
            padding: "3px 10px",
            background: "var(--bp-primary-100)",
            color: "var(--bp-primary-500)",
            borderRadius: "var(--radius-full)",
            fontSize: 12,
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          총 {apt.totalUnits.toLocaleString()}세대
        </span>
      </div>

      {/* 우측: 공급지역 뱃지 + 1순위 날짜 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            padding: "3px 10px",
            background: "var(--color-primary-light)",
            color: "var(--color-primary)",
            borderRadius: "var(--radius-full)",
            fontSize: 12,
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          {apt.region}
        </span>
        <span style={{ fontSize: 12, color: "var(--bp-gray-500)" }}>
          1순위{" "}
          <strong style={{ color: "var(--bp-gray-900)" }}>
            {fmtDate(apt.schedule.firstPriority)}
          </strong>
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   안전마진 분석 테이블
   ============================================================ */
const TABLE_HEADERS = ["평형", "타입", "분양가", "평단가", "인근평단가", "안전마진"];

const thStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  fontSize: 12,
  fontWeight: "var(--font-weight-semibold)",
  color: "var(--bp-gray-500)",
  textAlign: "left",
  whiteSpace: "nowrap",
  borderBottom: "1.5px solid var(--color-border)",
};

function SafetyMarginTable({ rows }: { rows: PyeongType[] }) {
  return (
    <div>
      <div style={{ marginBottom: "var(--space-3)" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-500)" }}>
          안전마진 분석
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--bp-gray-350)" }}>
          반경 1km / 10년 내 / 300세대 이상 기준
        </p>
      </div>

      <div style={{ overflowX: "auto" }} className="hide-scrollbar">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 560,
            background: "#fff",
            border: "0.5px solid var(--bp-gray-200)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr>
              {TABLE_HEADERS.map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isNeg = row.safetyMargin < 0;
              return (
                <tr
                  key={row.name}
                  style={{
                    background: isNeg ? "var(--bp-red-50)" : "#f0faf7",
                    borderBottom: "0.5px solid #f0f0f0",
                  }}
                >
                  <td style={tdStyle}>
                    {row.area}㎡<br />
                    <span style={{ fontSize: 11, color: "var(--bp-gray-350)" }}>({row.pyeong}평)</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: "var(--font-weight-semibold)" }}>
                    {row.name}
                  </td>
                  <td style={tdStyle}>{fmt만원(row.price)}</td>
                  <td style={tdStyle}>{row.pricePerPyeong.toLocaleString()}만</td>
                  <td style={tdStyle}>{row.nearbyAvgPerPyeong.toLocaleString()}만</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: "var(--font-weight-bold)",
                      color: isNeg ? "var(--bp-red-500)" : "var(--bp-primary)",
                    }}
                  >
                    {isNeg ? "" : "+"}{fmt만원(row.safetyMargin)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "var(--space-3) var(--space-3)",
  fontSize: 13,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

/* ============================================================
   시세 비교 단지
   ============================================================ */
function NearbyCompsSection({ comps }: { comps: NearbyComp[] }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid var(--bp-gray-200)",
        borderRadius: 10,
        padding: 20,
      }}
    >
      <p
        style={{
          margin: "0 0 var(--space-4)",
          fontSize: 13,
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--bp-gray-500)",
        }}
      >
        시세 비교 단지
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {comps.map((c, i) => (
          <div
            key={i}
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--bp-gray-50)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--bp-gray-900)",
              }}
            >
              {c.name}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "var(--space-2)",
                fontSize: 12,
                color: "var(--bp-gray-500)",
              }}
            >
              <span>{c.year}년</span>
              <span style={{ color: "var(--bp-gray-200)" }}>·</span>
              <span>{c.units.toLocaleString()}세대</span>
              <span style={{ color: "var(--bp-gray-200)" }}>·</span>
              <span>{c.pyeong}평</span>
              <span style={{ color: "var(--bp-gray-200)" }}>·</span>
              <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--bp-gray-900)" }}>
                {c.pricePerPyeong.toLocaleString()}만원/평
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  padding: "1px 8px",
                  background: "var(--bp-gray-100)",
                  color: "#63666c",
                  borderRadius: "var(--radius-full)",
                  fontSize: 11,
                  fontWeight: "var(--font-weight-semibold)",
                  whiteSpace: "nowrap",
                }}
              >
                {c.distanceKm.toFixed(2)}km
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   분양 일정 타임라인
   ============================================================ */
const SCHEDULE_LABELS: Array<{ key: keyof AptSchedule; label: string }> = [
  { key: "announcement",  label: "모집공고" },
  { key: "specialSupply", label: "특별공급" },
  { key: "firstPriority", label: "1순위" },
  { key: "winner",        label: "당첨자 발표" },
];

function ScheduleTimeline({ schedule }: { schedule: AptSchedule }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid var(--bp-gray-200)",
        borderRadius: 10,
        padding: 20,
      }}
    >
      <p
        style={{
          margin: "0 0 var(--space-4)",
          fontSize: 13,
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--bp-gray-500)",
        }}
      >
        분양 일정
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {SCHEDULE_LABELS.map(({ key, label }, idx) => {
          const dateStr = schedule[key];
          const past = isPast(dateStr);
          const isLast = idx === SCHEDULE_LABELS.length - 1;

          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
                paddingBottom: isLast ? 0 : "var(--space-4)",
                position: "relative",
              }}
            >
              {/* 타임라인 선 + 도트 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: past ? "var(--bp-gray-300)" : "var(--bp-primary)",
                    marginTop: 3,
                    flexShrink: 0,
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 24,
                      background: past ? "var(--bp-gray-100)" : "var(--bp-green-200)",
                      marginTop: 3,
                    }}
                  />
                )}
              </div>

              {/* 내용 */}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: past ? "var(--bp-gray-350)" : "var(--bp-gray-500)",
                    textDecoration: past ? "line-through" : "none",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 13,
                    fontWeight: past ? "normal" : "var(--font-weight-medium)",
                    color: past ? "var(--bp-gray-350)" : "var(--bp-primary)",
                    textDecoration: past ? "line-through" : "none",
                  }}
                >
                  {fmtDate(dateStr)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Tab7Apt — 메인 컴포넌트
   ============================================================ */
export default function Tab7Apt() {
  const apt = MOCK_APT;

  return (
    <section
      style={{
        padding: "var(--space-6) 0",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* 단지 헤더 */}
      <AptHeader />

      {/* 안전마진 테이블 */}
      <SafetyMarginTable rows={apt.pyeongTypes} />

      {/* 하단 2열: 시세비교 | 분양일정 */}
      <div
        className="tab7-bottom-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        <NearbyCompsSection comps={apt.nearbyComps} />
        <ScheduleTimeline schedule={apt.schedule} />
      </div>

      {/* BM CTA */}
      <button
        onClick={() => console.log("[Tab7 CTA] 이 청약 AI 심층 분석 받기 클릭")}
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
        이 청약 AI 심층 분석 받기
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

      {/* 모바일 하단 2열 → 1열 */}
      <style>{`
        @media (max-width: 768px) {
          .tab7-bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
