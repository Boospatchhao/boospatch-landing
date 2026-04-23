"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ============================================================
   Types
   ============================================================ */
interface SearchResult {
  id: number;
  name: string;
  sido: string;
  sigungu: string;
  address: string | null;
  household_count: number | null;
  approve_year: number | null;
  supply_pyeong: number;
  price_per_pyeong: number | null;
  recent_price: number | null;
  jeonse_ratio: number | null;
  nationwide_percentile: number | null;
  location_score: number | null;
  is_brand: number;
  is_large: number;
  is_new: number;
  is_station: number;
}

interface PyeongRow {
  supply_pyeong: number;
  price_per_pyeong: number | null;
  recent_price: number | null;
  jeonse_price: number | null;
  jeonse_ratio: number | null;
  highest_price: number | null;
  hoga_price: number | null;
  nationwide_percentile: number | null;
  cagr: number | null;
}

interface DanjiDetail extends SearchResult {
  builder: string | null;
  parking_per_hh: number | null;
  emd: string | null;
  commute_gangnam: number | null;
  commute_yeouido: number | null;
  commute_gwanghwamun: number | null;
  has_subway: number;
  has_parking: number;
  school_district_score: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface MonthlyPrice {
  yyyy_mm: string;
  avg_price: number;
  supply_pyeong: number;
  is_byg?: number;  // 0=실거래, 1=분양권
}

interface CouplingCandidate extends SearchResult {
  correlation: number | null;
}

interface SelectedDanji {
  detail: DanjiDetail;
  pyeongs: PyeongRow[];
  selectedPyeong: number;
  series: MonthlyPrice[];
}

/* ============================================================
   Colours for up to 3 complexes
   ============================================================ */
const COLORS = ["#1A56DB", "#F97316", "#06b281"] as const;
const COLOR_LABELS = ["A", "B", "C"] as const;

/* ============================================================
   Helpers
   ============================================================ */
function fmtPrice(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

function fmtPct(v: number | null | undefined, suffix = "%"): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}${suffix}`;
}

function fmtScore(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(1);
}

function fmtPercentile(v: number | null | undefined): string {
  if (v == null) return "—";
  return `상위 ${(100 - v).toFixed(0)}%`;
}

/* ============================================================
   Sub-components
   ============================================================ */
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 600,
        padding: "1px 5px",
        borderRadius: 4,
        background: `${color}22`,
        color,
        marginRight: 3,
      }}
    >
      {label}
    </span>
  );
}

function DanjiChip({
  danji,
  color,
  onRemove,
}: {
  danji: SelectedDanji;
  color: string;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: `${color}11`,
        border: `1.5px solid ${color}44`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 13,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: color,
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {COLOR_LABELS[COLORS.indexOf(color as typeof COLORS[number])]}
      </span>
      <span style={{ fontWeight: 600, color: "var(--bp-gray-900)" }}>
        {danji.detail.name}
      </span>
      <span style={{ color: "var(--bp-gray-500)", fontSize: 11 }}>
        {danji.detail.sido?.replace("특별시","").replace("광역시","").replace("특별자치시","").replace("특별자치도","").replace("도","").replace("특별","")}{" "}
        {danji.detail.sigungu}
      </span>
      <button
        onClick={onRemove}
        aria-label="제거"
        style={{
          marginLeft: "auto",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--bp-gray-400)",
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ============================================================
   Search box + results panel
   ============================================================ */
function DanjiSearch({
  onSelect,
  disabled,
  placeholder,
}: {
  onSelect: (r: SearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/danji/search?q=${encodeURIComponent(q)}&limit=20`)
      .then((r) => r.json())
      .then((d: { results: SearchResult[] }) => setResults(d.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 180);
  };

  const handleSelect = (r: SearchResult) => {
    onSelect(r);
    setQuery("");
    setResults([]);
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: disabled ? "var(--bp-gray-100)" : "#fff",
          border: "1.5px solid var(--bp-gray-300)",
          borderRadius: 8,
          padding: "8px 12px",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bp-gray-400)" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder ?? "단지명 검색 (예: 래미안, 반포)"}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 14,
            background: "transparent",
            color: "var(--bp-gray-900)",
          }}
        />
        {loading && (
          <span style={{ fontSize: 11, color: "var(--bp-gray-400)" }}>검색중…</span>
        )}
      </div>

      {results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid var(--bp-gray-200)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            zIndex: 50,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {results.map((r) => (
            <button
              key={`${r.id}-${r.supply_pyeong}`}
              onClick={() => handleSelect(r)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--bp-gray-100)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bp-gray-50)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--bp-gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--bp-gray-500)", marginTop: 2 }}>
                  {r.sido} {r.sigungu} · {r.household_count?.toLocaleString()}세대 · {r.approve_year}년
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--bp-red-500)" }}>
                  {fmtPrice(r.recent_price)}
                </div>
                <div style={{ fontSize: 10, color: "var(--bp-gray-400)" }}>
                  {r.supply_pyeong}평
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Detail card (Phase 1 — shows after clicking search result)
   ============================================================ */
function DetailCard({
  danji,
  color,
  onFindCoupling,
  couplingLoading,
}: {
  danji: SelectedDanji;
  color: string;
  onFindCoupling: (id: number, pyeong: number) => void;
  couplingLoading: boolean;
}) {
  const d = danji.detail;
  const p = danji.pyeongs.find((row) => row.supply_pyeong === danji.selectedPyeong) ?? danji.pyeongs[0];

  const flags: string[] = [];
  if (d.is_brand)   flags.push("브랜드");
  if (d.is_large)   flags.push("대단지");
  if (d.is_new)     flags.push("신축");
  if (d.is_station) flags.push("역세권");
  if (d.has_parking) flags.push("주차");

  return (
    <div
      style={{
        border: `2px solid ${color}55`,
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ background: `${color}11`, padding: "12px 16px", borderBottom: `1px solid ${color}22` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              width: 22, height: 22, borderRadius: "50%", background: color,
              color: "#fff", fontSize: 11, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {COLOR_LABELS[COLORS.indexOf(color as typeof COLORS[number])]}
          </span>
          <span style={{ fontWeight: 800, fontSize: 17, color: "var(--bp-gray-900)" }}>{d.name}</span>
          {flags.map((f) => (
            <Badge key={f} label={f} color={color} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--bp-gray-500)", marginTop: 4 }}>
          · {d.household_count?.toLocaleString()}세대 · {d.approve_year}년 · {d.builder ?? ""}
        </div>
      </div>

      {/* Price grid — 글자 크기 ↑ */}
      <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 8px" }}>
        {[
          { label: "실거래가", val: fmtPrice(p?.recent_price) },
          { label: "평당가", val: p?.price_per_pyeong ? `${(p.price_per_pyeong / 100).toFixed(0)}만/평` : "—" },
          { label: "전세가율", val: p?.jeonse_ratio != null ? `${p.jeonse_ratio}%` : "—" },
          { label: "전국 분위", val: fmtPercentile(p?.nationwide_percentile) },
          { label: "최고가", val: fmtPrice(p?.highest_price) },
          { label: "CAGR", val: p?.cagr != null ? `${(p.cagr * 100).toFixed(1)}%` : "—" },
        ].map(({ label, val }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--bp-gray-500)", fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--bp-gray-900)", marginTop: 3 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Location scores — 7개 배너 (종합/학군/교통/상권/자연환경/일자리/학원가) */}
      <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--bp-gray-100)", paddingTop: 12, flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--bp-gray-400)", fontWeight: 600, marginBottom: 8 }}>입지점수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[
            { label: "종합",     val: fmtScore(d.location_score) },
            { label: "학군",     val: fmtScore(d.school_district_score) },
            { label: "교통",     val: fmtScore(d.transport_score_loc) },
            { label: "상권",     val: fmtScore(d.commercial_score) },
            { label: "자연환경", val: d.park_score != null ? String(d.park_score) : "—" },
            { label: "일자리",   val: fmtScore(d.job_score) },
            { label: "학원가",   val: d.academy_score != null ? String(d.academy_score) : "—" },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: "var(--bp-gray-50)", borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--bp-gray-500)", fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--bp-gray-900)", marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Coupling CTA */}
      <div style={{ padding: "0 16px 14px" }}>
        <button
          onClick={() => onFindCoupling(d.id, danji.selectedPyeong)}
          disabled={couplingLoading}
          style={{
            width: "100%",
            padding: "9px",
            background: couplingLoading ? "var(--bp-gray-100)" : "var(--bp-primary-100)",
            color: couplingLoading ? "var(--bp-gray-400)" : "var(--bp-primary-500)",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: couplingLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { if (!couplingLoading) e.currentTarget.style.background = "var(--bp-green-100)"; }}
          onMouseLeave={(e) => { if (!couplingLoading) e.currentTarget.style.background = "var(--bp-primary-100)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {couplingLoading ? "커플링 단지 탐색 중…" : "커플링 단지 비교하기"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Coupling list panel
   ============================================================ */
function CouplingPanel({
  candidates,
  selected,
  onAdd,
  onRemove,
  maxReached,
}: {
  candidates: CouplingCandidate[];
  selected: number[];
  onAdd: (c: CouplingCandidate) => void;
  onRemove: (id: number) => void;
  maxReached: boolean;
}) {
  return (
    <div
      style={{
        border: "1.5px solid var(--bp-gray-200)",
        borderRadius: 12,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bp-gray-100)", background: "var(--bp-gray-50)" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--bp-gray-900)" }}>
          커플링 단지 <span style={{ color: "var(--bp-gray-400)", fontWeight: 400, fontSize: 12 }}>(가격 유사도 + 상관계수 순)</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--bp-gray-500)", marginTop: 2 }}>
          추가할 단지를 선택하세요 (최대 2개)
        </div>
      </div>

      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {candidates.map((c, idx) => {
          const isAdded = selected.includes(c.id);
          return (
            <div
              key={`${c.id}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderBottom: "1px solid var(--bp-gray-100)",
                background: isAdded ? "var(--bp-green-50)" : undefined,
                opacity: maxReached && !isAdded ? 0.45 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--bp-gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--bp-gray-500)", marginTop: 1 }}>
                  {c.sido} {c.sigungu} · {c.supply_pyeong}평 · {c.household_count?.toLocaleString()}세대
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginRight: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--bp-red-500)" }}>
                  {fmtPrice(c.recent_price)}
                </div>
                {c.correlation != null && (
                  <div style={{ fontSize: 10, color: "var(--bp-gray-400)" }}>
                    상관계수 {c.correlation.toFixed(2)}
                  </div>
                )}
              </div>
              <button
                onClick={() => isAdded ? onRemove(c.id) : (!maxReached && onAdd(c))}
                disabled={!isAdded && maxReached}
                style={{
                  flexShrink: 0,
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: isAdded ? "1.5px solid var(--bp-red-500)" : "1.5px solid var(--bp-gray-300)",
                  background: isAdded ? "var(--bp-red-50)" : "#fff",
                  color: isAdded ? "var(--bp-red-500)" : "var(--bp-gray-600)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: !isAdded && maxReached ? "default" : "pointer",
                  transition: "all 0.12s",
                }}
              >
                {isAdded ? "해제" : "+ 추가"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Comparison table
   ============================================================ */
function CompareTable({ danjiList }: { danjiList: SelectedDanji[] }) {
  const rows: Array<{ label: string; vals: string[] }> = [
    { label: "실거래가", vals: danjiList.map((d) => fmtPrice(d.pyeongs.find((p) => p.supply_pyeong === d.selectedPyeong)?.recent_price)) },
    { label: "평당가", vals: danjiList.map((d) => { const p = d.pyeongs.find((row) => row.supply_pyeong === d.selectedPyeong); return p?.price_per_pyeong ? `${(p.price_per_pyeong / 100).toFixed(0)}만` : "—"; }) },
    { label: "전세가율", vals: danjiList.map((d) => { const p = d.pyeongs.find((row) => row.supply_pyeong === d.selectedPyeong); return p?.jeonse_ratio != null ? `${p.jeonse_ratio}%` : "—"; }) },
    { label: "최고가", vals: danjiList.map((d) => fmtPrice(d.pyeongs.find((p) => p.supply_pyeong === d.selectedPyeong)?.highest_price)) },
    { label: "CAGR", vals: danjiList.map((d) => { const p = d.pyeongs.find((row) => row.supply_pyeong === d.selectedPyeong); return p?.cagr != null ? `${(p.cagr * 100).toFixed(1)}%` : "—"; }) },
    { label: "전국 분위", vals: danjiList.map((d) => fmtPercentile(d.pyeongs.find((p) => p.supply_pyeong === d.selectedPyeong)?.nationwide_percentile)) },
    { label: "세대수", vals: danjiList.map((d) => d.detail.household_count?.toLocaleString() ?? "—") },
    { label: "준공연도", vals: danjiList.map((d) => d.detail.approve_year?.toString() ?? "—") },
    { label: "입지종합", vals: danjiList.map((d) => fmtScore(d.detail.location_score)) },
    { label: "학군점수", vals: danjiList.map((d) => fmtScore(d.detail.school_district_score)) },
    { label: "강남출퇴근", vals: danjiList.map((d) => d.detail.commute_gangnam != null ? `${d.detail.commute_gangnam}분` : "—") },
    { label: "여의도출퇴근", vals: danjiList.map((d) => d.detail.commute_yeouido != null ? `${d.detail.commute_yeouido}분` : "—") },
    { label: "특징", vals: danjiList.map((d) => [d.detail.is_brand && "브랜드", d.detail.is_large && "대단지", d.detail.is_new && "신축", d.detail.is_station && "역세권"].filter(Boolean).join(" · ") || "—") },
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--bp-gray-200)" }}>
            <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--bp-gray-500)", fontWeight: 600, fontSize: 12, width: 100 }}>항목</th>
            {danjiList.map((d, i) => (
              <th key={d.detail.id} style={{ padding: "8px 12px", textAlign: "center", color: COLORS[i], fontWeight: 700 }}>
                <div>{d.detail.name}</div>
                <div style={{ fontWeight: 400, fontSize: 10, color: "var(--bp-gray-500)" }}>{d.selectedPyeong}평</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={row.label}
              style={{ borderBottom: "1px solid var(--bp-gray-100)", background: ri % 2 === 0 ? "var(--bp-gray-50)" : "#fff" }}
            >
              <td style={{ padding: "8px 12px", color: "var(--bp-gray-500)", fontWeight: 500, fontSize: 12 }}>{row.label}</td>
              {row.vals.map((v, i) => (
                <td key={i} style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "var(--bp-gray-900)" }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   Period presets
   ============================================================ */
const PERIOD_PRESETS = [
  { label: "1년",  months: 12 },
  { label: "3년",  months: 36 },
  { label: "5년",  months: 60 },
  { label: "10년", months: 120 },
  { label: "전체", months: 0 },
] as const;

/* ============================================================
   Price chart
   ============================================================ */
function PriceChart({ danjiList }: { danjiList: SelectedDanji[] }) {
  // 기간 프리셋 (기본: 5년)
  const [activePeriod, setActivePeriod] = useState<number>(60);

  // 선택된 평형 기준으로 각 단지의 시계열 추출 (±5평), 실거래/분양권 분리
  const { realSeries, bygSeries } = useMemo(() => {
    const real: MonthlyPrice[][] = [];
    const byg:  MonthlyPrice[][] = [];
    for (const d of danjiList) {
      const pyeongOk = (s: MonthlyPrice) => Math.abs(s.supply_pyeong - d.selectedPyeong) <= 5;
      real.push(d.series.filter((s) => pyeongOk(s) && (s.is_byg ?? 0) === 0));
      byg.push(d.series.filter((s)  => pyeongOk(s) && (s.is_byg ?? 0) === 1));
    }
    return { realSeries: real, bygSeries: byg };
  }, [danjiList]);

  // 분양권 데이터가 존재하는 단지 인덱스
  const hasByg = bygSeries.map((s) => s.length > 0);

  // 전체 월 집합 (오름차순)
  const allMonths = useMemo(
    () =>
      Array.from(new Set([
        ...realSeries.flatMap((s) => s.map((r) => r.yyyy_mm)),
        ...bygSeries.flatMap((s) => s.map((r) => r.yyyy_mm)),
      ])).sort(),
    [realSeries, bygSeries]
  );

  const chartData = useMemo(
    () =>
      allMonths.map((m) => {
        const point: Record<string, unknown> = { month: m };
        realSeries.forEach((series, i) => {
          const match = series.find((s) => s.yyyy_mm === m);
          point[`price_${i}`] = match ? Math.round(match.avg_price / 1000) / 10 : null;
        });
        bygSeries.forEach((series, i) => {
          const match = series.find((s) => s.yyyy_mm === m);
          point[`byg_${i}`] = match ? Math.round(match.avg_price / 1000) / 10 : null;
        });
        return point;
      }),
    [allMonths, realSeries, bygSeries]
  );

  const total = chartData.length;

  // 프리셋에 따라 chartData 직접 슬라이스 (Brush 의존 제거)
  const sliceStart = activePeriod === 0 ? 0 : Math.max(0, total - activePeriod);
  const visibleData = useMemo(() => chartData.slice(sliceStart), [chartData, sliceStart]);

  const handlePreset = (months: number) => setActivePeriod(months);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 기간 프리셋 버튼 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {PERIOD_PRESETS.map((p) => {
          const isActive = activePeriod === p.months;
          return (
            <button
              key={p.label}
              onClick={() => handlePreset(p.months)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                border: `1.5px solid ${isActive ? "var(--bp-primary)" : "var(--bp-gray-200)"}`,
                background: isActive ? "var(--bp-primary-100)" : "#fff",
                color: isActive ? "var(--bp-primary-500)" : "var(--bp-gray-600)",
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {p.label}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--bp-gray-400)", alignSelf: "center" }}>
          {visibleData[0]?.month?.slice(0, 7) ?? ""} ~ {visibleData[visibleData.length - 1]?.month?.slice(0, 7) ?? ""}
        </span>
      </div>

      {/* 차트 — 부모 높이에 맞춤 */}
      <div style={{ flex: 1, minHeight: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={visibleData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bp-gray-100)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "var(--bp-gray-500)" }}
            tickFormatter={(v: string) => v.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--bp-gray-500)" }}
            tickFormatter={(v: number) => `${v.toFixed(0)}억`}
            width={44}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => {
              const idx = Number(String(name).split("_")[1]);
              return [`${Number(value).toFixed(1)}억`, danjiList[idx]?.detail.name ?? name];
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(l: any) => String(l)}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-sans)", paddingTop: 4 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(_: any, entry: any) => {
              const dk = String(entry?.dataKey ?? "");
              const isByg = dk.startsWith("byg_");
              const idx = Number(dk.split("_")[1]);
              const name = danjiList[idx]?.detail.name ?? dk;
              return isByg ? `${name} (분양권)` : name;
            }}
          />
          {/* 분양권 — 회색 점선 (실거래 뒤에 깔리도록 먼저 렌더) */}
          {danjiList.map((_, i) =>
            hasByg[i] ? (
              <Line
                key={`byg-${i}`}
                type="monotone"
                dataKey={`byg_${i}`}
                stroke="#CBD5E1"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null
          )}
          {/* 실거래 — 컬러 실선 */}
          {danjiList.map((_, i) => (
            <Line
              key={`real-${i}`}
              type="monotone"
              dataKey={`price_${i}`}
              stroke={COLORS[i]}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ============================================================
   Main Tab
   ============================================================ */
export default function TabCompare() {
  // Search / detail state
  const [danjiList, setDanjiList] = useState<SelectedDanji[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Coupling state
  const [couplingBase, setCouplingBase] = useState<{ id: number; pyeong: number } | null>(null);
  const [couplingLoading, setCouplingLoading] = useState(false);
  const [couplingCandidates, setCouplingCandidates] = useState<CouplingCandidate[]>([]);

  const maxReached = danjiList.length >= 3;

  /* --- 평형갭 탭에서 넘어온 단지 자동 로드 --- */
  const loadDanjiById = useCallback(async (id: number) => {
    const res = await fetch(`/api/danji/${id}`).then((x) => x.json());
    const { detail, pyeongs, monthlyPrices } = res as {
      detail: DanjiDetail; pyeongs: PyeongRow[]; monthlyPrices: MonthlyPrice[];
    };
    setDanjiList((prev) => {
      if (prev.some((d) => d.detail.id === id)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, { detail, pyeongs, selectedPyeong: pyeongs[0]?.supply_pyeong ?? 0, series: monthlyPrices }];
    });
  }, []);

  useEffect(() => {
    const preId = sessionStorage.getItem("preloadDanjiId");
    if (preId) {
      sessionStorage.removeItem("preloadDanjiId");
      loadDanjiById(Number(preId)).catch(() => {});
    }
  }, [loadDanjiById]);

  /* --- Load detail + series on search result select --- */
  const loadDanji = useCallback(async (r: SearchResult) => {
    if (danjiList.some((d) => d.detail.id === r.id)) return; // already added
    if (maxReached) return;
    setLoadingId(r.id);
    try {
      const detailRes = await fetch(`/api/danji/${r.id}`).then((x) => x.json());
      const { detail, pyeongs, monthlyPrices } = detailRes as {
        detail: DanjiDetail;
        pyeongs: PyeongRow[];
        monthlyPrices: MonthlyPrice[];
      };
      setDanjiList((prev) => [
        ...prev,
        {
          detail,
          pyeongs,
          selectedPyeong: pyeongs[0]?.supply_pyeong ?? 0,
          series: monthlyPrices,
        },
      ]);
    } finally {
      setLoadingId(null);
    }
  }, [danjiList, maxReached]);

  /* --- Load coupling candidates --- */
  const findCoupling = useCallback(async (id: number, pyeong: number) => {
    setCouplingBase({ id, pyeong });
    setCouplingLoading(true);
    setCouplingCandidates([]);
    try {
      const res = await fetch(`/api/danji/${id}/coupling?pyeong=${pyeong}&limit=20`);
      const data = await res.json() as { candidates: CouplingCandidate[] };
      setCouplingCandidates(data.candidates ?? []);
    } finally {
      setCouplingLoading(false);
    }
  }, []);

  /* --- Add coupling candidate to compare list --- */
  const addCouplingDanji = useCallback(async (c: CouplingCandidate) => {
    if (danjiList.some((d) => d.detail.id === c.id)) return;
    if (maxReached) return;
    setLoadingId(c.id);
    try {
      const res = await fetch(`/api/danji/${c.id}`);
      const { detail, pyeongs, monthlyPrices } = await res.json() as {
        detail: DanjiDetail;
        pyeongs: PyeongRow[];
        monthlyPrices: MonthlyPrice[];
      };
      setDanjiList((prev) => [
        ...prev,
        {
          detail,
          pyeongs,
          selectedPyeong: pyeongs[0]?.supply_pyeong ?? 0,
          series: monthlyPrices,
        },
      ]);
    } finally {
      setLoadingId(null);
    }
  }, [danjiList, maxReached]);

  /* --- Remove --- */
  const removeDanji = useCallback((id: number) => {
    setDanjiList((prev) => prev.filter((d) => d.detail.id !== id));
    if (couplingBase?.id === id) {
      setCouplingBase(null);
      setCouplingCandidates([]);
    }
  }, [couplingBase]);

  /* --- Pyeong change --- */
  const changePyeong = useCallback((id: number, pyeong: number) => {
    setDanjiList((prev) =>
      prev.map((d) => d.detail.id === id ? { ...d, selectedPyeong: pyeong } : d)
    );
  }, []);

  const showComparison = danjiList.length >= 2;
  const selectedIds = danjiList.map((d) => d.detail.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
      {/* ── Header ── */}
      <div>
        <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", color: "var(--bp-gray-900)", margin: 0 }}>
          단지 비교
        </h2>
        <p style={{ fontSize: 13, color: "var(--bp-gray-500)", marginTop: 4 }}>
          단지를 검색하고, 커플링 단지를 추가해 가격 추이와 입지를 나란히 비교하세요.
        </p>
      </div>

      {/* ── Selected chips ── */}
      {danjiList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {danjiList.map((d, i) => (
            <DanjiChip
              key={d.detail.id}
              danji={d}
              color={COLORS[i]}
              onRemove={() => removeDanji(d.detail.id)}
            />
          ))}
        </div>
      )}

      {/* ── Search bar ── */}
      {!maxReached && (
        <div>
          <DanjiSearch
            onSelect={loadDanji}
            disabled={loadingId !== null}
            placeholder={
              danjiList.length === 0
                ? "기준 단지 검색 (예: 래미안, 반포)"
                : "비교 단지 직접 검색"
            }
          />
          {loadingId !== null && (
            <div style={{ fontSize: 11, color: "var(--bp-gray-400)", marginTop: 4 }}>
              단지 정보 불러오는 중…
            </div>
          )}
        </div>
      )}

      {/* ── Detail cards ── */}
      {danjiList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(danjiList.length, 3)}, 1fr)`,
            gap: "var(--space-4)",
            alignItems: "stretch",
          }}
        >
          {danjiList.map((d, i) => (
            <div key={d.detail.id} style={{ display: "flex", flexDirection: "column" }}>
              {/* Pyeong selector (항상 영역 확보 → 높이 정렬) */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", minHeight: 32 }}>
                {d.pyeongs.map((p) => (
                  <button
                    key={p.supply_pyeong}
                    onClick={() => d.pyeongs.length > 1 && changePyeong(d.detail.id, p.supply_pyeong)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 20,
                      border: `1.5px solid ${d.selectedPyeong === p.supply_pyeong ? COLORS[i] : "var(--bp-gray-200)"}`,
                      background: d.selectedPyeong === p.supply_pyeong ? `${COLORS[i]}11` : "#fff",
                      color: d.selectedPyeong === p.supply_pyeong ? COLORS[i] : "var(--bp-gray-600)",
                      fontSize: 12,
                      fontWeight: d.selectedPyeong === p.supply_pyeong ? 700 : 400,
                      cursor: d.pyeongs.length > 1 ? "pointer" : "default",
                    }}
                  >
                    {p.supply_pyeong}평
                  </button>
                ))}
              </div>
              <DetailCard
                danji={d}
                color={COLORS[i]}
                onFindCoupling={findCoupling}
                couplingLoading={couplingLoading && couplingBase?.id === d.detail.id}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Coupling + Chart (좌우 배치) ── */}
      {(couplingCandidates.length > 0 || couplingLoading || showComparison) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: couplingCandidates.length > 0 && showComparison ? "1fr 1fr" : "1fr",
            gap: 16,
            alignItems: "stretch",
          }}
          className="coupling-chart-grid"
        >
          {/* 좌: 커플링 패널 */}
          {couplingCandidates.length > 0 && (
            <CouplingPanel
              candidates={couplingCandidates}
              selected={selectedIds}
              onAdd={addCouplingDanji}
              onRemove={removeDanji}
              maxReached={maxReached}
            />
          )}
          {couplingLoading && !showComparison && (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--bp-gray-400)", padding: "var(--space-6)" }}>
              커플링 단지 탐색 중…
            </div>
          )}

          {/* 우: 차트 — 좌측과 높이 동일하게 stretch */}
          {showComparison && (
            <div
              style={{
                background: "#fff",
                border: "1.5px solid var(--bp-gray-200)",
                borderRadius: 12,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--bp-gray-900)", marginBottom: 12 }}>
                실거래가 추이 (월평균, 억원)
              </div>
              <PriceChart danjiList={danjiList} />
            </div>
          )}
        </div>
      )}

      {/* ── Compare table (풀 폭) ── */}
      {showComparison && (
        <div
          style={{
            background: "#fff",
            border: "1.5px solid var(--bp-gray-200)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bp-gray-100)", background: "var(--bp-gray-50)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--bp-gray-900)" }}>단지 비교표</div>
          </div>
          <CompareTable danjiList={danjiList} />
        </div>
      )}

      {/* ── Empty state ── */}
      {danjiList.length === 0 && (
        <div
          style={{
            padding: "clamp(32px, 10vw, 64px) var(--space-4)",
            textAlign: "center",
            color: "var(--color-text-muted)",
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-xl)",
            border: "1.5px dashed var(--color-border)",
          }}
        >
          <svg
            width="48" height="48" viewBox="0 0 48 48" fill="none"
            aria-hidden style={{ opacity: 0.3, marginBottom: "var(--space-3)" }}
          >
            <rect x="6" y="10" width="14" height="28" rx="2" stroke="var(--color-primary)" strokeWidth="2.5" />
            <rect x="28" y="6" width="14" height="32" rx="2" stroke="var(--color-primary)" strokeWidth="2.5" />
            <path d="M13 20h4M13 26h4M35 14h4M35 22h4M35 30h4" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p style={{ margin: 0, fontSize: "var(--font-size-sm)" }}>
            위 검색창에서 기준 단지를 검색해보세요.
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .coupling-chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
