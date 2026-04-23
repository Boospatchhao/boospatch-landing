"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ============================================================
   기획서 4번 — 모바일 하단 탭바
   "로고 / 시황 / 공부하기 / 실거래 / AI상담"
   ============================================================ */
const BOTTOM_TABS = [
  {
    id: "home",
    label: "홈",
    href: "#market",
    hash: "#market",
    icon: HomeIcon,
  },
  {
    id: "market",
    label: "시황",
    href: "#market",
    hash: "#market",
    icon: ChartIcon,
  },
  {
    id: "study",
    label: "현장지수",
    href: "#field-index",
    hash: "#field-index",
    icon: BookIcon,
  },
  {
    id: "daily",
    label: "실거래",
    href: "#daily",
    hash: "#daily",
    icon: BuildingIcon,
  },
  {
    id: "compare",
    label: "단지비교",
    href: "#compare",
    hash: "#compare",
    icon: AIIcon,
    isAccent: true,
  },
] as const;

type BottomTabId = (typeof BOTTOM_TABS)[number]["id"];

/* ============================================================
   아이콘
   ============================================================ */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M3 9.5L11 3L19 9.5V19H14V14H8V19H3V9.5Z"
        stroke={active ? "var(--color-primary)" : "currentColor"}
        strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round"
        fill={active ? "var(--color-primary-light)" : "none"}
      />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M3 17L8 11L12 14L17 7L21 10"
        stroke={active ? "var(--color-primary)" : "currentColor"}
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="1" y="19" width="20" height="1.5" rx="0.75"
        fill={active ? "var(--color-primary)" : "currentColor"} opacity="0.4" />
    </svg>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M4 3h7v16H4zM11 3h7v16h-7z"
        stroke={active ? "var(--color-primary)" : "currentColor"}
        strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round"
        fill={active ? "var(--color-primary-light)" : "none"}
      />
    </svg>
  );
}

function BuildingIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="2" y="6" width="8" height="14" rx="1"
        stroke={active ? "var(--color-primary)" : "currentColor"}
        strokeWidth={active ? 2 : 1.5}
        fill={active ? "var(--color-primary-light)" : "none"} />
      <rect x="12" y="2" width="8" height="18" rx="1"
        stroke={active ? "var(--color-primary)" : "currentColor"}
        strokeWidth={active ? 2 : 1.5}
        fill={active ? "var(--color-primary-light)" : "none"} />
      <path d="M6 10v2M6 14v2M16 6v2M16 10v2M16 14v2"
        stroke={active ? "var(--color-primary)" : "currentColor"}
        strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function AIIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="8"
        stroke={active ? "var(--color-accent)" : "currentColor"}
        strokeWidth={active ? 2 : 1.5}
        fill={active ? "#FFF7ED" : "none"} />
      <path d="M7 11c0-2.2 1.8-4 4-4s4 1.8 4 4"
        stroke={active ? "var(--color-accent)" : "currentColor"}
        strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="14" r="1.2" fill={active ? "var(--color-accent)" : "currentColor"} />
    </svg>
  );
}

/* ============================================================
   MobileBottomTabBar
   ============================================================ */
export default function MobileBottomTabBar() {
  const [activeId, setActiveId] = useState<BottomTabId>("home");

  /* URL hash 동기화 */
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (!hash) { setActiveId("home"); return; }
      const matched = BOTTOM_TABS.find((t) => t.hash === hash);
      if (matched) setActiveId(matched.id);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const handleClick = (tab: (typeof BOTTOM_TABS)[number]) => {
    setActiveId(tab.id);
    if (tab.hash) history.pushState(null, "", tab.hash);
  };

  return (
    <nav
      aria-label="모바일 하단 탭바"
      /* md:hidden — 768px 초과 시 숨김 */
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--bottom-tab-height)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "stretch",
        zIndex: 150,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 16px 0 rgb(0 0 0 / 0.06)",
      }}
    >
      {BOTTOM_TABS.map((tab) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;
        const isAccent = "isAccent" in tab && tab.isAccent;
        const activeColor = isAccent ? "var(--color-accent)" : "var(--color-primary)";

        return (
          <Link
            key={tab.id}
            href={tab.href}
            onClick={() => handleClick(tab)}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
              color: isActive ? activeColor : "var(--color-text-muted)",
              paddingTop: "var(--space-2)",
              transition: "color var(--transition-fast)",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
            }}
          >
            {/* 활성 인디케이터 */}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 32,
                  height: 3,
                  borderRadius: "0 0 var(--radius-full) var(--radius-full)",
                  background: activeColor,
                }}
              />
            )}

            <Icon active={isActive} />

            <span
              style={{
                fontSize: 10,
                fontWeight: isActive
                  ? "var(--font-weight-bold)"
                  : "var(--font-weight-medium)",
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
