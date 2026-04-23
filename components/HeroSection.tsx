"use client";

import Link from "next/link";
import StatCard from "./StatCard";
import KoreaHeatmap from "./KoreaHeatmap";

/* ------------------------------------------------------------------
   목업 데이터 — 나중에 API / props로 교체
------------------------------------------------------------------ */
const STATS = [
  {
    label: "현장지수",
    value: "54점",
    subtext: "보합",
    trend: "neutral" as const,
    invertColor: false,
    updateCycle: "매주 월",
  },
  {
    label: "KB 매매지수",
    value: "+0.12%",
    subtext: "보합",
    trend: "neutral" as const,
    invertColor: false,
    updateCycle: "매주",
  },
  {
    label: "전국 거래량",
    value: "8,421건",
    subtext: "전주比 +3%",
    trend: "up" as const,
    invertColor: false,
    updateCycle: "매일",
  },
  {
    label: "급매율",
    value: "2.3%",
    subtext: "전주比 ▼",
    trend: "down" as const,
    invertColor: true,   // 급매율은 하락 = 시장 강세 (초록)
    updateCycle: "매일",
  },
];

/* ------------------------------------------------------------------
   HeroSection
------------------------------------------------------------------ */
export default function HeroSection() {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <section
      aria-labelledby="hero-heading"
      style={{
        background: "linear-gradient(160deg, var(--color-primary-light) 0%, var(--color-bg) 55%)",
        padding: "clamp(var(--space-8), 6vw, var(--space-16)) 0 clamp(var(--space-10), 6vw, var(--space-20))",
      }}
    >
      <div
        style={{
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "0 var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {/* 타이틀 행 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-2)",
          }}
        >
          <h1
            id="hero-heading"
            style={{
              fontSize: "clamp(var(--font-size-2xl), 4vw, var(--font-size-4xl))",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            지금 부동산 시장은?
          </h1>
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {today} 기준
          </span>
        </div>

        {/* 수치 카드 4개 — 모바일 가로 스크롤 */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-4)",
            overflowX: "auto",
            paddingBottom: "var(--space-2)", // 스크롤바 여백
            scrollbarWidth: "none",          // Firefox
          }}
          // webkit 스크롤바 숨김은 globals.css 없이도 inline style로는 안 되므로
          // className 사용
          className="hide-scrollbar"
        >
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* 히트맵 — KB 매매지수 */}
        <KoreaHeatmap />

        {/* 바텀 카피 + CTA */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-5)",
            textAlign: "center",
            paddingTop: "var(--space-4)",
          }}
        >
          <p
            style={{
              fontSize: "clamp(var(--font-size-lg), 2.5vw, var(--font-size-2xl))",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            부동산 공부, 여기서 시작하세요
          </p>
          <Link
            href="#contact"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-4) var(--space-8)",
              background: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--font-size-base)",
              fontWeight: "var(--font-weight-bold)",
              textDecoration: "none",
              boxShadow: "var(--shadow-md)",
              transition: "background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "var(--color-primary-hover)";
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "var(--shadow-lg)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "var(--color-primary)";
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "var(--shadow-md)";
            }}
          >
            무료 AI 상담 시작하기
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            가입 불필요 · 완전 무료
          </p>
        </div>
      </div>
    </section>
  );
}
