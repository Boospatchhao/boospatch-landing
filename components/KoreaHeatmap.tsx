"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoPath, geoMercator } from "d3-geo";
import type { GeoPath, GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryObject } from "topojson-specification";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import MedalBadge from "@/components/ui/MedalBadge";

// sido code → 2자리 코드
const SIDO_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries({
    "11": "서울특별시", "21": "부산광역시", "22": "대구광역시", "23": "인천광역시",
    "24": "광주광역시", "25": "대전광역시", "26": "울산광역시", "29": "세종특별자치시",
    "31": "경기도", "32": "강원특별자치도", "33": "충청북도", "34": "충청남도",
    "35": "전라북도", "36": "전라남도", "37": "경상북도", "38": "경상남도",
    "39": "제주특별자치도",
  }).map(([code, name]) => [name, code])
);

type Level = "sido" | `sigungu:${string}`;

interface DeltaRow { region: string; latest: number; prev: number; deltaPct: number; latestDate: string; }

/* ── 시군구 TopoJSON 지역명 → KB DB 지역명 보정 (필요시) ─────
   sido TopoJSON은 이미 서울특별시/경기도 형식 → DB와 동일.
   sigungu는 "강남구" 같은 이름 → 여러 시도에 중복 존재하므로 code로 구분. */
const SIDO_CODE_TO_NAME: Record<string, string> = {
  "11": "서울특별시", "21": "부산광역시", "22": "대구광역시", "23": "인천광역시",
  "24": "광주광역시", "25": "대전광역시", "26": "울산광역시", "29": "세종특별자치시",
  "31": "경기도", "32": "강원특별자치도", "33": "충청북도", "34": "충청남도",
  "35": "전라북도", "36": "전라남도", "37": "경상북도", "38": "경상남도",
  "39": "제주특별자치도",
};

/* ── 다이버징 컬러 스케일: 파랑(하락) ← 흰색(보합) → 빨강(상승) [한국 주식 기준] ── */
function colorFor(delta: number | null, maxAbs = 0.3): string {
  if (delta == null || Number.isNaN(delta)) return "#e4e6ea";
  const capped = Math.max(-maxAbs, Math.min(maxAbs, delta));
  const t = (capped + maxAbs) / (maxAbs * 2); // 0=하락극값, 1=상승극값
  const down  = { r:  37, g:  99, b: 235 };   // 파랑 (하락)
  const white = { r: 248, g: 250, b: 252 };
  const up    = { r: 220, g:  38, b:  38 };   // 빨강 (상승)
  let c: { r: number; g: number; b: number };
  if (t < 0.5) {
    const k = t / 0.5;
    c = { r: down.r + (white.r - down.r) * k, g: down.g + (white.g - down.g) * k, b: down.b + (white.b - down.b) * k };
  } else {
    const k = (t - 0.5) / 0.5;
    c = { r: white.r + (up.r - white.r) * k, g: white.g + (up.g - white.g) * k, b: white.b + (up.b - white.b) * k };
  }
  return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
}

const UP_COLOR   = "#DC2626";  // 빨강 — 상승
const DOWN_COLOR = "#2563EB";  // 파랑 — 하락

/** "YYYY-MM-DD" or "YYYY-MM" → "YY년 M월" */
function formatDateLabel(d: string | null): string {
  if (!d) return "—";
  const parts = d.split("-");
  return `${parts[0].slice(2)}년 ${parseInt(parts[1] ?? "1")}월`;
}

/** "YYYY-MM-DD" → "YYYY년 M월 D일" */
function formatFullDate(d: string | null): string {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
  return `${parts[0]}년 ${parseInt(parts[1])}월`;
}

function formatDelta(d: number | null): string {
  if (d == null) return "—";
  return `${d > 0 ? "▲ +" : d < 0 ? "▼ " : ""}${Math.abs(d).toFixed(2)}%`;
}

/* ── 상승 상위 20 랭킹 패널 ── */
function RankingPanel({
  title, subtitle, items,
}: {
  title: string;
  subtitle: string;
  items: DeltaRow[];
}) {
  return (
    <aside
      aria-label="상승 상위 랭킹"
      style={{
        background: "linear-gradient(180deg, #fff 0%, #fafbfc 100%)",
        border: "0.5px solid #e4e6ea",
        borderRadius: 12,
        padding: "14px 16px 12px",
        minHeight: 300,
      }}
    >
      <div style={{ borderBottom: "1.5px solid #f0f2f6", paddingBottom: 10, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          {/* Lucide trending-up */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke={UP_COLOR} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--color-text)" }}>
            {title}
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "var(--bp-gray-500)", fontWeight: 500 }}>
          {subtitle} · TOP 20
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: "40px 8px", textAlign: "center", fontSize: 11, color: "var(--bp-gray-400)" }}>
          데이터 없음
        </div>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((row, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const up = row.deltaPct >= 0;
            return (
              <li
                key={row.region}
                style={{
                  display: "grid",
                  gridTemplateColumns: "30px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 6px",
                  borderRadius: 6,
                  background: isTop3 ? "rgba(251, 191, 36, 0.06)" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLLIElement).style.background = "var(--bp-gray-50)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLLIElement).style.background = isTop3 ? "rgba(251, 191, 36, 0.06)" : "transparent"; }}
              >
                {isTop3 ? (
                  <span style={{ display: "inline-flex", justifyContent: "center" }}>
                    <MedalBadge rank={rank as 1 | 2 | 3} />
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: "transparent",
                      color: "var(--bp-gray-400)",
                      fontSize: 11,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {rank}
                  </span>
                )}
                <span style={{
                  fontSize: 12,
                  fontWeight: isTop3 ? 700 : 500,
                  color: "var(--color-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {row.region}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: up ? UP_COLOR : DOWN_COLOR,
                  whiteSpace: "nowrap",
                }}>
                  {up ? "+" : ""}{row.deltaPct.toFixed(2)}%
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

export default function KoreaHeatmap() {
  // ── 내부 필터 state ──
  const [indexType, setIndexType] = useState<"매매가격지수" | "전세가격지수">("매매가격지수");
  const periodic: "weekly" = "weekly";

  // ── 지도 state ──
  const [level, setLevel] = useState<Level>("sido");
  const [sidoTopo, setSidoTopo] = useState<Topology | null>(null);
  const [sigunguCache, setSigunguCache] = useState<Record<string, FeatureCollection<Geometry, GeoJsonProperties>>>({});

  // ── 기간 슬라이더 state ──
  const [dates, setDates]     = useState<string[]>([]);
  const [fromIdx, setFromIdx] = useState<number>(0);
  const [toIdx, setToIdx]     = useState<number>(0);

  const [deltas, setDeltas] = useState<DeltaRow[] | null>(null);
  const [err, setErr]       = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; region: string; delta: number | null } | null>(null);

  const isMobile = useIsMobile();

  // 연도 틱 (슬라이더 하단 레이블)
  const yearTicks = useMemo(() => {
    if (dates.length < 2) return [] as { year: number; pct: number }[];
    const firstYear = parseInt(dates[0].slice(0, 4));
    const lastYear  = parseInt(dates[dates.length - 1].slice(0, 4));
    const span = lastYear - firstYear;
    const step = span <= 6 ? 1 : span <= 12 ? 2 : span <= 25 ? 5 : 10;
    const startTick = Math.ceil(firstYear / step) * step;
    const ticks: { year: number; pct: number }[] = [];
    for (let y = startTick; y <= lastYear; y += step) {
      const idx = dates.findIndex((d) => parseInt(d.slice(0, 4)) >= y);
      if (idx >= 0) ticks.push({ year: y, pct: (idx / (dates.length - 1)) * 100 });
    }
    return ticks;
  }, [dates]);

  // "최근 3년 보기" 핸들러
  const handleRecent3Y = useCallback(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 3);
    const cutStr = cutoff.toISOString().slice(0, 10);
    const idx = dates.findIndex((d) => d >= cutStr);
    if (idx >= 0) setFromIdx(idx);
    setToIdx(dates.length - 1);
  }, [dates]);

  // sido + 날짜 목록 초기 로드
  useEffect(() => {
    fetch("/geo/sido.json")
      .then((r) => r.json())
      .then(setSidoTopo)
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    fetch(`/api/kb/dates?indexType=${encodeURIComponent(indexType)}&periodic=${periodic}`)
      .then((r) => r.json())
      .then((d: { dates: string[] }) => {
        const arr = d.dates ?? [];
        setDates(arr);
        // 기본값: 이번주 (양쪽 핸들 모두 마지막 위치)
        const last = arr.length - 1;
        setFromIdx(last);
        setToIdx(last);
      })
      .catch((e) => setErr(String(e)));
  }, [indexType, periodic]);

  // 델타 로드 — 350ms 디바운스 (슬라이더 드래그 중 요청 폭증 방지)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (dates.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // fromIdx >= toIdx → 이번주 시황 (직전 1주 대비)
      const isThisWeek = fromIdx >= toIdx;
      const url = isThisWeek
        ? `/api/kb/delta?indexType=${encodeURIComponent(indexType)}&periodic=${periodic}`
        : `/api/kb/delta?indexType=${encodeURIComponent(indexType)}&periodic=${periodic}&fromDate=${dates[fromIdx]}&toDate=${dates[toIdx]}`;
      fetch(url)
        .then((r) => r.json())
        .then((d) => setDeltas(d.deltas ?? []))
        .catch((e) => setErr(String(e)));
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [indexType, periodic, dates, fromIdx, toIdx]);

  // 드릴다운 시 해당 sido 파일만 lazy load
  useEffect(() => {
    if (level === "sido") return;
    const sidoCode = level.split(":")[1];
    if (sigunguCache[sidoCode]) return;
    fetch(`/geo/sigungu/${sidoCode}.json`)
      .then((r) => r.json())
      .then((fc: FeatureCollection<Geometry, GeoJsonProperties>) => {
        setSigunguCache((prev) => ({ ...prev, [sidoCode]: fc }));
      })
      .catch((e) => setErr(String(e)));
  }, [level, sigunguCache]);

  const deltaMap = useMemo(() => {
    const m = new Map<string, DeltaRow>();
    for (const d of (deltas ?? [])) m.set(d.region, d);
    return m;
  }, [deltas]);

  // 현재 level에 해당하는 features
  const activeFeatures = useMemo(() => {
    if (level === "sido") {
      if (!sidoTopo) return [];
      const key = Object.keys(sidoTopo.objects)[0];
      const geo = sidoTopo.objects[key] as GeometryObject;
      const fc = feature(sidoTopo, geo) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
      return fc.features;
    }
    // sigungu level: 해당 sido GeoJSON (이미 분리된 파일)
    const sidoCode = level.split(":")[1];
    const fc = sigunguCache[sidoCode];
    return fc ? fc.features : [];
  }, [level, sidoTopo, sigunguCache]);

  // projection: 시도 뷰에서는 제주 제외한 본토 기준으로 fitSize (지도 크기 최대화)
  const { pathFn, width, height, jejuTransform } = useMemo(() => {
    const w = 820;
    const h = 760;
    if (activeFeatures.length === 0) {
      return { pathFn: null as GeoPath | null, width: w, height: h, jejuTransform: null as string | null };
    }
    const isNational = level === "sido";

    let proj;
    if (isNational) {
      // 본토 중심 — 백령도/독도 제외, 서울 크게, 전체 보이도록
      proj = geoMercator()
        .center([127.8, 36.2])
        .scale(w * 9)
        .translate([w / 2, h * 0.48]);
    } else {
      const fc: FeatureCollection<Geometry, GeoJsonProperties> = {
        type: "FeatureCollection",
        features: activeFeatures,
      };
      proj = geoMercator().fitSize([w, h], fc as unknown as GeoPermissibleObjects);
    }
    const pFn = geoPath(proj);

    // 제주 인셋 transform 계산 (시도 뷰에서만)
    let jejuTransform: string | null = null;
    if (isNational) {
      const jeju = activeFeatures.find((f) => String(f.properties?.name ?? "") === "제주특별자치도");
      if (jeju) {
        const [[x0, y0], [x1, y1]] = pFn.bounds(jeju as unknown as GeoPermissibleObjects);
        const bw = x1 - x0;
        const bh = y1 - y0;
        const sc = 1.5;
        const insetX = w - bw * sc - 20;
        const insetY = h - bh * sc - 20;
        const tx = insetX - x0 * sc;
        const ty = insetY - y0 * sc;
        jejuTransform = `translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${sc})`;
      }
    }
    return { pathFn: pFn, width: w, height: h, jejuTransform };
  }, [activeFeatures, level]);

  const handleClick = (feat: Feature<Geometry, GeoJsonProperties>) => {
    if (level === "sido") {
      // properties.code 우선, 없으면 이름으로 코드 조회
      const rawCode = String(feat.properties?.code ?? "");
      const code = rawCode || (SIDO_NAME_TO_CODE[String(feat.properties?.name ?? "")] ?? "");
      if (code) setLevel(`sigungu:${code}`);
    }
  };

  // 색상 스케일 maxAbs: 선택 기간에 맞게 자동 조정
  const colorMaxAbs = useMemo(() => {
    if (!deltas || deltas.length === 0) return 0.3;
    const abs = deltas.map((d) => Math.abs(d.deltaPct));
    const p90 = abs.sort((a, b) => a - b)[Math.floor(abs.length * 0.9)] ?? 0.3;
    // 최소 0.1, 최대 30, 반올림해서 깔끔하게
    const raw = Math.max(0.1, p90);
    if (raw < 0.5) return 0.3;
    if (raw < 2)   return Math.ceil(raw);
    if (raw < 10)  return Math.ceil(raw / 2) * 2;
    return Math.ceil(raw / 5) * 5;
  }, [deltas]);

  const fromDate    = dates[fromIdx] ?? null;
  const toDate      = dates[toIdx]   ?? null;
  const latestDate  = deltas?.[0]?.latestDate ?? toDate;
  const isThisWeek  = fromIdx >= toIdx;  // 이번주 모드 (핸들 겹침)

  // 상위 20위 랭킹 — 현재 레벨(시도 or 선택된 시군구)의 지역만 필터
  const top20 = useMemo(() => {
    if (!deltas) return [];
    const displayedNames = new Set(activeFeatures.map((f) => String(f.properties?.name ?? "")));
    return deltas
      .filter((d) => displayedNames.has(d.region))
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, 20);
  }, [deltas, activeFeatures]);

  const title = level === "sido"
    ? `전국 KB ${indexType === "매매가격지수" ? "매매" : "전세"}지수 히트맵`
    : `${SIDO_CODE_TO_NAME[level.split(":")[1]] ?? ""} 시군구 ${indexType === "매매가격지수" ? "매매" : "전세"}지수`;

  return (
    <div style={{ width: "100%", background: "#fff", borderRadius: "var(--radius-xl)", border: "0.5px solid #e4e6ea", padding: "var(--space-5)", position: "relative" }}>
      {/* ── 헤더: 타이틀 + 매매/전세 토글 + 전국으로 버튼 ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
          {title}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 매매/전세 토글 */}
          <div style={{ display: "flex", background: "var(--bp-gray-100)", borderRadius: 8, padding: 2, gap: 2 }}>
            {(["매매가격지수", "전세가격지수"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setIndexType(t)}
                style={{
                  padding: "4px 12px", borderRadius: 6, border: "none",
                  background: indexType === t ? "#fff" : "transparent",
                  boxShadow: indexType === t ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  color: indexType === t ? "var(--bp-gray-900)" : "var(--bp-gray-400)",
                  fontSize: 12, fontWeight: indexType === t ? 700 : 400, cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                {t === "매매가격지수" ? "매매" : "전세"}
              </button>
            ))}
          </div>
          {level !== "sido" && (
            <button type="button" onClick={() => setLevel("sido")}
              style={{ padding: "4px 12px", background: "var(--bp-primary-100)", color: "var(--bp-primary-500)", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              ← 전국으로
            </button>
          )}
        </div>
      </div>

      {/* ── 기간 슬라이더 ── */}
      {dates.length > 1 && (
        <div style={{ marginBottom: 14, padding: "10px 14px 8px", background: "var(--bp-gray-50)", borderRadius: 10 }}>
          {/* 썸 스타일 */}
          <style>{`
            .kb-dual-range { position: relative; height: 24px; }
            .kb-dual-range input[type=range] {
              position: absolute; left: 0; top: 0; width: 100%;
              pointer-events: none; -webkit-appearance: none; appearance: none;
              background: transparent; height: 24px; margin: 0; padding: 0;
            }
            .kb-dual-range input[type=range]::-webkit-slider-thumb {
              pointer-events: all; -webkit-appearance: none; appearance: none;
              width: 18px; height: 18px; border-radius: 50%;
              background: #fff; border: 2.5px solid #3b82f6;
              cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.18);
            }
            .kb-dual-range input[type=range]::-moz-range-thumb {
              pointer-events: all; width: 16px; height: 16px; border-radius: 50%;
              background: #fff; border: 2.5px solid #3b82f6;
              cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.18);
            }
          `}</style>

          {/* 상단: 선택 기간 + 단축버튼 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            {isThisWeek ? (
              <span style={{ fontSize: 11, color: "var(--bp-gray-600)", fontWeight: 600 }}>
                이번주 시황
                {latestDate && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--bp-gray-400)", fontWeight: 400 }}>{latestDate} 기준 · 직전 1주 대비</span>}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: "var(--bp-gray-600)", fontWeight: 500 }}>
                {formatDateLabel(fromDate)} ~ {formatDateLabel(toDate)}
                <span style={{ marginLeft: 6, color: "var(--bp-primary-500)", fontWeight: 600, fontSize: 10 }}>누적 변동률</span>
              </span>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isThisWeek && (
                <button type="button"
                  onClick={() => { const last = dates.length - 1; setFromIdx(last); setToIdx(last); }}
                  style={{ fontSize: 11, color: "var(--bp-gray-500)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>
                  이번주 시황
                </button>
              )}
              <button type="button" onClick={handleRecent3Y}
                style={{ fontSize: 11, color: "var(--bp-primary-500)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                최근 3년 보기
              </button>
            </div>
          </div>

          {/* 듀얼 슬라이더 */}
          <div className="kb-dual-range">
            {/* 배경 트랙 */}
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0,
              height: 4, background: "#d1d5db", borderRadius: 2,
              transform: "translateY(-50%)", pointerEvents: "none",
            }} />
            {/* 선택 구간 채움 */}
            <div style={{
              position: "absolute", top: "50%", height: 4,
              background: "#3b82f6", borderRadius: 2, transform: "translateY(-50%)",
              left:  `${(fromIdx / (dates.length - 1)) * 100}%`,
              width: `${((toIdx - fromIdx) / (dates.length - 1)) * 100}%`,
              pointerEvents: "none",
            }} />
            {/* from 썸 */}
            <input type="range" min={0} max={dates.length - 1} value={fromIdx}
              onChange={(e) => { const v = Number(e.target.value); setFromIdx(v); if (v > toIdx) setToIdx(v); }}
              style={{ zIndex: fromIdx >= dates.length * 0.9 ? 5 : 3 }} />
            {/* to 썸 */}
            <input type="range" min={0} max={dates.length - 1} value={toIdx}
              onChange={(e) => { const v = Number(e.target.value); setToIdx(v); if (v < fromIdx) setFromIdx(v); }}
              style={{ zIndex: 4 }} />
          </div>

          {/* 연도 틱 레이블 */}
          <div style={{ position: "relative", height: 18, marginTop: 2 }}>
            {yearTicks.map(({ year, pct }) => (
              <span key={year} style={{
                position: "absolute",
                left: `${pct}%`,
                transform: "translateX(-50%)",
                fontSize: 10,
                color: "var(--bp-gray-400)",
                whiteSpace: "nowrap",
              }}>{year}년</span>
            ))}
          </div>
        </div>
      )}

      {/* 상태 */}
      {err && <div style={{ padding: 20, color: "#DC2626" }}>지도를 불러오지 못했습니다: {err}</div>}
      {!err && !sidoTopo && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>지도 로딩 중…</div>}

      {/* SVG + 랭킹 — 2컬럼 그리드 */}
      {sidoTopo && pathFn && activeFeatures.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 300px",
          gap: 20,
          alignItems: "start",
        }}>
        <div style={{ position: "relative", width: "100%" }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", height: "auto", maxHeight: 850, display: "block", overflow: "hidden" }}
            onMouseLeave={() => { setTooltip(null); setHoverKey(null); }}
          >
            <defs>
              <clipPath id="kb-map-clip"><rect x="0" y="0" width={width} height={height} /></clipPath>
            </defs>
            {/* ── 본토 지역 ── */}
            {(() => {
              const SIDO_ABBR: Record<string, string> = {
                "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
                "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
                "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기",
                "강원특별자치도": "강원", "충청북도": "충북", "충청남도": "충남",
                "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
                "경상남도": "경남", "제주특별자치도": "제주",
              };
              const isSido = level === "sido";
              const renderFeatures = isSido
                ? activeFeatures.filter((f) => String(f.properties?.name ?? "") !== "제주특별자치도")
                : activeFeatures;
              return (
                <>
                  <g clipPath="url(#kb-map-clip)">
                    {renderFeatures.map((f, i) => {
                      const name = String(f.properties?.name ?? "");
                      const code = String(f.properties?.code ?? "");
                      const key = `${name}-${code || i}`;
                      const row = deltaMap.get(name);
                      const d = row?.deltaPct ?? null;
                      const fill = colorFor(d, colorMaxAbs);
                      const clickable = isSido;
                      return (
                        <path key={key} d={pathFn(f) ?? undefined} fill={fill}
                          stroke={hoverKey === key ? "#1a1e23" : "#ffffff"}
                          strokeWidth={hoverKey === key ? 1.8 : 0.6}
                          style={{ cursor: clickable ? "pointer" : "default", transition: "stroke 0.1s" }}
                          onMouseEnter={(e) => {
                            setHoverKey(key);
                            const parent = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                            setTooltip({ x: e.clientX - (parent?.left ?? 0), y: e.clientY - (parent?.top ?? 0), region: name, delta: d });
                          }}
                          onMouseMove={(e) => {
                            const parent = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                            setTooltip({ x: e.clientX - (parent?.left ?? 0), y: e.clientY - (parent?.top ?? 0), region: name, delta: d });
                          }}
                          onClick={() => clickable && handleClick(f)}
                        />
                      );
                    })}
                  </g>
                  {/* 본토 라벨 */}
                  {renderFeatures.map((f, i) => {
                    const name = String(f.properties?.name ?? "");
                    const centroid = pathFn.centroid(f);
                    if (!centroid || Number.isNaN(centroid[0])) return null;
                    const area = pathFn.area(f);
                    if (!isSido && area < 600) return null;
                    const row = deltaMap.get(name);
                    const d = row?.deltaPct ?? null;
                    const displayName = isSido ? (SIDO_ABBR[name] ?? name) : name;
                    // 시도 라벨 위치 수동 보정 (서울/경기/인천 겹침 방지)
                    const LABEL_OFFSET: Record<string, [number, number]> = {
                      "경기도":      [-30, -80],
                      "인천광역시":   [-120, -40],
                      "세종특별자치시": [0, 10],
                    };
                    const [ox, oy] = (isSido && LABEL_OFFSET[name]) || [0, 0];
                    const lx = centroid[0] + ox;
                    const ly = centroid[1] + oy;
                    return (
                      <g key={`label-${i}`} style={{ pointerEvents: "none" }}>
                        <text x={lx} y={ly - (isSido ? 8 : 4)} textAnchor="middle"
                          stroke="#fff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke"
                          style={{ fontSize: isSido ? 16 : 11, fontWeight: 800, fill: "#1a1e23" }}>
                          {displayName}
                        </text>
                        {d != null && (
                          <text x={lx} y={ly + (isSido ? 12 : 9)} textAnchor="middle"
                            stroke="#fff" strokeWidth={3.5} strokeLinejoin="round" paintOrder="stroke"
                            style={{ fontSize: isSido ? 14 : 10, fontWeight: 700, fill: d >= 0 ? UP_COLOR : DOWN_COLOR }}>
                            {formatDelta(d)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              );
            })()}

            {/* ── 제주 인셋 (우하단) ── */}
            {jejuTransform && (() => {
              const jeju = activeFeatures.find((f) => String(f.properties?.name ?? "") === "제주특별자치도");
              if (!jeju) return null;
              const name = "제주특별자치도";
              const row = deltaMap.get(name);
              const d = row?.deltaPct ?? null;
              const key = "jeju-inset";
              // 인셋 배경 박스 (제주 bounds 기준)
              const [[bx0, by0], [bx1, by1]] = pathFn.bounds(jeju as unknown as GeoPermissibleObjects);
              const pad = 6;
              const scale = 1.8;
              const boxX = (width - (bx1 - bx0) * scale) - 16 - pad;
              const boxY = (height - (by1 - by0) * scale) - 16 - pad;
              const boxW = (bx1 - bx0) * scale + pad * 2;
              const boxH = (by1 - by0) * scale + pad * 2;
              const centroid = pathFn.centroid(jeju as unknown as GeoPermissibleObjects);
              return (
                <g>
                  {/* 인셋 박스 */}
                  <rect x={boxX} y={boxY} width={boxW} height={boxH}
                    rx={4} fill="#f8f9fc" stroke="#e4e6ea" strokeWidth={0.8} />
                  {/* 제주 path */}
                  <g transform={jejuTransform}>
                    <path d={pathFn(jeju) ?? undefined} fill={colorFor(d)}
                      stroke={hoverKey === key ? "#1a1e23" : "#ccc"} strokeWidth={0.4}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => {
                        setHoverKey(key);
                        const parent = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                        setTooltip({ x: e.clientX - (parent?.left ?? 0), y: e.clientY - (parent?.top ?? 0), region: name, delta: d });
                      }}
                      onMouseMove={(e) => {
                        const parent = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                        setTooltip({ x: e.clientX - (parent?.left ?? 0), y: e.clientY - (parent?.top ?? 0), region: name, delta: d });
                      }}
                      onMouseLeave={() => { setTooltip(null); setHoverKey(null); }}
                      onClick={() => handleClick(jeju)}
                    />
                    {/* 제주 라벨 */}
                    <g style={{ pointerEvents: "none" }}>
                      <text x={centroid[0]} y={centroid[1] - 4} textAnchor="middle"
                        stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" paintOrder="stroke"
                        style={{ fontSize: 6, fontWeight: 400, fill: "#1a1e23" }}>
                        제주
                      </text>
                      {d != null && (
                        <text x={centroid[0]} y={centroid[1] + 5} textAnchor="middle"
                          stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" paintOrder="stroke"
                          style={{ fontSize: 5.5, fontWeight: 500, fill: d >= 0 ? UP_COLOR : DOWN_COLOR }}>
                          {formatDelta(d)}
                        </text>
                      )}
                    </g>
                  </g>
                </g>
              );
            })()}
          </svg>

          {/* 툴팁 */}
          {tooltip && (
            <div
              style={{
                position: "absolute",
                left: Math.min(tooltip.x + 12, width - 160),
                top:  Math.max(tooltip.y - 40, 0),
                background: "#fff",
                border: "0.5px solid #e4e6ea",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 11,
                boxShadow: "var(--shadow-md)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 10,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--color-text)" }}>{tooltip.region}</div>
              <div style={{ color: tooltip.delta == null ? "var(--color-text-muted)" : tooltip.delta >= 0 ? UP_COLOR : DOWN_COLOR }}>
                {formatDelta(tooltip.delta)}
              </div>
              {level === "sido" && <div style={{ color: "var(--color-text-muted)", fontSize: 10, marginTop: 2 }}>클릭 → 시군구 보기</div>}
            </div>
          )}
        </div>
        {/* ── 우측: 상승 상위 20 랭킹 ── */}
        <RankingPanel
          title={`${formatFullDate(latestDate)} ${isThisWeek ? "주간" : "누적"} 상승 상위`}
          subtitle={level === "sido" ? "시·도 기준" : `${SIDO_CODE_TO_NAME[level.split(":")[1]] ?? ""} 시군구 기준`}
          items={top20}
        />
        </div>
      )}

      {/* 범례 */}
      {(() => {
        const half = parseFloat((colorMaxAbs / 2).toFixed(2));
        const ticks = [
          { label: `−${colorMaxAbs}%`, color: DOWN_COLOR, fontWeight: 700 },
          { label: `−${half}%`,        color: DOWN_COLOR, fontWeight: 400 },
          { label: "0%",               color: "var(--bp-gray-400)", fontWeight: 400 },
          { label: `+${half}%`,        color: UP_COLOR,   fontWeight: 400 },
          { label: `+${colorMaxAbs}%`, color: UP_COLOR,   fontWeight: 700 },
        ];
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: DOWN_COLOR, fontWeight: 700 }}>하락</span>
              <div style={{
                width: 200, height: 12, borderRadius: 6,
                background: `linear-gradient(to right, ${DOWN_COLOR}, #f8fafc 50%, ${UP_COLOR})`,
              }} />
              <span style={{ fontSize: 10, color: UP_COLOR, fontWeight: 700 }}>상승</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", width: 212, textAlign: "center" }}>
              {ticks.map((tk, i) => (
                <span key={i} style={{ fontSize: 9, color: tk.color, fontWeight: tk.fontWeight }}>
                  {tk.label}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
