"use client";

import { useState, useEffect } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

interface FloatingCTAProps {
  /** 스크롤이 이 px 이상이어야 버튼 표시 (기본 300) */
  showAfter?: number;
  label?: string;
}

export default function FloatingCTA({
  showAfter = 300,
  label = "AI 상담받기",
}: FloatingCTAProps) {
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > showAfter);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // 초기 체크
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showAfter]);

  /* 모바일: MobileBottomTabBar(60px)와 겹치지 않도록 bottom 80px
     PC:    bottom 24px                                           */
  const bottomPx = isMobile ? 80 : 24;

  return (
    <div
      role="complementary"
      aria-label="플로팅 CTA"
      style={{
        position: "fixed",
        bottom: bottomPx,
        right: 24,
        zIndex: 200,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
        transition:
          "opacity var(--transition-slow), transform var(--transition-slow)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <button
        onClick={() => console.log("[FloatingCTA] AI 상담받기 클릭")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-5)",
          background: "var(--bp-gray-900)",
          color: "#fff",
          border: "none",
          borderRadius: 24,
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-bold)",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(26,30,35,0.28)",
          whiteSpace: "nowrap",
          transition:
            "background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "var(--bp-gray-600)";
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = "0 12px 32px rgba(26,30,35,0.38)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "var(--bp-gray-900)";
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "0 8px 24px rgba(26,30,35,0.28)";
        }}
      >
        {/* AI 스파크 아이콘 */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M7 1L4.5 6.5H7.5L6.5 13L11.5 7.5H8.5L7 1Z"
            fill="white"
            stroke="white"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
    </div>
  );
}
