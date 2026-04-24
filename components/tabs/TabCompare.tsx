"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import NaverMap, { type MapPin } from "@/components/NaverMap";

/* ============================================================
   Design tokens (디자인 시스템 매핑)
   ============================================================ */
const C = {
  primary:  "#06b281",
  primary2: "#18997d",
  primaryS: "#e7f8f4",
  red:      "#ec432c",
  redS:     "#fdecea",
  purple:   "#8d63e9",
  purpleS:  "#f3eefc",
  purpleBg: "#faf7ff",
  blue:     "#0b66e4",
  blueS:    "#e7f0fc",
  fg1:      "#1a1e23",
  fg2:      "#31353a",
  fg3:      "#494d52",
  fg4:      "#63666c",
  fg5:      "#7e8186",
  fg6:      "#9a9da2",
  bg:       "#f8f9fc",
  bgMuted:  "#f0f2f6",
  border1:  "#e4e6ea",
  border2:  "#f0f2f6",
};

/* Up to 5 comparison colors (design palette) */
const COMPARE_COLORS = ["#ec432c", "#0b66e4", "#8d63e9", "#F97316", "#18997d"] as const;
const PRIMARY_COLOR  = C.primary;

/* ============================================================
   API types
   ============================================================ */
interface SearchResult {
  id: number; name: string; sido: string; sigungu: string;
  address: string | null;
  household_count: number | null; approve_year: number | null;
  supply_pyeong: number;
  price_per_pyeong: number | null; recent_price: number | null;
  jeonse_ratio: number | null; nationwide_percentile: number | null;
  location_score: number | null;
  is_brand: number; is_large: number; is_new: number; is_station: number;
}

interface PyeongRow {
  supply_pyeong: number;
  price_per_pyeong: number | null; recent_price: number | null;
  jeonse_price: number | null; jeonse_ratio: number | null;
  highest_price: number | null; hoga_price: number | null;
  nationwide_percentile: number | null; cagr: number | null;
}

interface DanjiDetail {
  id: number; name: string;
  sido: string; sigungu: string; emd: string | null; address: string | null;
  household_count: number | null; approve_year: number | null; approve_ymd: string | null;
  builder: string | null; parking_per_hh: number | null;
  supply_pyeong: number;
  price_per_pyeong: number | null; recent_price: number | null;
  jeonse_price: number | null; jeonse_ratio: number | null;
  highest_price: number | null; cagr: number | null;
  nationwide_percentile: number | null;
  // 입지 종합/세부 점수
  location_score: number | null; school_district_score: number | null;
  transport_score_loc: number | null; academy_score: number | null;
  job_score: number | null; commercial_score: number | null;
  park_score: number | null;
  // 교통 상세
  commute_gangnam: number | null; commute_yeouido: number | null; commute_gwanghwamun: number | null;
  station_proximity_score: number | null; transport_score_raw: number | null;
  // 상품성 플래그
  is_brand: number; is_large: number; is_new: number; is_station: number;
  has_subway: number; has_parking: number; has_elem_school: number;
  latitude: number | null; longitude: number | null;
}

interface MonthlyPrice { yyyy_mm: string; avg_price: number; supply_pyeong: number; }

interface CouplingCandidate extends SearchResult {
  correlation: number | null;
  jeonse_price: number | null;
  latitude: number | null; longitude: number | null;
}

interface LoadedDanji {
  detail: DanjiDetail;
  pyeongs: PyeongRow[];
  series: MonthlyPrice[];
  selectedPyeong: number;
}

/* ============================================================
   Utilities
   ============================================================ */
function fmtKRW(v: number | null | undefined): string {
  if (v == null) return "—";
  const 억 = Math.floor(v / 10000);
  const 만 = v % 10000;
  if (억 === 0) return `${만.toLocaleString()}만`;
  if (만 === 0) return `${억}억`;
  return `${억}억 ${만.toLocaleString()}만`;
}

function fmtKRWShort(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${Math.round(v / 1000)}천만`;
}

function shortSido(s: string): string {
  const M: Record<string, string> = {
    "서울특별시":"서울","경기도":"경기","인천광역시":"인천","부산광역시":"부산",
    "대구광역시":"대구","대전광역시":"대전","광주광역시":"광주","울산광역시":"울산",
    "세종특별자치시":"세종","강원특별자치도":"강원","강원도":"강원",
    "충청북도":"충북","충청남도":"충남","전라북도":"전북","전북특별자치도":"전북",
    "전라남도":"전남","경상북도":"경북","경상남도":"경남","제주특별자치도":"제주",
  };
  return M[s] ?? s;
}

function formatYyyyMm(s: string): string {
  // "2026-04" → "26.04"
  if (!s || s.length < 7) return s;
  return `${s.slice(2, 4)}.${s.slice(5, 7)}`;
}

/** Pull a 1-year delta % from monthlyPrices (most recent − 12 months ago). */
function compute1YDelta(series: MonthlyPrice[], pyeong: number): number | null {
  const filtered = series.filter((s) => Math.abs(s.supply_pyeong - pyeong) <= 5)
    .sort((a, b) => a.yyyy_mm.localeCompare(b.yyyy_mm));
  if (filtered.length < 13) return null;
  const latest = filtered[filtered.length - 1];
  const yearAgo = filtered[filtered.length - 13];
  if (!latest || !yearAgo || !yearAgo.avg_price) return null;
  return Math.round(((latest.avg_price - yearAgo.avg_price) / yearAgo.avg_price) * 1000) / 10;
}

/** Convert monthly series (filtered by pyeong) to year-bin averages for chart use. */
function toYearlyPoints(series: MonthlyPrice[], pyeong: number): { yyyy: number; avg: number }[] {
  const filtered = series.filter((s) => Math.abs(s.supply_pyeong - pyeong) <= 5);
  const byYear = new Map<number, { sum: number; n: number }>();
  for (const r of filtered) {
    const y = Number(r.yyyy_mm.slice(0, 4));
    if (!y) continue;
    const e = byYear.get(y) ?? { sum: 0, n: 0 };
    e.sum += r.avg_price; e.n += 1;
    byYear.set(y, e);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, e]) => ({ yyyy: y, avg: e.sum / e.n / 10000 })); // 억 단위
}

/* ============================================================
   🎨 AreaTrendChart — 기준단지 미니/풀 트렌드
   (평균선 위 빨강 / 아래 초록 + 현재가 다크 배지)
   ============================================================ */
function AreaTrendChart({
  series,
  pyeong,
  priceDate,
  width = 720,
  height = 180,
  compact = false,
}: {
  series: MonthlyPrice[];
  pyeong: number;
  priceDate?: string;
  width?: number;
  height?: number;
  compact?: boolean;
}) {
  const pts = useMemo(() => toYearlyPoints(series, pyeong), [series, pyeong]);
  if (pts.length < 2) {
    return (
      <div style={{
        width: "100%", height, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 12, color: C.fg6,
      }}>시세 데이터 없음</div>
    );
  }
  const p = { t: 24, r: 16, b: 30, l: 16 };
  const innerW = width - p.l - p.r;
  const innerH = height - p.t - p.b;
  const vals = pts.map((d) => d.avg);
  const min = Math.min(...vals) * 0.9;
  const max = Math.max(...vals) * 1.05;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const N = pts.length;
  const xFor = (i: number) => p.l + (innerW * i) / (N - 1);
  const yFor = (v: number) => p.t + innerH * (1 - (v - min) / (max - min || 1));
  const yAvg = yFor(avg);
  const linePath = pts.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.avg)}`).join(" ");
  const currentVal = pts[N - 1].avg;
  const cx = xFor(N - 1);
  const cy = yFor(currentVal);
  const above = currentVal >= avg;
  const lineColor = above ? C.red : C.primary;

  const badgeW = 100;
  const flip = cx + badgeW + 14 > width - p.r;
  const bx = flip ? cx - badgeW - 12 : cx + 12;
  const by = cy - 14;
  const shortDate = priceDate ? formatYyyyMm(priceDate) : "";

  const yearLabels = pts
    .map((d, i) => ({ year: d.yyyy, i }))
    .filter(({ i }) => {
      if (N <= 4) return true;
      const step = Math.max(1, Math.floor(N / 4));
      return i % step === 0 || i === N - 1;
    });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}
      style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={`above-${width}-${height}`}><rect x="0" y="0" width={width} height={yAvg} /></clipPath>
        <clipPath id={`below-${width}-${height}`}><rect x="0" y={yAvg} width={width} height={height - yAvg} /></clipPath>
      </defs>
      {/* 평균선 (연한 점선) */}
      <line x1={p.l} x2={width - p.r} y1={yAvg} y2={yAvg}
        stroke={C.border1} strokeWidth="1" strokeDasharray="3 3" />
      {/* Red above avg */}
      <g clipPath={`url(#above-${width}-${height})`}>
        <path d={linePath} fill="none" stroke={C.red} strokeWidth="2.25"
          strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Green below avg */}
      <g clipPath={`url(#below-${width}-${height})`}>
        <path d={linePath} fill="none" stroke={C.primary} strokeWidth="2.25"
          strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Current price crosshair */}
      <line x1={cx} x2={cx} y1={cy} y2={p.t + innerH}
        stroke={lineColor} strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
      {/* Current price dot */}
      <circle cx={cx} cy={cy} r="8" fill={lineColor} opacity="0.2" />
      <circle cx={cx} cy={cy} r="4.5" fill={lineColor} />
      <circle cx={cx} cy={cy} r="2" fill="#fff" />
      {/* Dark badge */}
      {!compact && (
        <g transform={`translate(${bx}, ${by})`}>
          <rect x="0" y="0" width={badgeW} height="28" rx="8" fill={C.fg1} />
          <text x={badgeW / 2} y="18" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff"
            style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
            <tspan fill={C.fg6} fontWeight="500">{shortDate}</tspan>
            <tspan dx="8">{currentVal.toFixed(1)}억</tspan>
          </text>
        </g>
      )}
      {/* x labels */}
      {yearLabels.map(({ year, i }) => (
        <text key={year} x={xFor(i)} y={height - 10} textAnchor="middle" fontSize="11" fill={C.fg5}
          style={{ fontFamily: "var(--font-sans)" }}>
          &apos;{String(year).slice(2)}
        </text>
      ))}
    </svg>
  );
}

/* ============================================================
   🎨 MultiLineChart — 비교 차트 v2
   · 부드러운 곡선 (Catmull-Rom Bezier)
   · 기준단지 gradient 영역 + 글로우
   · 호버 시 crosshair + 인터랙티브 툴팁 (기준단지 대비 % 포함)
   · 가로 그리드 + Y축 라벨
   ============================================================ */

/** Catmull-Rom → Cubic Bezier (부드럽고 진동 없음) */
function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  const tension = 0.2;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function findNearestPoint(points: { yyyy: number; avg: number }[], year: number) {
  if (points.length === 0) return null;
  const exact = points.find((p) => p.yyyy === year);
  if (exact) return exact;
  return points.reduce((best, p) =>
    Math.abs(p.yyyy - year) < Math.abs(best.yyyy - year) ? p : best
  , points[0]);
}

function MultiLineChart({
  items,
  height = 320,
}: {
  items: { id: number; name: string; color: string; points: { yyyy: number; avg: number }[]; isPrimary: boolean }[];
  height?: number;
}) {
  const width = 1200;
  const p = { t: 24, r: 92, b: 36, l: 48 };
  const innerW = width - p.l - p.r, innerH = height - p.t - p.b;

  const svgWrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [wrapW, setWrapW] = useState<number>(0);

  // Track container width for tooltip px positioning
  useEffect(() => {
    if (!svgWrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWrapW(e.contentRect.width);
    });
    ro.observe(svgWrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Global ranges
  const allYears = items.flatMap((it) => it.points.map((pt) => pt.yyyy));
  const minY = Math.min(...allYears);
  const maxY = Math.max(...allYears);
  const allVals = items.flatMap((it) => it.points.map((pt) => pt.avg));
  const min = Math.min(...allVals) * 0.92;
  const max = Math.max(...allVals) * 1.05;

  const xFor = (yr: number) => p.l + (innerW * (yr - minY)) / (maxY - minY || 1);
  const yFor = (v: number)  => p.t + innerH * (1 - (v - min) / (max - min || 1));

  const yearLabels = (() => {
    const span = maxY - minY;
    const step = span > 15 ? 4 : span > 8 ? 2 : 1;
    const labels: number[] = [];
    for (let y = minY; y <= maxY; y += step) labels.push(y);
    if (labels[labels.length - 1] !== maxY) labels.push(maxY);
    return labels;
  })();

  // Y-axis tick values (4 levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    v: max - (max - min) * r,
    y: p.t + innerH * r,
  }));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const relX = (mouseX - p.l) / innerW;
    const yr = Math.round(minY + relX * (maxY - minY));
    if (yr >= minY && yr <= maxY) setHoverYear(yr);
    else setHoverYear(null);
  };

  // Primary id for tooltip ratio
  const primaryItem = items.find((it) => it.isPrimary);

  // Tooltip rows (sorted by current value desc)
  const tooltipRows = hoverYear !== null
    ? items
        .map((it) => {
          const pt = findNearestPoint(it.points, hoverYear);
          return pt ? { item: it, pt } : null;
        })
        .filter((x): x is { item: typeof items[number]; pt: { yyyy: number; avg: number } } => x !== null)
        .sort((a, b) => b.pt.avg - a.pt.avg)
    : [];
  const primaryVal = primaryItem
    ? findNearestPoint(primaryItem.points, hoverYear ?? -1)?.avg ?? null
    : null;

  // Tooltip pixel position
  const scale = wrapW ? wrapW / width : 1;
  const tooltipX = hoverYear !== null ? xFor(hoverYear) * scale : 0;
  const tooltipWidth = 240;
  const flipSide = wrapW && tooltipX + tooltipWidth + 16 > wrapW;

  return (
    <div ref={svgWrapRef} style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverYear(null)}
      >
        {/* Horizontal grid lines */}
        {yTicks.map((t, i) => (
          <line key={i}
            x1={p.l} x2={width - p.r}
            y1={t.y} y2={t.y}
            stroke={i === yTicks.length - 1 ? C.border1 : C.border2}
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels (left) */}
        {yTicks.map((t, i) => (
          <text key={`yl-${i}`}
            x={p.l - 8} y={t.y + 3}
            textAnchor="end" fontSize="10" fill={C.fg5}
            style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
            {t.v.toFixed(0)}억
          </text>
        ))}

        {/* Lines — thin, clean. Primary slightly thicker, others a bit thinner. */}
        {items.filter((it) => !it.isPrimary).map((it) => {
          if (it.points.length < 2) return null;
          const pts = it.points.map((pt) => [xFor(pt.yyyy), yFor(pt.avg)] as [number, number]);
          return (
            <path key={it.id} d={smoothPath(pts)}
              fill="none" stroke={it.color} strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" />
          );
        })}

        {/* Primary on top (thicker but NO glow/shadow) */}
        {items.filter((it) => it.isPrimary).map((it) => {
          if (it.points.length < 2) return null;
          const pts = it.points.map((pt) => [xFor(pt.yyyy), yFor(pt.avg)] as [number, number]);
          return (
            <path key={it.id} d={smoothPath(pts)}
              fill="none" stroke={it.color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          );
        })}

        {/* 🎯 진짜 변곡점(피크·바닥)에만 미묘한 마커 */}
        {items.map((it) => {
          const n = it.points.length;
          if (n < 3) return null;
          return it.points.map((pt, i) => {
            if (i === 0 || i === n - 1) return null; // 양끝 제외 (끝점은 아래 End label)
            const prev = it.points[i - 1].avg;
            const curr = pt.avg;
            const next = it.points[i + 1].avg;
            const EPS = Math.max(max - min, 0.1) * 0.015; // 1.5% 이상 차이날 때만
            const isPeak  = curr - prev > EPS && curr - next > EPS;
            const isTrough = prev - curr > EPS && next - curr > EPS;
            if (!isPeak && !isTrough) return null;
            return (
              <circle key={`pk-${it.id}-${i}`}
                cx={xFor(pt.yyyy)} cy={yFor(pt.avg)}
                r={it.isPrimary ? 3 : 2.4}
                fill={it.color}
                opacity="0.85"
              />
            );
          });
        })}

        {/* End-point price labels */}
        {items.map((it) => {
          if (it.points.length === 0) return null;
          const last = it.points[it.points.length - 1];
          return (
            <text key={`lbl-${it.id}`}
              x={xFor(last.yyyy) + 10} y={yFor(last.avg) + 4}
              fontSize="11" fontWeight={it.isPrimary ? 800 : 700} fill={it.color}
              style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
              {last.avg.toFixed(1)}억
            </text>
          );
        })}

        {/* Hover crosshair + highlighted dots */}
        {hoverYear !== null && (
          <g pointerEvents="none">
            <line
              x1={xFor(hoverYear)} x2={xFor(hoverYear)}
              y1={p.t} y2={p.t + innerH}
              stroke={C.fg4} strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
            {tooltipRows.map(({ item, pt }) => (
              <circle key={`hv-${item.id}`}
                cx={xFor(pt.yyyy)} cy={yFor(pt.avg)} r="4.5"
                fill={item.color}
                stroke="#fff" strokeWidth="2" />
            ))}
          </g>
        )}

        {/* X axis labels */}
        {yearLabels.map((yr) => (
          <text key={yr} x={xFor(yr)} y={height - 12}
            textAnchor="middle" fontSize="11" fill={C.fg5}
            style={{ fontFamily: "var(--font-sans)" }}>{yr}년</text>
        ))}
      </svg>

      {/* HTML Tooltip — 각 단지 가격 + 기준단지 대비 % */}
      {hoverYear !== null && tooltipRows.length > 0 && (
        <div style={{
          position: "absolute",
          left: flipSide ? tooltipX - tooltipWidth - 16 : tooltipX + 14,
          top: 12,
          width: tooltipWidth,
          background: C.fg1,
          color: "#fff",
          padding: "12px 14px",
          borderRadius: 10,
          fontSize: 12,
          pointerEvents: "none",
          boxShadow: "0 12px 32px rgba(26,30,35,0.28)",
          zIndex: 10,
          fontFamily: "var(--font-sans)",
        }}>
          <div style={{
            fontSize: 11, color: C.fg6, marginBottom: 10,
            fontWeight: 700, letterSpacing: "0.05em",
          }}>
            {tooltipRows[0].pt.yyyy}년
          </div>
          {tooltipRows.map(({ item, pt }) => {
            const pct = primaryVal && primaryVal > 0
              ? Math.round((pt.avg / primaryVal) * 100)
              : null;
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center",
                gap: 8, marginBottom: 6, minWidth: 0,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: item.color, flexShrink: 0,
                }} />
                <span style={{
                  flex: 1, fontSize: 11,
                  fontWeight: item.isPrimary ? 800 : 500,
                  color: item.isPrimary ? "#fff" : "#d9dde4",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {item.name}{item.isPrimary && " · 기준"}
                </span>
                <span style={{
                  fontSize: 11.5, fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  color: "#fff",
                }}>
                  {pt.avg.toFixed(1)}억
                  {pct != null && (
                    <span style={{
                      marginLeft: 6, color: item.isPrimary ? C.purple : C.fg6,
                      fontWeight: 600,
                    }}>
                      ({pct}%)
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   🎨 CompareMap — 실제 Naver Map 래퍼 (pin 데이터 변환)
   ============================================================ */
function CompareMap({
  primary, candidates, selectedIds, onToggle,
}: {
  primary: LoadedDanji;
  candidates: CouplingCandidate[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const pins: MapPin[] = [];
  if (primary.detail.latitude != null && primary.detail.longitude != null) {
    pins.push({
      id: primary.detail.id,
      lat: primary.detail.latitude,
      lng: primary.detail.longitude,
      label: primary.detail.name,
      isPrimary: true,
    });
  }
  candidates.forEach((c, i) => {
    if (c.latitude == null || c.longitude == null) return;
    const selectedIdx = selectedIds.indexOf(c.id);
    pins.push({
      id: c.id,
      lat: c.latitude,
      lng: c.longitude,
      label: c.name,
      color: selectedIdx >= 0 ? COMPARE_COLORS[selectedIdx] : undefined,
      isSelected: selectedIdx >= 0,
      index: i + 2,
    });
  });

  if (pins.length === 0) {
    return (
      <div style={{
        flex: 1, minHeight: 400, borderRadius: 12, background: C.bgMuted,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: C.fg6,
      }}>위치 데이터 없음</div>
    );
  }

  return (
    <div style={{ width: "100%", flex: 1, position: "relative", minHeight: 400 }}>
      <NaverMap pins={pins} onToggle={onToggle} height="100%" />
    </div>
  );
}

/* ============================================================
   🎨 Tag component
   ============================================================ */
function Tag({
  tone = "green", children,
}: {
  tone?: "green" | "dark" | "blue" | "red";
  children: React.ReactNode;
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    green: { bg: C.primaryS, fg: C.primary },
    dark:  { bg: C.bgMuted, fg: C.fg3 },
    blue:  { bg: C.blueS, fg: C.blue },
    red:   { bg: C.redS, fg: C.red },
  };
  const { bg, fg } = tones[tone];
  return (
    <span style={{
      background: bg, color: fg,
      fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 4,
      display: "inline-block", letterSpacing: "-0.01em",
    }}>{children}</span>
  );
}

/* ============================================================
   🎨 Checkbox
   ============================================================ */
function CB({ checked, onClick }: { checked: boolean; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <span onClick={onClick} style={{
      width: 18, height: 18, borderRadius: 4, flex: "0 0 18px",
      border: `1.5px solid ${checked ? C.primary : "#b7babe"}`,
      background: checked ? C.primary : "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "#fff", cursor: "pointer", transition: "all 120ms",
    }}>
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

/* ============================================================
   🎨 CompareTable — 비교표 (기준단지 보라 강조)
   ============================================================ */
type Row =
  | { type: "section"; label: string }
  | { type: "data"; label: string; sub?: boolean; render: (d: LoadedDanji, isPrimary: boolean) => React.ReactNode };

function CompareTable({
  primary, candidates,
}: {
  primary: LoadedDanji;
  candidates: LoadedDanji[];
}) {
  const all = [primary, ...candidates];

  /** 점수 색상 (80+ = 그린, 60~80 = 오렌지, 그 외 = 회색) */
  const scoreColor = (v: number | null): string => {
    if (v == null) return C.fg5;
    if (v >= 80) return C.primary;
    if (v >= 60) return "#F97316";
    return C.fg5;
  };

  /** 점수 뱃지 + 부가 정보 표시 */
  const scoreCell = (score: number | null, subText?: React.ReactNode) => (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(score) }}>
        {score != null ? `${score.toFixed(1)}점` : "—"}
      </div>
      {subText && (
        <div style={{ fontSize: 11, color: C.fg5, marginTop: 3, lineHeight: 1.45 }}>
          {subText}
        </div>
      )}
    </div>
  );

  /** Mock 역세권 정보 — id·sigungu 기반 결정적 생성 (DB에 미보유) */
  const mockStation = (d: DanjiDetail): { line: string; station: string; walkMin: number } | null => {
    if (!d.is_station && !d.has_subway) return null;

    const LINES = ["1", "2", "3", "4", "5", "6", "7", "9", "경의중앙", "수인분당", "신분당"];
    const line = LINES[Math.abs(d.id) % LINES.length];

    const STATION_BY_SGG: Record<string, string> = {
      "강남구": "강남", "서초구": "교대", "송파구": "잠실",
      "용산구": "삼각지", "마포구": "공덕", "종로구": "종각",
      "성동구": "왕십리", "중구": "을지로입구", "영등포구": "여의도",
      "강서구": "마곡", "구로구": "신도림", "관악구": "서울대입구",
      "동대문구": "청량리", "서대문구": "홍제", "은평구": "연신내",
      "노원구": "노원", "도봉구": "쌍문", "강북구": "미아",
      "성북구": "길음", "중랑구": "상봉", "광진구": "건대입구",
      "양천구": "목동", "금천구": "가산", "동작구": "이수",
      "분당구": "서현", "수지구": "수지구청", "기흥구": "기흥",
      "남양주시": "다산", "하남시": "하남시청", "과천시": "과천",
      "성남시": "판교", "용인시": "용인", "안양시": "범계",
    };
    const stationCore = STATION_BY_SGG[d.sigungu ?? ""] ?? (d.sigungu?.replace(/(시|구|군)$/, "") || "역세권");
    const station = stationCore + (stationCore.endsWith("역") ? "" : "역");

    const score = d.station_proximity_score ?? 50;
    let walkMin: number;
    if (score >= 80)      walkMin = 3 + (Math.abs(d.id) % 3);  // 3~5분
    else if (score >= 60) walkMin = 5 + (Math.abs(d.id) % 4);  // 5~8분
    else if (score >= 40) walkMin = 8 + (Math.abs(d.id) % 5);  // 8~12분
    else                  walkMin = 12 + (Math.abs(d.id) % 4); // 12~15분

    return { line, station, walkMin };
  };

  /** 라인 라벨 — 숫자면 "N호선", 이름이면 "이름선" */
  const lineLabel = (l: string): string => (/^\d+$/.test(l) ? `${l}호선` : `${l}선`);

  const rowsDef: Row[] = [
    // ═══════ 기본 시세 ═══════
    { type: "section", label: "기본 시세" },
    {
      type: "data", label: "최근 실거래가",
      render: (d) => {
        const p = d.pyeongs.find((r) => r.supply_pyeong === d.selectedPyeong) ?? d.pyeongs[0];
        return (
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.fg1, letterSpacing: "-0.02em" }}>
              {fmtKRWShort(p?.recent_price)}
            </div>
            <div style={{ fontSize: 11, color: C.fg5, marginTop: 2 }}>({d.selectedPyeong}평 기준)</div>
          </div>
        );
      },
    },
    {
      type: "data", label: "평당가",
      render: (d) => {
        const p = d.pyeongs.find((r) => r.supply_pyeong === d.selectedPyeong) ?? d.pyeongs[0];
        return p?.price_per_pyeong ? `${Math.round(p.price_per_pyeong / 100)}만/평` : "—";
      },
    },
    {
      type: "data", label: "전세가 / 전세가율",
      render: (d) => {
        const p = d.pyeongs.find((r) => r.supply_pyeong === d.selectedPyeong) ?? d.pyeongs[0];
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtKRWShort(p?.jeonse_price)}</div>
            <div style={{ fontSize: 11, color: C.fg5, marginTop: 2 }}>
              {p?.jeonse_ratio != null ? `${p.jeonse_ratio}%` : "—"}
            </div>
          </div>
        );
      },
    },
    {
      type: "data", label: "최고가",
      render: (d) => {
        const p = d.pyeongs.find((r) => r.supply_pyeong === d.selectedPyeong) ?? d.pyeongs[0];
        return fmtKRWShort(p?.highest_price);
      },
    },
    {
      type: "data", label: "연평균 상승률",
      render: (d) => {
        const p = d.pyeongs.find((r) => r.supply_pyeong === d.selectedPyeong) ?? d.pyeongs[0];
        if (p?.cagr == null) return "—";
        const v = p.cagr; // 이미 % 단위 (e.g. 12.0537)
        return <span style={{ color: v >= 0 ? C.primary : C.red, fontWeight: 700 }}>
          {v > 0 ? "+" : ""}{v.toFixed(1)}%
        </span>;
      },
    },

    // ═══════ 기본 정보 ═══════
    { type: "section", label: "단지 정보" },
    { type: "data", label: "준공연도", render: (d) => d.detail.approve_year ? `${d.detail.approve_year}년` : "—" },
    { type: "data", label: "세대수", render: (d) => d.detail.household_count ? `${d.detail.household_count.toLocaleString()}세대` : "—" },
    { type: "data", label: "건설사", render: (d) => d.detail.builder ?? "—" },
    {
      type: "data", label: "세대당 주차",
      render: (d) => d.detail.parking_per_hh != null ? `${d.detail.parking_per_hh.toFixed(2)}대` : "—",
    },

    // ═══════ 입지 점수 ═══════
    { type: "section", label: "입지 점수" },
    {
      type: "data", label: "종합 입지점수",
      render: (d) => scoreCell(d.detail.location_score, "학군·교통·상권 등 가중 평균"),
    },
    {
      type: "data", label: "학군", sub: true,
      render: (d) => scoreCell(
        d.detail.school_district_score,
        <span style={{ color: C.fg6 }}>상세 학교/진학률 준비중</span>
      ),
    },
    {
      type: "data", label: "교통", sub: true,
      render: (d) => scoreCell(
        d.detail.transport_score_loc,
        <>
          {d.detail.commute_gangnam != null && <>강남 <strong>{d.detail.commute_gangnam}분</strong></>}
          {d.detail.commute_yeouido != null && <> · 여의도 <strong>{d.detail.commute_yeouido}분</strong></>}
          {d.detail.commute_gwanghwamun != null && <> · 광화문 <strong>{d.detail.commute_gwanghwamun}분</strong></>}
        </>
      ),
    },
    {
      type: "data", label: "상권", sub: true,
      render: (d) => scoreCell(
        d.detail.commercial_score,
        <span style={{ color: C.fg6 }}>인근 상권/백화점 준비중</span>
      ),
    },
    {
      type: "data", label: "자연환경", sub: true,
      render: (d) => scoreCell(
        d.detail.park_score,
        <span style={{ color: C.fg6 }}>공원/녹지</span>
      ),
    },
    {
      type: "data", label: "일자리", sub: true,
      render: (d) => scoreCell(
        d.detail.job_score,
        <span style={{ color: C.fg6 }}>일자리 수·평균연봉 준비중</span>
      ),
    },
    {
      type: "data", label: "역세권 점수",
      render: (d) => {
        const s = mockStation(d.detail);
        return scoreCell(
          d.detail.station_proximity_score,
          s ? (
            <span>
              <strong style={{ color: C.fg2 }}>{lineLabel(s.line)} {s.station}</strong>
              <span style={{ color: C.fg5 }}> · 도보 {s.walkMin}분</span>
            </span>
          ) : <span style={{ color: C.fg6 }}>역세권 아님</span>
        );
      },
    },
    {
      type: "data", label: "초품아 여부",
      render: (d) => d.detail.has_elem_school ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>초품아 ✓</div>
          <div style={{ fontSize: 11, color: C.fg6, marginTop: 3 }}>단지 내 초등학교</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.fg5 }}>—</div>
          <div style={{ fontSize: 11, color: C.fg6, marginTop: 3 }}>초등학교 거리 상세 준비중</div>
        </div>
      ),
    },

    // ═══════ 상품성 ═══════
    { type: "section", label: "상품성" },
    {
      type: "data", label: "상품성 특징",
      render: (d) => {
        const chips: { label: string; active: boolean }[] = [
          { label: "브랜드", active: !!d.detail.is_brand },
          { label: "대단지", active: !!d.detail.is_large },
          { label: "신축",   active: !!d.detail.is_new },
          { label: "역세권", active: !!d.detail.is_station },
          { label: "주차",   active: !!d.detail.has_parking },
        ];
        return (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {chips.map((c) => (
              <span key={c.label} style={{
                fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4,
                background: c.active ? C.primaryS : C.bgMuted,
                color: c.active ? C.primary : C.fg6,
                border: c.active ? `1px solid ${C.primary}22` : "1px solid transparent",
              }}>{c.label}</span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: `160px repeat(${all.length}, minmax(150px, 1fr))`,
        minWidth: 720, borderTop: `1px solid ${C.border1}`, fontFamily: "var(--font-sans)",
      }}>
        {/* Header row */}
        <div style={{
          padding: "14px 16px", borderBottom: `1px solid ${C.border1}`,
          background: C.bg, fontSize: 14, fontWeight: 700, color: C.fg4,
        }}>구분</div>
        {all.map((d, i) => {
          const isPrimary = i === 0;
          const color = isPrimary ? PRIMARY_COLOR : COMPARE_COLORS[i - 1];
          return (
            <div key={d.detail.id} style={{
              padding: "14px 16px",
              borderBottom: isPrimary ? `2px solid ${C.purple}` : `1px solid ${C.border1}`,
              borderLeft: isPrimary ? `2px solid ${C.purple}` : `1px solid ${C.border1}`,
              borderTop: isPrimary ? `2px solid ${C.purple}` : "none",
              borderRight: isPrimary ? `2px solid ${C.purple}` : "none",
              background: isPrimary ? C.purpleS : C.bg,
            }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: isPrimary ? C.purple : C.fg6, color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>{d.detail.name}</span>
              </div>
              <div style={{ fontSize: 10, color: C.fg5, marginTop: 4 }}>
                {shortSido(d.detail.sido)} {d.detail.sigungu} · {d.selectedPyeong}평
              </div>
            </div>
          );
        })}

        {/* Data rows (섹션 행 제외) */}
        {rowsDef.filter((r) => r.type === "data").map((row, ri, arr) => {
          if (row.type !== "data") return null;
          const isLast = ri === arr.length - 1;

          return (
            <React.Fragment key={ri}>
              <div style={{
                padding: row.sub ? "12px 16px 12px 28px" : "14px 16px",
                borderBottom: `1px solid ${C.border2}`,
                fontSize: row.sub ? 12 : 14,
                fontWeight: row.sub ? 500 : 600,
                color: row.sub ? C.fg4 : C.fg2,
                lineHeight: 1.4,
                background: row.sub ? "#fafbfd" : "transparent",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {row.sub && (
                  <span style={{ color: C.border2, fontSize: 12, fontWeight: 400 }}>└</span>
                )}
                {row.label}
              </div>
              {all.map((d, ci) => {
                const isPrimary = ci === 0;
                return (
                  <div key={d.detail.id} style={{
                    padding: "14px 16px",
                    borderBottom: isLast && isPrimary
                      ? `2px solid ${C.purple}`
                      : `1px solid ${C.border2}`,
                    borderLeft: isPrimary ? `2px solid ${C.purple}` : `1px solid ${C.border2}`,
                    borderRight: isPrimary ? `2px solid ${C.purple}` : "none",
                    background: isPrimary ? C.purpleBg : "#fff",
                    fontSize: 13, color: C.fg2, fontVariantNumeric: "tabular-nums",
                  }}>
                    {row.render(d, isPrimary)}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Filter chips
   ============================================================ */
type FilterKey = "all" | "price" | "size" | "age";
const FILTERS: { k: FilterKey; label: string }[] = [
  { k: "all",   label: "전체" },
  { k: "price", label: "상승흐름유사" },
  { k: "size",  label: "세대수 유사" },
  { k: "age",   label: "연식 유사" },
];

/* ============================================================
   Main
   ============================================================ */
export default function TabCompare() {
  /* state */
  const [primary,         setPrimary]         = useState<LoadedDanji | null>(null);
  const [candidates,      setCandidates]      = useState<LoadedDanji[]>([]);
  const [couplingList,    setCouplingList]    = useState<CouplingCandidate[]>([]);
  const [filter,          setFilter]          = useState<FilterKey>("all");
  const [loadingPrimary,  setLoadingPrimary]  = useState(false);
  const [loadingCoupling, setLoadingCoupling] = useState(false);
  const [loadingCand,     setLoadingCand]     = useState<number | null>(null);

  /* ── Search ── */
  const [q, setQ] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searching, setSearching] = useState(false);
  const doSearch = useCallback((term: string) => {
    if (term.length < 1) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    fetch(`/api/danji/search?q=${encodeURIComponent(term)}&limit=20`)
      .then((r) => r.json())
      .then((d: { results: SearchResult[] }) => setSearchResults(d.results ?? []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, []);

  const handleSearchChange = (v: string) => {
    setQ(v); setOpenSearch(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (v.length < 1) { setSearchResults([]); setSearching(false); return; }
    searchTimerRef.current = setTimeout(() => doSearch(v), 150);
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      e.preventDefault();
      const first = searchResults[0];
      loadPrimary(first.id);
      setQ(""); setSearchResults([]); setOpenSearch(false);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setOpenSearch(false);
    }
  };

  /* ── Load primary ── */
  const loadPrimary = useCallback(async (id: number) => {
    setLoadingPrimary(true);
    setCandidates([]);
    setCouplingList([]);
    try {
      const res = await fetch(`/api/danji/${id}`).then((x) => x.json());
      const { detail, pyeongs, monthlyPrices } = res as {
        detail: DanjiDetail; pyeongs: PyeongRow[]; monthlyPrices: MonthlyPrice[];
      };
      const sp = pyeongs[0]?.supply_pyeong ?? detail.supply_pyeong;
      setPrimary({ detail, pyeongs, series: monthlyPrices, selectedPyeong: sp });
      // Fetch coupling automatically
      setLoadingCoupling(true);
      fetch(`/api/danji/${id}/coupling?pyeong=${sp}&limit=20`)
        .then((r) => r.json())
        .then((d: { candidates: CouplingCandidate[] }) => setCouplingList(d.candidates ?? []))
        .catch(() => setCouplingList([]))
        .finally(() => setLoadingCoupling(false));
    } finally {
      setLoadingPrimary(false);
    }
  }, []);

  /* ── Toggle candidate ── */
  const toggleCandidate = useCallback(async (id: number) => {
    const exists = candidates.some((d) => d.detail.id === id);
    if (exists) {
      setCandidates((prev) => prev.filter((d) => d.detail.id !== id));
      return;
    }
    if (candidates.length >= 5) return;
    setLoadingCand(id);
    try {
      const res = await fetch(`/api/danji/${id}`).then((x) => x.json());
      const { detail, pyeongs, monthlyPrices } = res as {
        detail: DanjiDetail; pyeongs: PyeongRow[]; monthlyPrices: MonthlyPrice[];
      };
      const sp = pyeongs[0]?.supply_pyeong ?? detail.supply_pyeong;
      setCandidates((prev) => {
        if (prev.some((d) => d.detail.id === id) || prev.length >= 5) return prev;
        return [...prev, { detail, pyeongs, series: monthlyPrices, selectedPyeong: sp }];
      });
    } finally {
      setLoadingCand(null);
    }
  }, [candidates]);

  /* ── Preload from sessionStorage (평형갭 → 단지비교) ── */
  useEffect(() => {
    const preId = sessionStorage.getItem("preloadDanjiId");
    if (preId) {
      sessionStorage.removeItem("preloadDanjiId");
      loadPrimary(Number(preId)).catch(() => {});
    }
  }, [loadPrimary]);

  /* ── Filter/sort candidates ── */
  const sortedCandidates = useMemo(() => {
    if (!primary) return couplingList;
    const list = [...couplingList];
    if (filter === "all" || filter === "price") {
      list.sort((a, b) => (b.correlation ?? 0) - (a.correlation ?? 0));
    } else if (filter === "size") {
      const p = primary.detail.household_count ?? 0;
      list.sort((a, b) => Math.abs((a.household_count ?? 0) - p) - Math.abs((b.household_count ?? 0) - p));
    } else if (filter === "age") {
      const p = primary.detail.approve_year ?? 0;
      list.sort((a, b) => Math.abs((a.approve_year ?? 0) - p) - Math.abs((b.approve_year ?? 0) - p));
    }
    return list;
  }, [couplingList, filter, primary]);

  const selectedIds = candidates.map((d) => d.detail.id);

  /* ── Build chart items ── */
  const chartItems = useMemo(() => {
    if (!primary) return [];
    const items = [
      {
        id: primary.detail.id,
        name: primary.detail.name,
        color: PRIMARY_COLOR,
        points: toYearlyPoints(primary.series, primary.selectedPyeong),
        isPrimary: true,
      },
      ...candidates.map((d, i) => ({
        id: d.detail.id,
        name: d.detail.name,
        color: COMPARE_COLORS[i],
        points: toYearlyPoints(d.series, d.selectedPyeong),
        isPrimary: false,
      })),
    ];
    return items;
  }, [primary, candidates]);

  /* ── UI ── */
  return (
    <div style={{ fontFamily: "var(--font-sans)", color: C.fg1, minHeight: "100vh" }}>

      {/* ══════════════════ Sticky Search Bar ══════════════════ */}
      <div style={{
        background: "#fff", borderBottom: `1px solid ${C.border1}`,
        position: "sticky", top: 0, zIndex: 30, marginBottom: 20,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          padding: "14px 0",
        }}>
          <div style={{ flex: 1, maxWidth: 520, position: "relative" }}>
            <input
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setOpenSearch(true)}
              onBlur={() => setTimeout(() => setOpenSearch(false), 200)}
              onKeyDown={handleSearchKey}
              placeholder={primary ? `기준 단지 검색 — 현재: ${primary.detail.name}` : "기준 단지를 검색하세요 (예: 래미안, 반포)"}
              autoComplete="off"
              style={{
                width: "100%", padding: "12px 16px 12px 42px",
                border: `1px solid ${openSearch ? C.primary : C.border1}`, borderRadius: 10,
                fontSize: 13, fontFamily: "var(--font-sans)", outline: "none",
                boxSizing: "border-box", fontWeight: 500, background: "#fff",
                transition: "border-color 0.15s",
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={openSearch ? C.primary : C.fg6} strokeWidth="2.2"
              style={{ position: "absolute", left: 14, top: 13 }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            {q.length > 0 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setQ(""); setSearchResults([]); }}
                style={{
                  position: "absolute", right: 10, top: 10,
                  width: 24, height: 24, borderRadius: "50%",
                  border: 0, background: C.bgMuted, color: C.fg5,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12,
                }}
                aria-label="검색어 지우기"
              >✕</button>
            )}

            {/* Autocomplete dropdown */}
            {openSearch && q.length > 0 && (
              <div style={{
                position: "absolute", top: 48, left: 0, right: 0,
                background: "#fff", border: `1px solid ${C.border1}`,
                borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                maxHeight: 380, overflowY: "auto", zIndex: 40,
              }}>
                {searching && searchResults.length === 0 && (
                  <div style={{ padding: "18px", textAlign: "center", fontSize: 12, color: C.fg5 }}>
                    검색 중…
                  </div>
                )}
                {!searching && searchResults.length === 0 && q.length > 0 && (
                  <div style={{ padding: "18px", textAlign: "center", fontSize: 12, color: C.fg5 }}>
                    &quot;{q}&quot; 검색 결과가 없습니다
                  </div>
                )}
                {searchResults.length > 0 && (
                  <>
                    <div style={{
                      padding: "8px 16px", borderBottom: `1px solid ${C.border2}`,
                      fontSize: 11, color: C.fg6, fontWeight: 600, background: C.bg,
                      display: "flex", justifyContent: "space-between",
                    }}>
                      <span>검색 결과 {searchResults.length}건</span>
                      <span style={{ color: C.fg6 }}>Enter로 첫 결과 선택</span>
                    </div>
                    {searchResults.map((r, i) => {
                      const parts = r.name.split(new RegExp(`(${q})`, "i"));
                      return (
                        <button key={`${r.id}-${r.supply_pyeong}`}
                          onMouseDown={() => { loadPrimary(r.id); setQ(""); setSearchResults([]); setOpenSearch(false); }}
                          style={{
                            width: "100%", padding: "11px 16px", border: 0, background: i === 0 ? C.bg : "transparent",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                            textAlign: "left", fontFamily: "var(--font-sans)",
                            borderTop: i > 0 ? `1px solid ${C.border2}` : 0,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.primaryS)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? C.bg : "transparent")}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.fg1,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {parts.map((part, idx) =>
                                part.toLowerCase() === q.toLowerCase()
                                  ? <mark key={idx} style={{ background: C.primaryS, color: C.primary, padding: 0 }}>{part}</mark>
                                  : <span key={idx}>{part}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: C.fg5, marginTop: 1 }}>
                              {r.sido} {r.sigungu} · {r.approve_year}년 · {r.household_count?.toLocaleString()}세대
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
                              {fmtKRWShort(r.recent_price)}
                            </div>
                            <div style={{ fontSize: 10, color: C.fg6 }}>{r.supply_pyeong}평</div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {primary && (
            <>
              <div style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                <span style={{ color: C.primary, fontSize: 17, fontWeight: 800 }}>{candidates.length}</span>
                <span style={{ color: C.fg6 }}> / 5 비교 단지</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════ Content ══════════════════ */}
      {loadingPrimary && (
        <div style={{ textAlign: "center", padding: "60px", color: C.fg5, fontSize: 13 }}>
          단지 정보 불러오는 중…
        </div>
      )}

      {!primary && !loadingPrimary && (
        <div style={{
          padding: "80px 20px", textAlign: "center",
          background: "#fff", borderRadius: 16, border: `1px dashed ${C.border1}`,
        }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>🏘️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, marginBottom: 8, color: C.fg1 }}>
            기준 단지를 검색해보세요
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: C.fg5 }}>
            상단 검색창에서 단지명을 입력하면, 비교 가능성 높은 커플링 단지들을 자동으로 찾아드립니다.
          </p>
        </div>
      )}

      {primary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 80 }}>

          {/* ── Hero Card ── */}
          <HeroCard primary={primary} onPyeongChange={(p) => {
            setPrimary((prev) => prev ? { ...prev, selectedPyeong: p } : prev);
            // Re-fetch coupling for new pyeong
            setLoadingCoupling(true);
            fetch(`/api/danji/${primary.detail.id}/coupling?pyeong=${p}&limit=20`)
              .then((r) => r.json())
              .then((d: { candidates: CouplingCandidate[] }) => setCouplingList(d.candidates ?? []))
              .catch(() => setCouplingList([]))
              .finally(() => setLoadingCoupling(false));
          }} />

          {/* ── Map + List ── */}
          <SectionCard
            title={`${primary.detail.name}과 비교 가능성 높은 단지들`}
            subtitle="지도나 리스트에서 단지를 선택하면 아래 비교 섹션이 실시간으로 업데이트됩니다"
          >
            {loadingCoupling ? (
              <div style={{ padding: "40px", textAlign: "center", color: C.fg5, fontSize: 13 }}>
                커플링 단지 탐색 중…
              </div>
            ) : couplingList.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: C.fg5, fontSize: 13 }}>
                이 단지와 유사한 가격대의 단지가 없습니다.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr",
                gap: 20,
                alignItems: "stretch",
              }}>
                {/* Map */}
                <div style={{
                  background: "#fff", borderRadius: 12,
                  border: `1px solid ${C.border2}`, padding: 8,
                  display: "flex", flexDirection: "column",
                }}>
                  <CompareMap
                    primary={primary}
                    candidates={sortedCandidates}
                    selectedIds={selectedIds}
                    onToggle={toggleCandidate}
                  />
                </div>

                {/* List */}
                <div>
                  {/* Filter chips */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    {FILTERS.map((f) => (
                      <button key={f.k} onClick={() => setFilter(f.k)} style={{
                        padding: "9px 16px", borderRadius: 8,
                        border: filter === f.k ? `1.5px solid ${C.primary}` : `1px solid ${C.border1}`,
                        background: filter === f.k ? C.primaryS : "#fff",
                        color: filter === f.k ? C.primary : C.fg2,
                        fontSize: 13, fontWeight: filter === f.k ? 700 : 500,
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                      }}>{f.label}</button>
                    ))}
                    {candidates.length > 0 && (
                      <button onClick={() => setCandidates([])} style={{
                        marginLeft: "auto",
                        background: "transparent", border: 0,
                        color: C.fg5, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                        padding: "6px 8px",
                        display: "inline-flex", alignItems: "center", gap: 4,
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = C.fg2; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = C.fg5; }}>
                        ↻ 초기화
                      </button>
                    )}
                  </div>

                  {/* Primary pinned (blue banner) */}
                  <div style={{
                    marginBottom: 8, padding: "12px 16px",
                    background: C.blueS, borderRadius: 10,
                    border: `1.5px solid ${C.blue}`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: C.blue, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800,
                    }}>📍</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.blue, flex: 1 }}>
                      {primary.detail.name}
                    </span>
                    <span style={{ fontSize: 11, color: C.blue, fontWeight: 700 }}>기준 단지</span>
                  </div>

                  {/* Candidate list */}
                  <div style={{
                    background: "#fff", borderRadius: 12, border: `1px solid ${C.border1}`,
                    maxHeight: 380, overflowY: "auto",
                  }}>
                    {sortedCandidates.map((c, i) => {
                      const checked = selectedIds.includes(c.id);
                      const maxed = !checked && candidates.length >= 5;
                      const loading = loadingCand === c.id;
                      const similarity = filter === "price" || filter === "all"
                        ? (c.correlation != null ? c.correlation : null) : null;
                      return (
                        <label key={c.id}
                          onClick={() => !maxed && !loading && toggleCandidate(c.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 16px",
                            borderTop: i > 0 ? `1px solid ${C.border2}` : 0,
                            cursor: maxed ? "not-allowed" : "pointer",
                            background: checked ? "#f8fffb" : "transparent",
                            opacity: maxed ? 0.45 : loading ? 0.6 : 1,
                          }}>
                          <CB checked={checked} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.fg1,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: 11, color: C.fg6, marginTop: 2 }}>
                              {shortSido(c.sido)} {c.sigungu} · {c.approve_year}년 · {c.household_count?.toLocaleString()}세대
                              {similarity != null && (
                                <> · 유사도 <strong style={{ color: C.purple }}>
                                  {(similarity * 100).toFixed(0)}%
                                </strong></>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
                              {fmtKRWShort(c.recent_price)}
                            </div>
                            <div style={{ fontSize: 10, color: C.fg6 }}>{c.supply_pyeong}평</div>
                          </div>
                          <span style={{ fontSize: 11, color: C.fg6, fontWeight: 600,
                            fontVariantNumeric: "tabular-nums", marginLeft: 4 }}>
                            #{i + 2}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Comparison chart + table (lazy, when ≥1 selected) ── */}
          {candidates.length === 0 ? (
            <div style={{
              padding: "48px 20px", textAlign: "center",
              background: "#fff", borderRadius: 14, border: `1px dashed ${C.border1}`,
            }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.6 }}>📊</div>
              <div style={{ fontSize: 14, color: C.fg5, fontWeight: 600 }}>
                단지를 선택하면 시세 차트와 비교표가 나타납니다
              </div>
              <div style={{ fontSize: 12, color: C.fg6, marginTop: 4 }}>최대 5개까지 선택할 수 있어요</div>
            </div>
          ) : (
            <>
              {/* Comparison chart */}
              <SectionCard
                title="시세 추이 비교"
                subtitle={`${chartItems.length}개 단지 · 연평균 매매가 흐름`}
                actions={
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
                    {chartItems.map((it, i) => (
                      <span key={it.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: it.color }} />
                        <span style={{ color: C.fg2, fontWeight: i === 0 ? 800 : 500 }}>
                          {it.name}{i === 0 && " · 기준"}
                        </span>
                      </span>
                    ))}
                  </div>
                }
              >
                <MultiLineChart items={chartItems} />
              </SectionCard>

              {/* Detail comparison table */}
              <SectionCard title="인근 단지 상세 비교표" subtitle="기준단지(1번) + 선택 단지">
                <CompareTable primary={primary} candidates={candidates} />
              </SectionCard>
            </>
          )}

        </div>
      )}
    </div>
  );
}

/* ============================================================
   HeroCard — 기준단지 정보 + 미니 트렌드
   ============================================================ */
function HeroCard({
  primary, onPyeongChange,
}: {
  primary: LoadedDanji;
  onPyeongChange: (pyeong: number) => void;
}) {
  const p = primary.pyeongs.find((r) => r.supply_pyeong === primary.selectedPyeong) ?? primary.pyeongs[0];
  const yearDelta = compute1YDelta(primary.series, primary.selectedPyeong);

  // Latest month label
  const latestMonth = useMemo(() => {
    const filtered = primary.series
      .filter((s) => Math.abs(s.supply_pyeong - primary.selectedPyeong) <= 5)
      .sort((a, b) => b.yyyy_mm.localeCompare(a.yyyy_mm));
    return filtered[0]?.yyyy_mm;
  }, [primary]);

  const flags: React.ReactNode[] = [];
  if (primary.detail.approve_year) {
    const age = new Date().getFullYear() - primary.detail.approve_year;
    flags.push(<Tag key="age" tone="green">{primary.detail.approve_year}년식 · {age}년차</Tag>);
  }
  if (primary.detail.household_count) {
    flags.push(<Tag key="hh" tone="dark">{primary.detail.household_count.toLocaleString()}세대</Tag>);
  }
  if (primary.detail.is_station) flags.push(<Tag key="st" tone="blue">역세권</Tag>);
  if (primary.detail.is_brand)   flags.push(<Tag key="br" tone="dark">브랜드</Tag>);
  if (primary.detail.is_new)     flags.push(<Tag key="nw" tone="green">신축</Tag>);

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: `1px solid ${C.border1}`,
      padding: "24px 28px",
      display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "center",
    }}>
      <div style={{ minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, color: C.fg1 }}>
            {primary.detail.name}
          </h1>
        </div>
        <div style={{ fontSize: 13, color: C.fg5, marginBottom: 12 }}>
          {primary.detail.sido} {primary.detail.sigungu} {primary.detail.emd ?? ""}
          {primary.detail.builder && ` · ${primary.detail.builder}`}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {flags}
        </div>

        {/* Pyeong selector */}
        {primary.pyeongs.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: C.fg6, fontWeight: 700,
              letterSpacing: "0.06em", alignSelf: "center", marginRight: 4 }}>평형</span>
            {primary.pyeongs.map((py) => {
              const active = py.supply_pyeong === primary.selectedPyeong;
              return (
                <button key={py.supply_pyeong}
                  onClick={() => onPyeongChange(py.supply_pyeong)}
                  style={{
                    padding: "4px 12px", borderRadius: 20,
                    border: `1.5px solid ${active ? C.primary : C.border1}`,
                    background: active ? C.primaryS : "#fff",
                    color: active ? C.primary : C.fg4,
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}>{py.supply_pyeong}평</button>
              );
            })}
          </div>
        )}

        {/* Price summary */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: C.fg6, fontWeight: 700, letterSpacing: "0.06em" }}>
              최근 실거래가
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums", color: C.fg1 }}>
              {fmtKRWShort(p?.recent_price)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.fg6, fontWeight: 700, letterSpacing: "0.06em" }}>
              1년 변동
            </div>
            <div style={{ fontSize: 18, fontWeight: 800,
              color: yearDelta != null && yearDelta > 0 ? C.primary
                : yearDelta != null && yearDelta < 0 ? C.red : C.fg5,
              fontVariantNumeric: "tabular-nums" }}>
              {yearDelta == null ? "—" : (
                <>{yearDelta > 0 ? "▲" : "▼"} {Math.abs(yearDelta).toFixed(1)}%</>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.fg6, fontWeight: 700, letterSpacing: "0.06em" }}>
              전세가
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: C.fg1 }}>
              {fmtKRWShort(p?.jeonse_price)}
              {p?.jeonse_ratio != null && (
                <span style={{ fontSize: 12, fontWeight: 500, color: C.fg5, marginLeft: 6 }}>
                  · {p.jeonse_ratio}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mini trend chart */}
      <div style={{ width: "100%", height: 180 }}>
        <AreaTrendChart
          series={primary.series}
          pyeong={primary.selectedPyeong}
          priceDate={latestMonth}
          width={400}
          height={180}
        />
      </div>
    </div>
  );
}

/* ============================================================
   SectionCard wrapper
   ============================================================ */
function SectionCard({
  title, subtitle, actions, children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: `1px solid ${C.border1}`,
      padding: "20px 24px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0,
            letterSpacing: "-0.02em", color: C.fg1 }}>{title}</h3>
          {subtitle && (
            <p style={{ fontSize: 12, color: C.fg5, margin: 0, marginTop: 4 }}>{subtitle}</p>
          )}
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
