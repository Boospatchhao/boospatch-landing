"use client";

import { useState } from "react";
import Link from "next/link";
import { useTab9Data, getReboundSignal } from "@/lib/api/dailyTrades";
import type {
  DailyTradesResponse,
  NewHighTrade,
  RegionSummary,
  RegionBarItem,
  SurgeItem,
  TradeItem,
  ReboundItem,
  PriceBucket,
} from "@/lib/types/dailyTrades";
import { PRICE_BUCKETS } from "@/lib/types/dailyTrades";

/* ============================================================
   공통 UI 유틸
   ============================================================ */
function TabBmCta({ text, href }: { text: string; href: string }) {
  return (
    <div
      style={{
        marginTop: "var(--space-10)",
        padding: "var(--space-6)",
        background: "var(--color-primary-light)",
        border: "1px solid #BFDBFE",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "var(--space-4)",
      }}
    >
      <p style={{ margin: 0, fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>
        더 깊이 분석하고 싶다면?
      </p>
      <Link
        href={href}
        style={{
          padding: "var(--space-3) var(--space-6)",
          background: "var(--color-primary)",
          color: "#fff",
          borderRadius: "var(--radius-full)",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-bold)",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </Link>
    </div>
  );
}

function SectionHeader({ title, date }: { title: string; date: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        marginBottom: "var(--space-5)",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
        {title}
      </h3>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
          {date} 기준
        </span>
        <button
          style={actionBtnStyle}
          title="공유하기"
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
        >
          <ShareIcon /> 공유
        </button>
        <button style={actionBtnStyle} title="JPG 저장">
          <DownloadIcon /> 저장
        </button>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "var(--color-bg-subtle)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "4px 10px",
  fontSize: "var(--font-size-xs)",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--color-text-muted)",
  cursor: "pointer",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-3)",
  fontSize: "var(--font-size-sm)",
  verticalAlign: "middle",
};

function ShareIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="2" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.4 5.2 7.6 3M3.4 6.8 7.6 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1v7M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: rank <= 3 ? "var(--color-primary)" : "var(--color-bg-subtle)",
        color: rank <= 3 ? "#fff" : "var(--color-text-muted)",
        fontSize: 11,
        fontWeight: "var(--font-weight-bold)",
      }}
    >
      {rank}
    </span>
  );
}

/* ============================================================
   로딩 / 에러 상태
   ============================================================ */
function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-6) 0" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            height: 48,
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-subtle)",
            animation: "pulse 1.5s ease-in-out infinite",
            opacity: 1 - i * 0.12,
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }`}</style>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "var(--space-6)",
        background: "#FEF2F2",
        border: "1px solid #FCA5A5",
        borderRadius: "var(--radius-xl)",
        color: "#DC2626",
        fontSize: "var(--font-size-sm)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
      }}
    >
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div>
        <p style={{ margin: 0, fontWeight: "var(--font-weight-semibold)" }}>데이터를 불러오지 못했습니다</p>
        <p style={{ margin: 0, fontSize: "var(--font-size-xs)", opacity: 0.8 }}>{message}</p>
      </div>
    </div>
  );
}

/* ============================================================
   서브탭 A — 신고가 주요거래
   ============================================================ */
interface SubTabNewHighsProps {
  trades: NewHighTrade[];
  reportDate: string;
}

function SubTabNewHighs({ trades, reportDate }: SubTabNewHighsProps) {
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  return (
    <div>
      <SectionHeader title="신고가 주요거래" date={reportDate} />

      {/* 뷰 전환 */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
        {(["list", "card"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "var(--space-1) var(--space-4)",
              border: "1px solid",
              borderColor: viewMode === mode ? "var(--color-primary)" : "var(--color-border)",
              borderRadius: "var(--radius-full)",
              background: viewMode === mode ? "var(--color-primary)" : "transparent",
              color: viewMode === mode ? "#fff" : "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            {mode === "list" ? "리포트뷰" : "카드뷰"}
          </button>
        ))}
      </div>

      {/* 판단 기준 툴팁 배너 */}
      <div
        style={{
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)",
          marginBottom: "var(--space-5)",
          fontSize: "var(--font-size-xs)",
          color: "#92400E",
          display: "flex",
          gap: "var(--space-2)",
        }}
      >
        <span style={{ flexShrink: 0 }}>💡</span>
        <span>
          <strong>신고가 판단 기준:</strong> 해당 단지·면적 역대 최고 거래가 경신 기준 (국토부 실거래 + 부스패치 역대 최고가 DB)
        </span>
      </div>

      {/* 리스트 뷰 */}
      {viewMode === "list" && (
        <div style={{ overflowX: "auto" }} className="hide-scrollbar">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--bp-gray-200)" }}>
                {[
                  { label: "#",      w: 40  },
                  { label: "지역",   w: 110 },
                  { label: "아파트명", w: undefined },
                  { label: "면적",    w: 70  },
                  { label: "층",      w: 55  },
                  { label: "가격",    w: 110 },
                  { label: "신고가 대비", w: 140 },
                  { label: "거래일",  w: 100 },
                  { label: "",        w: 70  },
                ].map((h) => (
                  <th key={h.label} style={{
                    padding: "10px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--bp-gray-500)",
                    textAlign: "left",
                    width: h.w,
                    whiteSpace: "nowrap",
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, idx) => {
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? "var(--bp-gray-50)" : "#fff";
                return (
                <tr key={t.rank}
                  style={{ borderBottom: "1px solid var(--bp-gray-100)", background: rowBg, transition: "background 0.1s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#EEF2FF"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                >
                  {/* 순위 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                    <RankBadge rank={t.rank} />
                  </td>
                  {/* 지역 (시도 + 시군구) */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 11, color: "var(--bp-gray-400)", display: "block", marginBottom: 2 }}>
                      {t.sido.replace("특별시","").replace("광역시","").replace("특별자치시","").replace("특별자치도","").replace("도","")}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-gray-700)" }}>
                      {t.sigungu}
                    </span>
                  </td>
                  {/* 아파트명 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--bp-gray-900)", letterSpacing: "-0.2px" }}>
                      {t.aptName}
                    </span>
                  </td>
                  {/* 면적 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle", fontSize: 13, color: "var(--bp-gray-600)", whiteSpace: "nowrap" }}>
                    {t.area}
                  </td>
                  {/* 층 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle", fontSize: 13, color: "var(--bp-gray-600)", whiteSpace: "nowrap" }}>
                    {t.floor}
                  </td>
                  {/* 가격 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: "var(--bp-gray-900)", letterSpacing: "-0.5px" }}>
                      {t.price}
                    </span>
                  </td>
                  {/* 신고가 대비 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#E3342F" }}>
                        ▲ {t.prevHigh.replace("+", "")}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--bp-gray-400)" }}>
                        {t.gapMonths}개월만에 경신
                      </span>
                    </div>
                  </td>
                  {/* 거래일 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle", fontSize: 12, color: "var(--bp-gray-400)", whiteSpace: "nowrap" }}>
                    {t.dealDate}
                  </td>
                  {/* 입지상세 */}
                  <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                    {t.danjiId ? (
                      <Link href={`https://www.boospatch.com/danji/${t.danjiId}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "var(--bp-primary-500)", textDecoration: "none", whiteSpace: "nowrap", fontWeight: 500 }}>
                        입지상세 →
                      </Link>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--bp-gray-300)", whiteSpace: "nowrap" }}>—</span>
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      {/* 카드 뷰 */}
      {viewMode === "card" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          {trades.map((t) => (
            <div
              key={t.rank}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-5)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>#{t.rank} {t.sigungu}</span>
                <span style={{ fontSize: "var(--font-size-xs)", background: "#DCFCE7", color: "#16A34A", borderRadius: "var(--radius-full)", padding: "1px 8px", fontWeight: "var(--font-weight-semibold)" }}>
                  신고가
                </span>
              </div>
              <p style={{ margin: "0 0 var(--space-2)", fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-base)" }}>{t.aptName}</p>
              <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)" }}>{t.price}</p>
              <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {t.area} · {t.floor} · 전고가 대비 {t.prevHigh} · {t.gapMonths}개월만에 갱신
              </p>
              <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                거래일: {t.dealDate}
              </p>
              <Link href="#" style={{ display: "block", textAlign: "center", padding: "var(--space-2)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", color: "var(--color-primary)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textDecoration: "none" }}>
                입지상세 보기 →
              </Link>
            </div>
          ))}
        </div>
      )}

      <TabBmCta text="입지상세 보기 →" href="#contact" />
    </div>
  );
}

/* ============================================================
   서브탭 B — 지역별 거래 현황
   ============================================================ */
interface SubTabRegionalStatusProps {
  summary: RegionSummary[];
  sidoRank: RegionBarItem[];
  surgeRegions: SurgeItem[];
  tradeList: TradeItem[];
  reportDate: string;
}

function SubTabRegionalStatus({ summary, sidoRank, surgeRegions, tradeList, reportDate }: SubTabRegionalStatusProps) {
  const maxCount = Math.max(...sidoRank.map((r) => r.count));

  return (
    <div>
      <SectionHeader title="지역별 거래 현황" date={reportDate} />

      {/* 요약 카드 */}
      <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-6)", overflowX: "auto" }} className="hide-scrollbar">
        {summary.map((s) => (
          <div
            key={s.label}
            style={{
              flex: "1 1 0",
              minWidth: 120,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-4) var(--space-5)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontWeight: "var(--font-weight-semibold)" }}>{s.label}</p>
            <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)" }}>{s.count.toLocaleString()}건</p>
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: s.change >= 0 ? "#16A34A" : "#DC2626" }}>
              {s.change >= 0 ? "▲" : "▼"} {Math.abs(s.change)}%
            </span>
          </div>
        ))}
      </div>

      {/* 급등/급감 배지 */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {surgeRegions.map((r) => (
          <span
            key={r.sido}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-full)",
              background: r.change >= 0 ? "#DCFCE7" : "#FEE2E2",
              color: r.change >= 0 ? "#16A34A" : "#DC2626",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              border: `1px solid ${r.change >= 0 ? "#86EFAC" : "#FCA5A5"}`,
            }}
          >
            {r.change >= 0 ? "▲" : "▼"} {r.sido} {r.change >= 0 ? "+" : ""}{r.change}%
          </span>
        ))}
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", alignSelf: "center" }}>전일 대비 급등·급감 지역</span>
      </div>

      {/* 시도별 바 차트 */}
      <h4 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)" }}>
        시도별 거래량 순위
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        {sidoRank.map((r) => (
          <div key={r.sido} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ width: 20, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "right", flexShrink: 0 }}>{r.rank}</span>
            <span style={{ width: 36, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", flexShrink: 0 }}>{r.sido}</span>
            <div style={{ flex: 1, height: 18, background: "var(--color-bg-subtle)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(r.count / maxCount) * 100}%`,
                  height: "100%",
                  background: r.rank === 1 ? "var(--color-primary)" : "var(--color-primary-light)",
                  borderRadius: "var(--radius-full)",
                  transition: "width var(--transition-slow)",
                }}
              />
            </div>
            <span style={{ width: 60, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", textAlign: "right", flexShrink: 0 }}>
              {r.count.toLocaleString()}건
            </span>
            <span style={{ width: 52, fontSize: "var(--font-size-xs)", color: r.prevWeekChange >= 0 ? "#16A34A" : "#DC2626", textAlign: "right", flexShrink: 0 }}>
              {r.prevWeekChange >= 0 ? "▲" : "▼"} {Math.abs(r.prevWeekChange)}%
            </span>
          </div>
        ))}
      </div>

      {/* 실거래 목록 */}
      <h4 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)" }}>
        주요 실거래 목록
      </h4>
      <div style={{ overflowX: "auto" }} className="hide-scrollbar">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)", minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
              {["지역", "단지", "면적", "가격", "층", "신고일"].map((h) => (
                <th key={h} style={{ ...tdStyle, fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tradeList.map((t, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ ...tdStyle, color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>{t.region}</td>
                <td style={{ ...tdStyle, fontWeight: "var(--font-weight-medium)" }}>
                  <Link href="#" style={{ color: "var(--color-text)", textDecoration: "none" }}>{t.aptName}</Link>
                </td>
                <td style={tdStyle}>{t.area}</td>
                <td style={{ ...tdStyle, fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)" }}>{t.price}</td>
                <td style={tdStyle}>{t.floor}</td>
                <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TabBmCta text="이 지역 매물 내집파인더에서 보기 →" href="#contact" />
    </div>
  );
}

/* ============================================================
   서브탭 C — 반등거래 분석
   ============================================================ */
interface SubTabReboundTradesProps {
  rank: ReboundItem[];
  reportDate: string;
}

function SubTabReboundTrades({ rank, reportDate }: SubTabReboundTradesProps) {
  return (
    <div>
      <SectionHeader title="반등거래 분석" date={reportDate} />

      {/* 개념 설명 + 해석 가이드 */}
      <div style={{ background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5) var(--space-6)", marginBottom: "var(--space-6)" }}>
        <p style={{ margin: "0 0 var(--space-3)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>반등거래란?</p>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
          전월 평균 실거래가 대비 상승한 거래 비율입니다. 이 비율이 높을수록 해당 지역의 상승 모멘텀이 강하다는 신호입니다.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {[
            { range: "50% 이상", label: "상승 모멘텀", color: "#16A34A", bg: "#DCFCE7" },
            { range: "30~50%", label: "회복 중", color: "#CA8A04", bg: "#FEF3C7" },
            { range: "30% 미만", label: "관망", color: "#6B7280", bg: "var(--color-bg-subtle)" },
          ].map((g) => (
            <span
              key={g.range}
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-1) var(--space-3)", background: g.bg, borderRadius: "var(--radius-full)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: g.color }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.color, display: "inline-block" }} />
              {g.range}: {g.label}
            </span>
          ))}
        </div>
      </div>

      {/* 순위 테이블 */}
      <h4 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)" }}>
        시군구별 반등거래율 순위
      </h4>
      <div style={{ overflowX: "auto" }} className="hide-scrollbar">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)", minWidth: 440 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
              {["순위", "시군구", "이달 거래", "반등 건수", "반등거래율", "신호"].map((h) => (
                <th key={h} style={{ ...tdStyle, fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rank.map((r) => {
              const signal = getReboundSignal(r.rate);
              return (
                <tr key={r.rank} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={tdStyle}><RankBadge rank={r.rank} /></td>
                  <td style={{ ...tdStyle, fontWeight: "var(--font-weight-medium)" }}>{r.sigungu}</td>
                  <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{r.total}건</td>
                  <td style={tdStyle}>{r.rebound}건</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <div style={{ width: 60, height: 6, background: "var(--color-bg-subtle)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                        <div style={{ width: `${r.rate}%`, height: "100%", background: signal.color, borderRadius: "var(--radius-full)" }} />
                      </div>
                      <span style={{ color: signal.color, fontWeight: "var(--font-weight-bold)" }}>{r.rate}%</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: signal.color }}>
                      {r.trend === "up" ? "▲" : "▼"} {signal.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 차트 placeholder */}
      <div style={{ marginTop: "var(--space-6)", padding: "var(--space-10)", background: "var(--color-bg-subtle)", border: "1.5px dashed var(--color-border)", borderRadius: "var(--radius-xl)", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        <p style={{ margin: "0 0 var(--space-2)", fontWeight: "var(--font-weight-semibold)" }}>반등거래율 6개월 추이 차트</p>
        <p style={{ margin: 0, fontSize: "var(--font-size-xs)" }}>탭2 이후 Recharts 연동 예정</p>
      </div>

      <TabBmCta text="이 지역 매물 내집파인더에서 보기 →" href="#contact" />
    </div>
  );
}

/* ============================================================
   서브탭 D — 가격대별 인기 아파트
   ============================================================ */
const AREA_FILTERS = ["전체", "59m²이하", "84m²"] as const;
type AreaFilter = (typeof AREA_FILTERS)[number];

function SubTabPriceRange({ data }: { data: DailyTradesResponse }) {
  const [bucket, setBucket] = useState<PriceBucket>("2억");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("전체");

  const priceRange = data.priceRange;
  const rawList = priceRange?.buckets?.[bucket] ?? [];

  const filtered = rawList.filter((apt) => {
    if (areaFilter === "전체") return true;
    if (areaFilter === "59m²이하") return apt.avgArea <= 66;
    if (areaFilter === "84m²") return apt.avgArea > 66 && apt.avgArea <= 95;
    return true;
  });

  const generatedRange = priceRange?.generatedRange ?? "";

  return (
    <div>
      {/* 가격대 버튼 */}
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}
        className="hide-scrollbar"
      >
        {PRICE_BUCKETS.map((b) => {
          const active = bucket === b;
          return (
            <button
              key={b}
              onClick={() => setBucket(b)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: active ? "none" : "1px solid var(--bp-gray-200)",
                background: active ? "var(--bp-gray-900)" : "#fff",
                color: active ? "#fff" : "var(--bp-gray-600)",
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {b}대
            </button>
          );
        })}
      </div>

      {/* 면적 필터 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {AREA_FILTERS.map((a) => {
          const active = areaFilter === a;
          return (
            <button
              key={a}
              onClick={() => setAreaFilter(a)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid ${active ? "var(--bp-gray-900)" : "var(--bp-gray-200)"}`,
                background: active ? "var(--bp-gray-900)" : "#fff",
                color: active ? "#fff" : "var(--bp-gray-600)",
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {a}
            </button>
          );
        })}
      </div>

      {/* 테이블 헤더 행 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--bp-gray-900)" }}>
          전국 평균 {bucket}대 인기 아파트 TOP 20
        </span>
        <div style={{ textAlign: "right", fontSize: 11, color: "var(--bp-gray-400)", lineHeight: 1.7 }}>
          <div>최근 1개월 기준 ({generatedRange})</div>
          <div>직거래(증여·상속 등) 제외, 중개거래만 집계</div>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "var(--bp-gray-50)", borderBottom: "2px solid var(--bp-gray-200)" }}>
              {["#", "아파트", "위치", "면적", "거래", "평균가", "실거래 범위", "최신 실거래"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    textAlign: h === "#" || h === "거래" ? "center" : "left",
                    fontWeight: 600,
                    color: "var(--bp-gray-600)",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--bp-gray-400)", fontSize: 13 }}>
                  해당 조건의 거래 데이터가 없습니다
                </td>
              </tr>
            ) : (
              filtered.map((apt, idx) => {
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? "var(--bp-gray-50)" : "#fff";
                const shortSido = apt.sido
                  .replace("특별자치시", "").replace("특별자치도", "")
                  .replace("특별시", "").replace("광역시", "").replace("도", "");
                return (
                  <tr
                    key={`${apt.aptName}-${apt.sigungu}-${idx}`}
                    style={{ borderBottom: "1px solid var(--bp-gray-100)", background: rowBg, transition: "background 0.1s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#EEF2FF"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                  >
                    {/* 순위 */}
                    <td style={{ padding: "14px 12px", textAlign: "center", verticalAlign: "middle" }}>
                      {apt.rank === 1 ? (
                        <span style={{ fontSize: 18 }}>👑</span>
                      ) : (
                        <span style={{ fontSize: 13, color: "var(--bp-gray-500)", fontWeight: 600 }}>{apt.rank}</span>
                      )}
                    </td>
                    {/* 아파트명 */}
                    <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                      {apt.danjiId ? (
                        <Link
                          href={`https://www.boospatch.com/danji/${apt.danjiId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 14, fontWeight: 700, color: "var(--bp-gray-900)", textDecoration: "none" }}
                        >
                          {apt.aptName}
                        </Link>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--bp-gray-900)" }}>{apt.aptName}</span>
                      )}
                    </td>
                    {/* 위치 */}
                    <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 11, color: "var(--bp-gray-400)", display: "block", marginBottom: 1 }}>{shortSido}</span>
                      <span style={{ fontSize: 13, color: "var(--bp-gray-600)" }}>{apt.sigungu}</span>
                    </td>
                    {/* 면적 */}
                    <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap", color: "var(--bp-gray-600)" }}>
                      {apt.avgArea}m²({apt.avgPyeong}평)
                    </td>
                    {/* 거래 건수 */}
                    <td style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--bp-gray-900)" }}>{apt.tradeCnt}건</span>
                    </td>
                    {/* 평균가 */}
                    <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#E3342F", letterSpacing: "-0.3px" }}>{apt.avgPrice}</span>
                    </td>
                    {/* 실거래 범위 */}
                    <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap", color: "var(--bp-gray-500)", fontSize: 12 }}>
                      {apt.minPrice} ~ {apt.maxPrice}
                    </td>
                    {/* 최신 실거래 */}
                    <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-gray-700)" }}>{apt.latestPrice}</span>
                      <span style={{ fontSize: 11, color: "var(--bp-gray-400)", display: "block", marginTop: 1 }}>
                        ({apt.latestDate?.slice(5).replace("-", ".")}, {apt.latestFloor}층)
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   Tab9DailyTrades — 메인 컴포넌트
   ============================================================ */
const SUB_TABS = [
  { id: "new-high", label: "신고가 주요거래" },
  { id: "regional", label: "지역별 거래 현황" },
  { id: "rebound", label: "반등거래 분석" },
  { id: "price-range", label: "가격대별 인기 아파트" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

function SubTabContent({ activeId, data }: { activeId: SubTabId; data: DailyTradesResponse }) {
  if (activeId === "new-high")
    return <SubTabNewHighs trades={data.newHighTrades} reportDate={data.reportDate} />;
  if (activeId === "regional")
    return (
      <SubTabRegionalStatus
        summary={data.regional.summary}
        sidoRank={data.regional.sidoRank}
        surgeRegions={data.regional.surgeRegions}
        tradeList={data.regional.tradeList}
        reportDate={data.reportDate}
      />
    );
  if (activeId === "price-range")
    return <SubTabPriceRange data={data} />;
  return <SubTabReboundTrades rank={data.rebound.rank} reportDate={data.reportDate} />;
}

export default function Tab9DailyTrades() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("new-high");
  const state = useTab9Data();

  return (
    <section style={{ padding: "var(--space-6) 0" }}>
      {/* 서브탭 바 */}
      <div
        role="tablist"
        aria-label="데일리 실거래 서브탭"
        style={{
          display: "flex",
          gap: "var(--space-1)",
          overflowX: "auto",
          marginBottom: "var(--space-6)",
          borderBottom: "2px solid var(--color-border)",
        }}
        className="hide-scrollbar"
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeSubTab === tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: "var(--space-3) var(--space-5)",
              border: "none",
              borderBottom: activeSubTab === tab.id ? "2px solid var(--color-primary)" : "2px solid transparent",
              background: "transparent",
              color: activeSubTab === tab.id ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: activeSubTab === tab.id ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: "-2px",
              transition: "color var(--transition-fast)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 서브탭 콘텐츠 */}
      <div role="tabpanel" aria-label={SUB_TABS.find((t) => t.id === activeSubTab)?.label}>
        {state.status === "loading" && <LoadingSkeleton />}
        {state.status === "error" && <ErrorBanner message={state.message} />}
        {state.status === "success" && <SubTabContent activeId={activeSubTab} data={state.data} />}
      </div>
    </section>
  );
}
