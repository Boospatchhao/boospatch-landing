"use client";

import type { ReportData } from "./types";

interface Props {
  data: ReportData;
}

// Phase 0 Week 1 placeholder — 추후 Week 3~4에 카드 섹션 전체 구현
// 현재는 단지 정보 + 한 줄 평만 간단히 표시
export default function ReportMessage({ data }: Props) {
  const { danjiInfo, review } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: "92%" }}>
      <div
        style={{
          padding: "12px 14px",
          background: "#fff",
          border: "1px solid var(--bp-gray-200)",
          borderRadius: "4px 16px 16px 16px",
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--bp-gray-900)",
        }}
      >
        {data.intro}
      </div>

      {/* Hero 카드 (플레이스홀더) */}
      <div
        style={{
          padding: 16,
          background: "linear-gradient(135deg, var(--bp-primary-100), var(--bp-green-50))",
          border: "1px solid var(--bp-green-200)",
          borderRadius: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--bp-gray-900)", marginBottom: 4 }}>
          🏢 {danjiInfo.danji_name}
        </div>
        {danjiInfo.address && (
          <div style={{ fontSize: 12, color: "var(--bp-gray-600)" }}>
            {danjiInfo.address}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--bp-gray-500)", marginTop: 4 }}>
          {danjiInfo.total_household_count ? `${danjiInfo.total_household_count.toLocaleString()}세대` : ""}
          {danjiInfo.use_approve_ymd && danjiInfo.total_household_count ? " · " : ""}
          {danjiInfo.use_approve_ymd ? `${danjiInfo.use_approve_ymd.slice(0, 4)}년 준공` : ""}
        </div>
      </div>

      {/* 한 줄 평 */}
      {review?.oneLiner && (
        <div
          style={{
            padding: 14,
            background: "#fff",
            border: "1px solid var(--bp-gray-200)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-primary-500)", marginBottom: 6 }}>
            💬 부스패치 한 줄 평
          </div>
          <div style={{ fontSize: 13, color: "var(--bp-gray-800)", lineHeight: 1.6 }}>
            {review.oneLiner}
          </div>
        </div>
      )}

      {/* 장단점 */}
      {review && (review.strengths.length > 0 || review.weaknesses.length > 0) && (
        <div
          style={{
            padding: 14,
            background: "#fff",
            border: "1px solid var(--bp-gray-200)",
            borderRadius: 14,
          }}
        >
          {review.strengths.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-primary-500)", marginBottom: 6 }}>
                👍 장점
              </div>
              <ul style={{ margin: 0, padding: "0 0 8px 16px", fontSize: 13, color: "var(--bp-gray-700)", lineHeight: 1.7 }}>
                {review.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {review.weaknesses.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-red-500)", marginBottom: 6 }}>
                👎 단점
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 13, color: "var(--bp-gray-700)", lineHeight: 1.7 }}>
                {review.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--bp-gray-400)", padding: "0 4px" }}>
        본 분석은 참고용이며 투자 자문이 아닙니다. 차트·지도·학군 등 전체 리포트는 준비 중입니다.
      </div>
    </div>
  );
}
