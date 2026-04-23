"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

/* ============================================================
   헤더 네비게이션 = ContentTabs의 9탭
   hash는 ContentTabs TABS와 동기화
   ============================================================ */
const NAV_LINKS = [
  { label: "시황",         href: "#market" },
  { label: "현장지수",     href: "#field-index" },
  { label: "리딩단지",     href: "#leading" },
  { label: "급지표",       href: "#grade" },
  { label: "평형갭",       href: "#gap" },
  { label: "거래량",       href: "#volume" },
  { label: "실거래 분석", href: "#daily" },
  { label: "청약분석",     href: "#subscription" },
  { label: "단지비교",     href: "#compare" },
] as const;

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState<string>("#market");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      setActiveHash(h || "#market");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const handleNavClick = (href: string) => {
    window.location.hash = href;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "var(--header-height)",
        zIndex: 100,
        background: isScrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
        transition:
          "background var(--transition-slow), border-color var(--transition-slow)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "0 var(--space-4)",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-5)",
        }}
      >
        {/* 로고 — 클릭 시 시황 탭으로 */}
        <button
          type="button"
          onClick={() => handleNavClick("#market")}
          aria-label="홈으로"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
        >
          <Logo />
        </button>

        {/* 데스크탑 nav (가로 스크롤) — 768px 이하 숨김 */}
        <nav
          aria-label="주요 메뉴"
          className="hidden md:flex hide-scrollbar"
          style={{
            alignItems: "center",
            gap: "var(--space-1)",
            flex: 1,
            overflowX: "auto",
            minWidth: 0,
          }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeHash === link.href;
            return (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                style={{
                  background: isActive ? "var(--bp-primary-100)" : "none",
                  border: "none",
                  color: isActive ? "var(--bp-primary-500)" : "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: isActive ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  whiteSpace: "nowrap",
                  transition: "color var(--transition-fast), background var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
                }}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
