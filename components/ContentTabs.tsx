"use client";

import { useState, useEffect, Suspense, lazy } from "react";

/* ============================================================
   탭 정의 — 헤더와 hash 동기화
   ============================================================ */
const TABS = [
  { id: "market",       hash: "#market" },
  { id: "field-index",  hash: "#field-index" },
  { id: "leading",      hash: "#leading" },
  { id: "grade",        hash: "#grade" },
  { id: "gap",          hash: "#gap" },
  { id: "volume",       hash: "#volume" },
  { id: "daily",        hash: "#daily" },
  { id: "subscription", hash: "#subscription" },
  { id: "compare",      hash: "#compare" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ============================================================
   Lazy 로드
   ============================================================ */
const Tab0Market      = lazy(() => import("./tabs/Tab0Market"));
const Tab1FieldIndex  = lazy(() => import("./tabs/Tab1FieldIndex"));
const Tab3Leading     = lazy(() => import("./tabs/Tab3Leading"));
const Tab5Grade       = lazy(() => import("./tabs/Tab5Grade"));
const Tab6Gap         = lazy(() => import("./tabs/Tab6Gap"));
const Tab7Apt         = lazy(() => import("./tabs/Tab7Apt"));
const Tab8Volume      = lazy(() => import("./tabs/Tab8Volume"));
const Tab9DailyTrades = lazy(() => import("./tabs/Tab9DailyTrades"));
const TabCompare      = lazy(() => import("./tabs/TabCompare"));

function TabContent({ activeId }: { activeId: TabId }) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "var(--space-20)", textAlign: "center", color: "var(--color-text-muted)" }}>
          불러오는 중...
        </div>
      }
    >
      {activeId === "market"       && <Tab0Market />}
      {activeId === "field-index"  && <Tab1FieldIndex />}
      {activeId === "leading"      && <Tab3Leading />}
      {activeId === "grade"        && <Tab5Grade />}
      {activeId === "gap"          && <Tab6Gap />}
      {activeId === "volume"       && <Tab8Volume />}
      {activeId === "daily"        && <Tab9DailyTrades />}
      {activeId === "subscription" && <Tab7Apt />}
      {activeId === "compare"      && <TabCompare />}
    </Suspense>
  );
}

/* ============================================================
   ContentTabs — 헤더에 통합된 nav와 hash로 연동. 자체 탭바는 없음.
   ============================================================ */
export default function ContentTabs() {
  const [activeId, setActiveId] = useState<TabId>("market");

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash;
      const matched = TABS.find((t) => t.hash === hash);
      if (matched) setActiveId(matched.id);
      else if (!hash) history.replaceState(null, "", "#market");
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <div
      id={`panel-${activeId}`}
      role="tabpanel"
      aria-labelledby={`tab-${activeId}`}
      style={{
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4) calc(var(--space-20) + var(--bottom-tab-height))",
      }}
    >
      <TabContent activeId={activeId} />
    </div>
  );
}
