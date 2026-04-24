"use client";

import { useMemo, useState, useRef } from "react";
import { downloadChartAsJpg } from "@/lib/utils/downloadChart";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  LineChart,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import {
  useKBRegions,
  useKBSummary,
  useKBSeries,
  useKBSeriesMulti,
  type KBPeriodic,
  type KBIndexType,
  type KBPoint,
  type KBIndicatorSnapshot,
} from "@/lib/api/kb";

/* ============================================================
   상수 / 유틸
   ============================================================ */
type SignalLabel = "강세" | "약세" | "보합" | "매수우위";

const SIGNAL_STYLE: Record<SignalLabel, { bg: string; color: string }> = {
  매수우위: { bg: "#e7f8f4", color: "#18997d" },
  강세:     { bg: "#FEF3C7", color: "#D97706" },
  약세:     { bg: "#FEF2F2", color: "#DC2626" },
  보합:     { bg: "#f0f2f6", color: "#63666c" },
};

const PERIOD_OPTIONS: Record<KBPeriodic, readonly { label: string; count: number }[]> = {
  weekly: [
    { label: "24주", count: 24 },
    { label: "52주", count: 52 },
    { label: "3년",  count: 156 },
    { label: "전체", count: 0 },
  ],
  monthly: [
    { label: "12개월", count: 12 },
    { label: "36개월", count: 36 },
    { label: "10년",   count: 120 },
    { label: "전체",    count: 0 },
  ],
};

// MA 차트 이평선 윈도우: 1년 / 3년
const MA_WINDOWS: Record<KBPeriodic, { short: number; long: number; shortLabel: string; longLabel: string }> = {
  weekly:  { short: 52,  long: 156, shortLabel: "1년(52주)",  longLabel: "3년(156주)"  },
  monthly: { short: 12,  long: 36,  shortLabel: "1년(12개월)", longLabel: "3년(36개월)" },
};

function classifySignal(type: KBIndexType, latest: number | null, changePct: number | null): SignalLabel {
  if (type === "매수우위지수") {
    if (latest == null) return "보합";
    if (latest >= 100) return "매수우위";
    if (latest >= 60)  return "보합";
    return "약세";
  }
  if (type === "전세수급지수") {
    if (latest == null) return "보합";
    if (latest >= 120) return "강세";
    if (latest >= 80)  return "보합";
    return "약세";
  }
  // 가격지수류
  if (changePct == null) return "보합";
  if (changePct >= 0.05)  return "강세";
  if (changePct >= -0.05) return "보합";
  return "약세";
}

function formatCardValue(snap: KBIndicatorSnapshot): { value: string; change?: string } {
  if (snap.latestValue == null) return { value: "—" };
  const isPriceIndex = snap.type === "매매가격지수" || snap.type === "전세가격지수" || snap.type === "월세가격지수";
  if (isPriceIndex) {
    // 가격지수: 직전대비 변동률을 메인 값으로
    const ch = snap.weekChangePct;
    return {
      value: ch == null ? snap.latestValue.toFixed(2) : `${ch > 0 ? "+" : ""}${ch.toFixed(2)}%`,
      change: `지수 ${snap.latestValue.toFixed(2)}`,
    };
  }
  // 매수우위/전세수급: 절대 지수값을 메인 값으로
  return {
    value: snap.latestValue.toFixed(0),
    change: snap.weekChangePct == null ? undefined : `${snap.weekChangePct > 0 ? "+" : ""}${snap.weekChangePct.toFixed(2)}%p`,
  };
}

/* ============================================================
   차트 데이터 변환
   ============================================================ */
interface ChartPoint {
  date: string;
  price: number;
}

function buildChart(points: KBPoint[]): ChartPoint[] {
  return points.map((p) => ({
    date: p.date,
    price: Math.round(p.value * 100) / 100,
  }));
}

/* ============================================================
   서브 컴포넌트
   ============================================================ */
function IndicatorCard({
  snap, active, onSelect,
}: {
  snap: KBIndicatorSnapshot;
  active: boolean;
  onSelect: () => void;
}) {
  const { value, change } = formatCardValue(snap);
  const signal = classifySignal(snap.type, snap.latestValue, snap.weekChangePct);
  const sig = SIGNAL_STYLE[signal];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      style={{
        background: active ? "#fff" : "#f8f9fc",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        textAlign: "left",
        border: active ? "2px solid var(--bp-primary, #06b281)" : "2px solid transparent",
        cursor: "pointer",
        transition: "background var(--transition-fast), border-color var(--transition-fast)",
      }}
    >
      <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {snap.type}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 19, fontWeight: 500, color: "var(--color-text)", lineHeight: 1.2 }}>{value}</span>
        {change && <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{change}</span>}
      </div>
      <span style={{ alignSelf: "flex-start", padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", background: sig.bg, color: sig.color }}>
        {signal}
      </span>
    </button>
  );
}

const isPriceIndex = (t: KBIndexType) =>
  t === "매매가격지수" || t === "전세가격지수" || t === "월세가격지수";

const CHART_COLOR: Record<KBIndexType, string> = {
  매매가격지수: "#06b281",
  전세가격지수: "#2563EB",
  월세가격지수: "#7C3AED",
  매수우위지수: "#F97316",
  전세수급지수: "#0891B2",
};

/** sentiment 차트의 sub-component 라벨은 지수마다 다름 */
const SENTIMENT_SUB_LABEL: Record<"매수우위지수" | "전세수급지수", { sellers: string; buyers: string }> = {
  매수우위지수: { sellers: "매도자 많음", buyers: "매수자 많음" },
  전세수급지수: { sellers: "공급 충분",   buyers: "공급 부족" },
};

/* 단순 이동평균 (windowed mean). 데이터 부족 구간은 null */
function rollingMA(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    let s = 0;
    let n = 0;
    for (let k = i - window + 1; k <= i; k++) {
      const v = values[k];
      if (v == null) return null;
      s += v;
      n++;
    }
    return n === window ? s / n : null;
  });
}

/* MA 교차 감지: shortMA가 longMA를 상향 돌파(golden) / 하향 돌파(dead) */
interface MaCross { type: "golden" | "dead"; date: string; }
function detectMaCross(
  data: { date: string; shortMA: number | null; longMA: number | null }[]
): MaCross[] {
  const out: MaCross[] = [];
  for (let i = 1; i < data.length; i++) {
    const p = data[i - 1], c = data[i];
    if (p.shortMA == null || p.longMA == null || c.shortMA == null || c.longMA == null) continue;
    const pd = p.shortMA - p.longMA;
    const cd = c.shortMA - c.longMA;
    if (pd <= 0 && cd > 0)      out.push({ type: "golden", date: c.date });
    else if (pd >= 0 && cd < 0) out.push({ type: "dead",   date: c.date });
  }
  return out;
}

function DownloadButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}
      disabled={busy}
      title="차트를 JPG 이미지로 저장"
      aria-label="JPG 저장"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: compact ? "5px 8px" : "4px 10px",
        fontSize: 11,
        fontWeight: "var(--font-weight-medium)",
        color: busy ? "var(--color-text-muted)" : "var(--bp-primary-500)",
        background: busy ? "#f0f2f6" : "var(--bp-primary-100)",
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: busy ? "wait" : "pointer",
        transition: "background var(--transition-fast)",
      }}
    >
      <svg width={compact ? 14 : 12} height={compact ? 14 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {!compact && (busy ? "저장 중…" : "JPG 저장")}
    </button>
  );
}

interface TooltipPayload { name: string; value: number | null; color: string; }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e4e6ea", borderRadius: 8, padding: "10px 14px", fontSize: "var(--font-size-xs)", boxShadow: "var(--shadow-md)", minWidth: 140 }}>
      <p style={{ margin: "0 0 6px", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>{label}</p>
      {payload.map((p) =>
        p.value !== null && p.value !== undefined ? (
          <p key={p.name} style={{ margin: "2px 0", color: p.color }}>
            {p.name}: <strong>{p.value.toFixed(2)}</strong>
          </p>
        ) : null
      )}
    </div>
  );
}

/* ============================================================
   메인
   ============================================================ */
/* 비교 모드: 지역별 라인 색 */
const COMPARE_COLORS = ["#06b281", "#F97316", "#2563EB", "#DC2626", "#7C3AED"];

export default function Tab2KB() {
  const [region, setRegion] = useState<string>("전국");
  const [compareRegions, setCompareRegions] = useState<string[]>([]);
  const [periodic, setPeriodic] = useState<KBPeriodic>("weekly");
  const [periodIdx, setPeriodIdx] = useState<number>(3); // 전체
  const [selectedType, setSelectedType] = useState<KBIndexType>("매매가격지수");

  const isCompareMode = compareRegions.length > 0;
  const allCompareRegions = useMemo(() => [region, ...compareRegions], [region, compareRegions]);

  const isMobile = useIsMobile();
  // 모바일은 차트 높이 ↓, 우측 라벨 공간 ↓
  const chartH        = isMobile ? 240 : 320;
  const priceChartH   = isMobile ? 220 : 280;
  const maChartH      = isMobile ? 280 : 340;
  const rightMargin   = isMobile ? 12  : 56;
  const xTickInterval = (n: number) => Math.max(0, Math.floor(n / (isMobile ? 5 : 8)));

  const periods = PERIOD_OPTIONS[periodic];
  const period = periods[periodIdx] ?? periods[periods.length - 1];
  const limit = period.count > 0 ? period.count : undefined;

  const regionsState = useKBRegions(periodic, "매매가격지수");
  const summaryState = useKBSummary(region, periodic);
  const seriesState  = useKBSeries({ type: selectedType, periodic, region, limit });

  const isPrice = isPriceIndex(selectedType);
  const isSentiment = selectedType === "매수우위지수" || selectedType === "전세수급지수";

  // 심리지수 차트는 매매가격지수도 같이 오버레이
  const priceOverlayState = useKBSeries({
    type: "매매가격지수",
    periodic, region, limit,
    // 가격지수 선택 중일 땐 호출 안 해도 되지만 hook은 conditional 호출 불가 → 그대로 호출
  });

  // ──────── 비교 모드: 여러 지역 선택시 선택된 모든 지역의 현재 type 시리즈 병렬 fetch ────────
  const compareState = useKBSeriesMulti({
    type: selectedType,
    periodic, regions: allCompareRegions, limit,
  });

  /** 날짜 기준 outer-join → [{ date, r0, r1, ... }] */
  const compareChartData = useMemo(() => {
    if (!isCompareMode || compareState.status !== "success") return [];
    const dateSet = new Set<string>();
    for (const s of compareState.data) for (const p of s.points) dateSet.add(p.date);
    const dates = [...dateSet].sort();
    const bucket = compareState.data.map((s) => new Map(s.points.map((p) => [p.date, p.value])));
    return dates.map((d) => {
      const row: Record<string, string | number | null> = { date: d };
      bucket.forEach((m, i) => { row[`r${i}`] = m.get(d) ?? null; });
      return row;
    });
  }, [isCompareMode, compareState]);

  // ──────── 매수우위지수 이평선 차트용 (현재 periodic 풀 히스토리, 기간 토글 무시) ────────
  const maSentimentState = useKBSeries({ type: "매수우위지수", periodic, region });
  const maPriceState     = useKBSeries({ type: "매매가격지수", periodic, region });
  const { short: MA_SHORT, long: MA_LONG, shortLabel: MA_SHORT_LABEL, longLabel: MA_LONG_LABEL } = MA_WINDOWS[periodic];

  // JPG 다운로드용 refs
  const mainChartRef = useRef<HTMLDivElement>(null);
  const maChartRef   = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    if (seriesState.status !== "success") return [];
    return buildChart(seriesState.data.points);
  }, [seriesState]);

  // 매수우위지수 + 단/장기 이평선 + 매매가격 오버레이 + 골든/데드크로스
  const maChartData = useMemo(() => {
    if (maSentimentState.status !== "success") return { points: [] as Array<{ date: string; sentimentIndex: number | null; shortMA: number | null; longMA: number | null; priceIndex: number | null }>, crosses: [] as MaCross[] };
    const pts = maSentimentState.data.points;
    const values = pts.map((p) => p.value);
    const sMA = rollingMA(values, MA_SHORT);
    const lMA = rollingMA(values, MA_LONG);
    const priceMap = new Map<string, number>();
    if (maPriceState.status === "success") {
      for (const p of maPriceState.data.points) priceMap.set(p.date, p.value);
    }
    const full = pts.map((p, i) => ({
      date: p.date,
      sentimentIndex: p.value,
      shortMA: sMA[i],
      longMA: lMA[i],
      priceIndex: priceMap.get(p.date) ?? null,
    }));
    // 다운샘플링 (가독성) — 크로스 감지는 다운샘플 결과 위에서 → 차트와 정확히 정렬
    let display = full;
    if (display.length > 400) {
      const step = Math.ceil(display.length / 400);
      display = display.filter((_, i) => i % step === 0);
      if (display[display.length - 1] !== full[full.length - 1]) display.push(full[full.length - 1]);
    }
    const crosses = detectMaCross(display);
    return { points: display, crosses };
  }, [maSentimentState, maPriceState]);

  // 심리지수용 합성 데이터: { date, sentimentIndex, sellers_more, buyers_more, priceIndex }
  const sentimentChartData = useMemo(() => {
    if (!isSentiment || seriesState.status !== "success") return [];
    const priceMap = new Map<string, number>();
    if (priceOverlayState.status === "success") {
      for (const p of priceOverlayState.data.points) priceMap.set(p.date, p.value);
    }
    const raw = seriesState.data.points.map((p) => ({
      date: p.date,
      sentimentIndex: p.value,
      sellers_more: p.sellers_more ?? null,
      buyers_more:  p.buyers_more  ?? null,
      priceIndex:   priceMap.get(p.date) ?? null,
    }));
    // 데이터가 너무 빽빽하면(>300pt) 균등 다운샘플링 → 막대/선 가독성 확보
    if (raw.length <= 300) return raw;
    const step = Math.ceil(raw.length / 300);
    const sampled = raw.filter((_, i) => i % step === 0);
    // 마지막 포인트는 항상 포함 (최신 라벨 표시용)
    if (sampled[sampled.length - 1] !== raw[raw.length - 1]) sampled.push(raw[raw.length - 1]);
    return sampled;
  }, [isSentiment, seriesState, priceOverlayState]);

  // Y축 도메인 — 가격지수는 0.5 단위 패딩, 심리지수는 10 단위 패딩
  const allValues = chartData.map((d) => d.price);
  const yPad = isPrice ? 0.5 : 10;
  const yStep = isPrice ? 2 : 0.1;
  const yMin = allValues.length ? Math.floor(Math.min(...allValues) * yStep) / yStep - yPad : 0;
  const yMax = allValues.length ? Math.ceil(Math.max(...allValues)  * yStep) / yStep + yPad : 100;

  const regions = regionsState.status === "success" ? regionsState.data.regions : ["전국"];
  const updated = seriesState.status === "success" ? chartData[chartData.length - 1]?.date : null;

  return (
    <section style={{ padding: "var(--space-6) 0", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* 컨트롤바 */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-3)" }}>
        <label htmlFor="kb-region" style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
          지역
        </label>
        <select
          id="kb-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          disabled={regionsState.status === "loading"}
          style={{
            padding: "var(--space-2) var(--space-4)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text)",
            background: "#fff",
            cursor: "pointer",
            outline: "none",
            minWidth: 180,
          }}
        >
          {regions.map((r) => (<option key={r} value={r}>{r}</option>))}
        </select>

        {/* 주간/월간 토글 */}
        <div role="tablist" aria-label="주기" style={{ display: "inline-flex", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {(["weekly", "monthly"] as const).map((p) => {
            const active = p === periodic;
            return (
              <button
                key={p}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setPeriodic(p);
                  setPeriodIdx(PERIOD_OPTIONS[p].length - 1); // 전체로 리셋
                }}
                style={{
                  padding: "6px 14px",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: active ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                  background: active ? "var(--bp-primary-500)" : "#fff",
                  color: active ? "#fff" : "var(--color-text-muted)",
                  border: "none",
                  cursor: "pointer",
                  transition: "background var(--transition-fast)",
                }}
              >
                {p === "weekly" ? "주간" : "월간"}
              </button>
            );
          })}
        </div>

        {/* 기간 토글 */}
        <div role="tablist" style={{ display: "inline-flex", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {periods.map((p, i) => {
            const active = i === periodIdx;
            return (
              <button
                key={p.label}
                role="tab"
                aria-selected={active}
                onClick={() => setPeriodIdx(i)}
                style={{
                  padding: "6px 12px",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: active ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                  background: active ? "var(--bp-primary-100)" : "#fff",
                  color: active ? "var(--bp-primary-500)" : "var(--color-text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
              >{p.label}</button>
            );
          })}
        </div>

        {updated && (
          <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            최신: {updated}
          </span>
        )}
      </div>

      {/* 비교 지역 편집 바 */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)" }}>
          비교 지역
        </span>
        {compareRegions.map((cr, i) => (
          <span
            key={cr}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px 3px 10px",
              background: "#fff",
              border: `1.5px solid ${COMPARE_COLORS[i + 1] ?? "#9a9da2"}`,
              borderRadius: "var(--radius-full)",
              fontSize: 11,
              fontWeight: "var(--font-weight-semibold)",
              color: COMPARE_COLORS[i + 1] ?? "var(--color-text)",
            }}
          >
            {cr}
            <button
              type="button"
              onClick={() => setCompareRegions((rs) => rs.filter((r) => r !== cr))}
              aria-label={`${cr} 비교에서 제거`}
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14 }}
            >×</button>
          </span>
        ))}
        {compareRegions.length < 4 && (
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v && v !== region && !compareRegions.includes(v)) {
                setCompareRegions((rs) => [...rs, v]);
              }
            }}
            disabled={regionsState.status !== "success"}
            style={{
              padding: "3px 10px",
              border: "1px dashed var(--bp-primary-500)",
              borderRadius: "var(--radius-full)",
              fontSize: 11,
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--bp-primary-500)",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="">＋ 지역 추가</option>
            {regions
              .filter((r) => r !== region && !compareRegions.includes(r))
              .map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {isCompareMode && (
          <>
            <button
              type="button"
              onClick={() => setCompareRegions([])}
              style={{ padding: "3px 10px", fontSize: 11, color: "var(--color-text-muted)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              전체 해제
            </button>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>
              비교 모드: {selectedType} 라인만 표시
            </span>
          </>
        )}
      </div>

      {/* 4개 지표 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-3)" }} className="kb-indicator-grid">
        {summaryState.status === "loading" && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: "#f8f9fc", borderRadius: 8, padding: 14, height: 96, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
        {summaryState.status === "error" && (
          <div style={{ gridColumn: "1 / -1", padding: 14, background: "#FEF2F2", color: "#DC2626", borderRadius: 8, fontSize: "var(--font-size-sm)" }}>
            지표를 불러오지 못했습니다: {summaryState.message}
          </div>
        )}
        {summaryState.status === "success" && summaryState.data.indicators
          .filter((s) => s.type !== "월세가격지수")
          .map((snap) => (
            <IndicatorCard
              key={snap.type}
              snap={snap}
              active={snap.type === selectedType}
              onSelect={() => setSelectedType(snap.type)}
            />
          ))}
      </div>

      {/* 비교 모드 차트 */}
      {isCompareMode && (
        <div ref={mainChartRef} style={{ background: "#fff", border: "0.5px solid #e4e6ea", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <h3 style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
              {selectedType} · 지역 비교 ({allCompareRegions.length}개)
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {period.label}
              </span>
              <DownloadButton compact={isMobile}
                onClick={() => downloadChartAsJpg(mainChartRef.current, `KB_${selectedType}_비교_${allCompareRegions.join("-")}_${period.label}`)}
              />
            </div>
          </div>

          {compareState.status === "loading" && (
            <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              데이터 로딩 중…
            </div>
          )}
          {compareState.status === "error" && (
            <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626", fontSize: "var(--font-size-sm)" }}>
              {compareState.message}
            </div>
          )}
          {compareState.status === "success" && (
            <ResponsiveContainer width="100%" height={chartH}>
              <LineChart data={compareChartData} margin={{ top: 8, right: rightMargin, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#63666c" }}
                  tickLine={false}
                  interval={xTickInterval(compareChartData.length)}
                  tickFormatter={(v: string) => v.length === 7 ? v.slice(2) : v.slice(2, 7)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#63666c" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => {
                    const idx = parseInt(value.replace("r", ""), 10);
                    return allCompareRegions[idx] ?? value;
                  }}
                />
                {allCompareRegions.map((r, i) => (
                  <Line
                    key={r}
                    type="monotone"
                    dataKey={`r${i}`}
                    stroke={COMPARE_COLORS[i] ?? "#1a1e23"}
                    strokeWidth={i === 0 ? 2.5 : 2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
                {/* 끝점 라벨 */}
                {(() => {
                  const last = compareChartData[compareChartData.length - 1];
                  if (!last) return null;
                  return allCompareRegions.map((r, i) => {
                    const y = last[`r${i}`];
                    if (y == null) return null;
                    return (
                      <ReferenceDot
                        key={r}
                        x={last.date as string}
                        y={y as number}
                        r={3}
                        fill={COMPARE_COLORS[i] ?? "#1a1e23"}
                        stroke="#fff"
                        strokeWidth={1}
                        label={isMobile ? undefined : { value: `← ${r}`, position: "right", fontSize: 10, fontWeight: "bold", fill: COMPARE_COLORS[i] ?? "#1a1e23" }}
                      />
                    );
                  });
                })()}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* 라인 차트 (단일 지역 모드) */}
      {!isCompareMode && (
      <div ref={mainChartRef} style={{ background: "#fff", border: "0.5px solid #e4e6ea", borderRadius: 10, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
            {selectedType} 시계열
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              {region} · {period.label}
            </span>
            <DownloadButton compact={isMobile}
              onClick={() => downloadChartAsJpg(mainChartRef.current, `KB_${selectedType}_${region}_${period.label}`)}
            />
          </div>
        </div>

        {seriesState.status === "loading" && (
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            데이터 로딩 중…
          </div>
        )}
        {seriesState.status === "error" && (
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626", fontSize: "var(--font-size-sm)" }}>
            차트를 불러오지 못했습니다: {seriesState.message}
          </div>
        )}
        {seriesState.status === "success" && isSentiment && (
          <>
            <ResponsiveContainer width="100%" height={chartH}>
              <ComposedChart data={sentimentChartData} margin={{ top: 8, right: rightMargin, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#63666c" }}
                  tickLine={false}
                  interval={xTickInterval(sentimentChartData.length)}
                  tickFormatter={(v: string) => v.length === 7 ? v.slice(2) : v.slice(2, 7)}
                />
                {/* 좌축: 심리지수 + 매도자/매수자 (% 또는 0~200) */}
                <YAxis
                  yAxisId="L"
                  tick={{ fontSize: 10, fill: "#63666c" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "auto"]}
                />
                {/* 우축: 매매가격지수 (KB 인덱스) */}
                <YAxis
                  yAxisId="R"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#1a1e23" }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => {
                    const subs = SENTIMENT_SUB_LABEL[selectedType as "매수우위지수" | "전세수급지수"];
                    return ({
                      sentimentIndex: selectedType,
                      sellers_more: subs.sellers,
                      buyers_more:  subs.buyers,
                      priceIndex:   `${region} 매매가격`,
                    } as Record<string, string>)[value] ?? value;
                  }}
                />

                {/* 막대: 심리지수 (연보라) — 라인 가독성을 위해 투명도 ↓ */}
                <Bar
                  yAxisId="L"
                  dataKey="sentimentIndex"
                  fill="#d8c7ee"
                  fillOpacity={0.4}
                  isAnimationActive={false}
                />
                {/* 매도자 많음 — 빨강 */}
                <Line
                  yAxisId="L"
                  type="monotone"
                  dataKey="sellers_more"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                {/* 매수자 많음 — 파랑 */}
                <Line
                  yAxisId="L"
                  type="monotone"
                  dataKey="buyers_more"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                {/* 매매가격지수 오버레이 — 검정, 우축 */}
                <Line
                  yAxisId="R"
                  type="monotone"
                  dataKey="priceIndex"
                  stroke="#1a1e23"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />

                {/* 끝점 라벨 (화살표 대신 컬러 텍스트) */}
                {(() => {
                  const lastIdx = sentimentChartData.length - 1;
                  if (lastIdx < 0) return null;
                  const last = sentimentChartData[lastIdx];
                  const subs = SENTIMENT_SUB_LABEL[selectedType as "매수우위지수" | "전세수급지수"];
                  const labels = [
                    { y: last.sentimentIndex, color: "#9b6dd1", text: selectedType,        axis: "L" },
                    { y: last.sellers_more,   color: "#DC2626", text: subs.sellers,        axis: "L" },
                    { y: last.buyers_more,    color: "#2563EB", text: subs.buyers,         axis: "L" },
                    { y: last.priceIndex,     color: "#1a1e23", text: `${region} 매매가격`, axis: "R" },
                  ];
                  return labels
                    .filter((l) => l.y != null)
                    .map((l) => (
                      <ReferenceDot
                        key={l.text}
                        x={last.date}
                        y={l.y as number}
                        yAxisId={l.axis}
                        r={3}
                        fill={l.color}
                        stroke="#fff"
                        strokeWidth={1}
                        label={isMobile ? undefined : { value: `← ${l.text}`, position: "right", fontSize: 10, fontWeight: "bold", fill: l.color }}
                      />
                    ));
                })()}
              </ComposedChart>
            </ResponsiveContainer>

            <p style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              연보라 막대 = <strong style={{ color: "#9b6dd1" }}>{selectedType}</strong> ·
              빨강 = <strong style={{ color: "#DC2626" }}>{SENTIMENT_SUB_LABEL[selectedType as "매수우위지수" | "전세수급지수"].sellers}(%)</strong> ·
              파랑 = <strong style={{ color: "#2563EB" }}>{SENTIMENT_SUB_LABEL[selectedType as "매수우위지수" | "전세수급지수"].buyers}(%)</strong> ·
              검정 = <strong style={{ color: "#1a1e23" }}>{region} 매매가격지수(우축)</strong>
            </p>
          </>
        )}

        {seriesState.status === "success" && !isSentiment && (
          <>
            <ResponsiveContainer width="100%" height={priceChartH}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#63666c" }}
                  tickLine={false}
                  interval={xTickInterval(chartData.length)}
                  tickFormatter={(v: string) => v.length === 7 ? v.slice(2) : v.slice(2, 7)}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 10, fill: "#63666c" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => (value === "price" ? selectedType : value)}
                />

                {/* 본 라인 */}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={CHART_COLOR[selectedType]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
      )}

      {/* ============ 매수우위지수 이동평균선 활용법 (심리지수 선택 & 비교모드 아닐 때) ============ */}
      {isSentiment && !isCompareMode && (
      <div ref={maChartRef} style={{ background: "#fff", border: "0.5px solid #e4e6ea", borderRadius: 10, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "var(--space-2)", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
            매수우위지수 이동평균선 (1년 / 3년) — 추세 전환 신호
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              {region} · 풀 히스토리
            </span>
            <DownloadButton compact={isMobile}
              onClick={() => downloadChartAsJpg(maChartRef.current, `KB_매수우위_이평선_${region}`)}
            />
          </div>
        </div>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          단기(1년) 이평선이 장기(3년) 이평선을 <strong style={{ color: "#16A34A" }}>위로 돌파(GC)</strong> = 추세 상승 시작 ·
          <strong style={{ color: "#DC2626" }}> 아래로 돌파(DC)</strong> = 추세 하락 시작.
          매매수급지수는 매매가격의 <strong>선행지표</strong>입니다.
        </p>

        {maSentimentState.status === "loading" && (
          <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            데이터 로딩 중…
          </div>
        )}
        {maSentimentState.status === "error" && (
          <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626", fontSize: "var(--font-size-sm)" }}>
            차트를 불러오지 못했습니다: {maSentimentState.message}
          </div>
        )}
        {maSentimentState.status === "success" && maChartData.points.length > 0 && (
          <ResponsiveContainer width="100%" height={maChartH}>
            <ComposedChart data={maChartData.points} margin={{ top: 8, right: rightMargin, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#63666c" }}
                tickLine={false}
                interval={xTickInterval(maChartData.points.length)}
                tickFormatter={(v: string) => v.slice(2, 7)}
              />
              <YAxis yAxisId="L" tick={{ fontSize: 10, fill: "#63666c" }} tickLine={false} axisLine={false} domain={[0, "auto"]} />
              <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 10, fill: "#1a1e23" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) => ({
                  sentimentIndex: "매수우위지수",
                  shortMA: "단기 1년 이평",
                  longMA: "장기 3년 이평",
                  priceIndex: `${region} 매매가격(우축)`,
                }[value] ?? value)}
              />

              {/* 골든/데드크로스 세로 컬러 밴드 */}
              {maChartData.crosses.map((c) => {
                const idx = maChartData.points.findIndex((p) => p.date === c.date);
                if (idx < 0 || idx + 1 >= maChartData.points.length) return null;
                const next = maChartData.points[idx + 1];
                const isGolden = c.type === "golden";
                return (
                  <ReferenceArea
                    key={`${c.type}-${c.date}`}
                    yAxisId="L"
                    x1={c.date}
                    x2={next.date}
                    fill={isGolden ? "#16A34A" : "#DC2626"}
                    fillOpacity={0.5}
                    stroke="none"
                    label={{
                      value: isGolden ? "골든크로스 → 상승장" : "데드크로스 → 하락장",
                      position: "insideTop",
                      fontSize: 10,
                      fontWeight: "bold",
                      fill: isGolden ? "#16A34A" : "#DC2626",
                    }}
                  />
                );
              })}

              {/* 매수우위지수 막대 */}
              <Bar yAxisId="L" dataKey="sentimentIndex" fill="#d8c7ee" fillOpacity={0.4} isAnimationActive={false} />

              {/* 단기 1년 이평선 — 빨강 */}
              <Line yAxisId="L" type="monotone" dataKey="shortMA" stroke="#DC2626" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />

              {/* 장기 3년 이평선 — 검정 두꺼운 선 */}
              <Line yAxisId="L" type="monotone" dataKey="longMA" stroke="#1a1e23" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />

              {/* 매매가격 오버레이 — 우축, 진한 그린 */}
              <Line yAxisId="R" type="monotone" dataKey="priceIndex" stroke="#06b281" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />

              {/* 끝점 라벨 */}
              {(() => {
                const last = maChartData.points[maChartData.points.length - 1];
                const labels = [
                  { y: last.sentimentIndex, color: "#9b6dd1", text: "매수우위지수", axis: "L" },
                  { y: last.shortMA,        color: "#DC2626", text: "단기(1년)",   axis: "L" },
                  { y: last.longMA,         color: "#1a1e23", text: "장기(3년)",   axis: "L" },
                  { y: last.priceIndex,     color: "#06b281", text: "매매가격",     axis: "R" },
                ];
                return labels
                  .filter((l) => l.y != null)
                  .map((l) => (
                    <ReferenceDot
                      key={l.text}
                      x={last.date}
                      y={l.y as number}
                      yAxisId={l.axis}
                      r={3}
                      fill={l.color}
                      stroke="#fff"
                      strokeWidth={1}
                      label={{ value: `← ${l.text}`, position: "right", fontSize: 10, fontWeight: "bold", fill: l.color }}
                    />
                  ));
              })()}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* 크로스 발생 요약 */}
        {maChartData.crosses.length > 0 && (
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>최근 크로스:</span>
            {maChartData.crosses.slice(-4).reverse().map((c) => (
              <span
                key={`${c.type}-${c.date}-summary`}
                style={{
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  background: c.type === "golden" ? "#e7f8f4" : "#FEF2F2",
                  color: c.type === "golden" ? "#16A34A" : "#DC2626",
                }}
              >
                {c.type === "golden" ? "GC" : "DC"} · {c.date}
              </span>
            ))}
          </div>
        )}
      </div>
      )}

      {/* BM CTA */}
      <div style={{ padding: "var(--space-5) var(--space-6)", background: "#e7f8f4", border: "1px solid #b2ead9", borderRadius: "var(--radius-xl)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <p style={{ margin: 0, fontWeight: "var(--font-weight-bold)", color: "#18997d" }}>KB 데이터 기반 AI 시황 분석</p>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--font-size-xs)", color: "#18997d", opacity: 0.8 }}>
            골든크로스 이후 매수 타이밍, AI가 분석해드립니다
          </p>
        </div>
        <button
          onClick={() => console.log("[Tab2 CTA] KB AI 시황 분석 클릭", { region, period: period.label })}
          style={{ padding: "var(--space-3) var(--space-6)", background: "#18997d", color: "#fff", border: "none", borderRadius: "var(--radius-full)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", cursor: "pointer", whiteSpace: "nowrap", transition: "background var(--transition-fast)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#147a64"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#18997d"; }}
        >
          AI 시황 분석 받기 →
        </button>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .kb-indicator-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 767px) {
          section .recharts-legend-wrapper { padding-top: 4px !important; }
          section .recharts-default-legend { font-size: 10px !important; }
        }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>
    </section>
  );
}
