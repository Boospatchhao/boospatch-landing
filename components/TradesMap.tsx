"use client";

/**
 * 일일 실거래 지도 — 거래량 히트맵 + 신고가 건수 표시 + 시도→시군구 드릴다운.
 * KoreaHeatmap과 같은 TopoJSON 사용.
 *
 * v2: changePctMap / weeklyDealMap / onSigunguClick props 추가
 *   - changePctMap 제공 시 다이버징 Red-White-Blue 컬러 (증감%)
 *   - weeklyDealMap 제공 시 라벨에 주간 거래량 표시
 *   - onSigunguClick 제공 시 시군구 클릭 → 외부 핸들러 호출 (읍면동 테이블용)
 */
import { useEffect, useMemo, useState } from "react";
import { geoPath, geoMercator } from "d3-geo";
import type { GeoPath, GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryObject } from "topojson-specification";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

const SIDO_NAME_TO_CODE: Record<string, string> = {
  "서울특별시": "11", "부산광역시": "21", "대구광역시": "22", "인천광역시": "23",
  "광주광역시": "24", "대전광역시": "25", "울산광역시": "26", "세종특별자치시": "29",
  "경기도": "31", "강원특별자치도": "32", "충청북도": "33", "충청남도": "34",
  "전라북도": "35", "전북특별자치도": "35", "전라남도": "36",
  "경상북도": "37", "경상남도": "38", "제주특별자치도": "39",
};
const SIDO_CODE_TO_NAME: Record<string, string> = {
  "11": "서울특별시", "21": "부산광역시", "22": "대구광역시", "23": "인천광역시",
  "24": "광주광역시", "25": "대전광역시", "26": "울산광역시", "29": "세종특별자치시",
  "31": "경기도", "32": "강원특별자치도", "33": "충청북도", "34": "충청남도",
  "35": "전라북도", "36": "전라남도", "37": "경상북도", "38": "경상남도",
  "39": "제주특별자치도",
};
const SIDO_ABBR: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
  "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
  "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기",
  "강원특별자치도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주",
};

interface SidoCard { sido: string; dealCnt: number; newHighCnt: number }
interface SigunguCard { sigungu: string; sggCode: string; dealCnt: number; newHighCnt: number }

type Level = "sido" | `sigungu:${string}`;

interface Props {
  /** 시도 집계 */
  sidoCards: SidoCard[];
  /** 시도별 시군구 집계 ({sidoName: [sigunguCards]}) */
  sigunguBySido: Record<string, SigunguCard[]>;
  /** 외부 드릴 상태 (optional — 미지정 시 내부 관리) */
  level?: Level;
  onLevelChange?: (level: Level) => void;
  /** 제목 prefix */
  titlePrefix?: string;
  /**
   * region name → 평균 대비 증감% (제공 시 Red-White-Blue 다이버징 컬러)
   * 시도 뷰: 시도 full name (e.g. "서울특별시")
   * 시군구 뷰: 시군구 name (e.g. "강남구")
   */
  changePctMap?: Map<string, number>;
  /**
   * region name → 주간 거래량 (제공 시 기본 dealCnt 대신 이 값으로 라벨 표시)
   */
  weeklyDealMap?: Map<string, number>;
  /**
   * 시군구 레벨에서 시군구 path 클릭 시 호출 (읍면동 테이블용)
   * 미제공 시 클릭 무반응
   */
  onSigunguClick?: (sigunguName: string) => void;
}

/* ── 거래량 로그 스케일 → 파란 단색 (changePctMap 없을 때) ── */
function logScale(v: number, max: number): number {
  if (v <= 0 || max <= 0) return 0;
  return Math.log(v + 1) / Math.log(max + 1);
}

function fillFor(cnt: number, max: number): string {
  if (cnt <= 0) return "#f1f5f9";
  const t = logScale(cnt, max);
  const start = { r: 245, g: 249, b: 255 };
  const end   = { r:  37, g:  99, b: 235 };
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/* ── 다이버징 컬러: 파랑(평균↓) ← 흰색(보합) → 빨강(평균↑) ── */
function changePctFill(pct: number | undefined, maxAbs = 50): string {
  if (pct == null) return "#e8ecf2";
  const capped = Math.max(-maxAbs, Math.min(maxAbs, pct));
  const t = (capped + maxAbs) / (maxAbs * 2);
  const down  = { r:  37, g:  99, b: 235 };
  const white = { r: 245, g: 249, b: 255 };
  const up    = { r: 220, g:  38, b:  38 };
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

function fmtChangePct(pct: number): string {
  return `${pct >= 0 ? "▲ +" : "▼ "}${Math.abs(pct).toFixed(1)}%`;
}

export default function TradesMap({
  sidoCards, sigunguBySido,
  level: extLevel, onLevelChange,
  titlePrefix = "전국",
  changePctMap,
  weeklyDealMap,
  onSigunguClick,
}: Props) {
  const [intLevel, setIntLevel] = useState<Level>("sido");
  const level = extLevel ?? intLevel;
  const setLevel = (l: Level) => {
    if (onLevelChange) onLevelChange(l);
    else setIntLevel(l);
  };

  const [sidoTopo, setSidoTopo] = useState<Topology | null>(null);
  const [sigunguCache, setSigunguCache] = useState<Record<string, FeatureCollection<Geometry, GeoJsonProperties>>>({});
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; name: string; cnt: number; nh: number; changePct?: number;
  } | null>(null);

  useEffect(() => {
    fetch("/geo/sido.json").then((r) => r.json()).then(setSidoTopo).catch(() => {});
  }, []);

  useEffect(() => {
    if (level === "sido") return;
    const code = level.split(":")[1];
    if (sigunguCache[code]) return;
    fetch(`/geo/sigungu/${code}.json`).then((r) => r.json())
      .then((fc: FeatureCollection<Geometry, GeoJsonProperties>) => {
        setSigunguCache((prev) => ({ ...prev, [code]: fc }));
      })
      .catch(() => {});
  }, [level, sigunguCache]);

  // 현재 레벨의 지역별 데이터 map
  // TopoJSON (2018)는 옛 이름("강원도", "전라북도")을 쓰고, 최신 DB는 "강원특별자치도",
  // "전북특별자치도"를 사용 → alias로 양쪽 모두 등록
  const DB_TO_TOPO_ALIAS: Record<string, string> = {
    "강원특별자치도": "강원도",
    "전북특별자치도": "전라북도",
  };
  const dataMap = useMemo(() => {
    const m = new Map<string, { cnt: number; nh: number }>();
    const put = (key: string, v: { cnt: number; nh: number }) => {
      m.set(key, v);
      const alias = DB_TO_TOPO_ALIAS[key];
      if (alias) m.set(alias, v);
    };
    if (level === "sido") {
      for (const c of sidoCards) put(c.sido, { cnt: c.dealCnt, nh: c.newHighCnt });
    } else {
      const code = level.split(":")[1];
      const sido = SIDO_CODE_TO_NAME[code];
      if (sido) {
        for (const c of sigunguBySido[sido] ?? []) {
          m.set(c.sigungu, { cnt: c.dealCnt, nh: c.newHighCnt });
        }
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, sidoCards, sigunguBySido]);

  const maxCnt = useMemo(() => {
    let mx = 0;
    for (const v of dataMap.values()) if (v.cnt > mx) mx = v.cnt;
    return mx;
  }, [dataMap]);

  const activeFeatures = useMemo(() => {
    if (level === "sido") {
      if (!sidoTopo) return [];
      const key = Object.keys(sidoTopo.objects)[0];
      const geo = sidoTopo.objects[key] as GeometryObject;
      const fc  = feature(sidoTopo, geo) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
      return fc.features;
    }
    const code = level.split(":")[1];
    return sigunguCache[code]?.features ?? [];
  }, [level, sidoTopo, sigunguCache]);

  const { pathFn, width, height, jejuTransform } = useMemo(() => {
    // 시도 뷰: 본토 focus (서쪽 섬 제외)로 더 큰 화면, 시군구는 자체 fit
    const w = 820, h = 760;
    if (activeFeatures.length === 0) return { pathFn: null as GeoPath | null, width: w, height: h, jejuTransform: null as string | null };
    const isNational = level === "sido";

    let proj;
    if (isNational) {
      // 본토 중심 — scale 조정으로 전체 보이도록 (제주 인셋은 별도)
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

    let jejuTransform: string | null = null;
    if (isNational) {
      const jeju = activeFeatures.find((f) => String(f.properties?.name ?? "") === "제주특별자치도");
      if (jeju) {
        const [[x0, y0], [x1, y1]] = pFn.bounds(jeju as unknown as GeoPermissibleObjects);
        const bw = x1 - x0, bh = y1 - y0, sc = 1.5;
        // 우하단에 겹치지 않게 배치
        const insetX = w - bw * sc - 20;
        const insetY = h - bh * sc - 20;
        jejuTransform = `translate(${(insetX - x0 * sc).toFixed(1)},${(insetY - y0 * sc).toFixed(1)}) scale(${sc})`;
      }
    }
    return { pathFn: pFn, width: w, height: h, jejuTransform };
  }, [activeFeatures, level]);

  const currentSido = level === "sido" ? null : SIDO_CODE_TO_NAME[level.split(":")[1]];

  // TopoJSON name → DB name 역매핑 (외부 Map 조회용)
  const TOPO_TO_DB_ALIAS: Record<string, string> = {
    "강원도":  "강원특별자치도",
    "전라북도": "전북특별자치도",
  };
  const lookupFromMap = <V,>(m: Map<string, V> | undefined, topoName: string): V | undefined => {
    if (!m) return undefined;
    const hit = m.get(topoName);
    if (hit !== undefined) return hit;
    const alias = TOPO_TO_DB_ALIAS[topoName];
    return alias ? m.get(alias) : undefined;
  };

  const hintText = level === "sido"
    ? "시도 클릭 → 시군구 보기"
    : onSigunguClick ? "시군구 클릭 → 읍면동 현황" : "시군구 거래 현황";

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e6ea", borderRadius: 12, padding: 20, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--color-text)" }}>
          {level === "sido" ? `${titlePrefix} 거래 히트맵` : `${currentSido} 시군구 거래 히트맵`}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {level !== "sido" && (
            <button type="button" onClick={() => setLevel("sido")}
              style={{ padding: "4px 12px", background: "var(--bp-primary-100)", color: "var(--bp-primary-500)", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              ← 전국으로
            </button>
          )}
          <span style={{ fontSize: 11, color: "var(--bp-gray-500)" }}>{hintText}</span>
        </div>
      </div>

      {!sidoTopo && <div style={{ padding: 40, textAlign: "center", color: "var(--bp-gray-400)" }}>지도 로딩 중…</div>}

      {sidoTopo && pathFn && activeFeatures.length > 0 && (
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", height: "auto", maxHeight: 850, display: "block", overflow: "hidden" }}
            onMouseLeave={() => { setTooltip(null); setHoverKey(null); }}>
            <defs>
              <clipPath id="map-clip"><rect x="0" y="0" width={width} height={height} /></clipPath>
            </defs>
            {(() => {
              const isSido = level === "sido";
              const renderFeatures = isSido
                ? activeFeatures.filter((f) => String(f.properties?.name ?? "") !== "제주특별자치도")
                : activeFeatures;
              return (
                <>
                  <g clipPath="url(#map-clip)">
                    {renderFeatures.map((f, i) => {
                      const name = String(f.properties?.name ?? "");
                      const code = String(f.properties?.code ?? "");
                      const key  = `${name}-${code || i}`;
                      const data = dataMap.get(name) ?? { cnt: 0, nh: 0 };
                      const weekCnt = lookupFromMap(weeklyDealMap, name) ?? data.cnt;
                      const pct = lookupFromMap(changePctMap, name);
                      const fill = changePctMap ? changePctFill(pct) : fillFor(data.cnt, maxCnt);
                      const clickable = isSido ? weekCnt > 0 : !!onSigunguClick;
                      return (
                        <path key={key} d={pathFn(f) ?? undefined} fill={fill}
                          stroke={hoverKey === key ? "#1a1e23" : "#ffffff"}
                          strokeWidth={hoverKey === key ? 1.8 : 0.7}
                          style={{ cursor: clickable ? "pointer" : "default", transition: "stroke 0.1s" }}
                          onMouseEnter={(e) => {
                            setHoverKey(key);
                            const parent = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                            setTooltip({ x: e.clientX - (parent?.left ?? 0), y: e.clientY - (parent?.top ?? 0), name, cnt: weekCnt, nh: data.nh, changePct: pct });
                          }}
                          onMouseMove={(e) => {
                            const parent = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                            setTooltip({ x: e.clientX - (parent?.left ?? 0), y: e.clientY - (parent?.top ?? 0), name, cnt: weekCnt, nh: data.nh, changePct: pct });
                          }}
                          onClick={() => {
                            if (isSido && weekCnt > 0) {
                              const c = SIDO_NAME_TO_CODE[name];
                              if (c) setLevel(`sigungu:${c}`);
                            } else if (!isSido && onSigunguClick) {
                              onSigunguClick(name);
                            }
                          }}
                        />
                      );
                    })}
                  </g>
                  {/* 라벨 */}
                  {renderFeatures.map((f, i) => {
                    const name = String(f.properties?.name ?? "");
                    const centroid = pathFn.centroid(f);
                    if (!centroid || Number.isNaN(centroid[0])) return null;
                    const area = pathFn.area(f);
                    if (!isSido && area < 600) return null;
                    const data = dataMap.get(name) ?? { cnt: 0, nh: 0 };
                    const weekCnt = lookupFromMap(weeklyDealMap, name) ?? data.cnt;
                    const pct = lookupFromMap(changePctMap, name);
                    const displayName = isSido ? (SIDO_ABBR[name] ?? name) : name;
                    // 시도 라벨 위치 수동 보정 (서울/경기/인천 겹침 방지)
                    const LABEL_OFFSET: Record<string, [number, number]> = {
                      "경기도":      [-30, -80],
                      "인천광역시":   [-120, -40],
                      "세종특별자치시": [0, 10],
                    };
                    const [ox, oy] = (isSido && LABEL_OFFSET[name]) || [0, 0];
                    const [cx, cy] = [centroid[0] + ox, centroid[1] + oy];
                    const pctColor = pct != null ? (pct >= 0 ? "#DC2626" : "#2563EB") : "#1a1e23";
                    return (
                      <g key={`label-${i}`} style={{ pointerEvents: "none" }}>
                        {/* 지역명 */}
                        <text x={cx} y={cy - (isSido ? 14 : 7)} textAnchor="middle"
                          stroke="#fff" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round"
                          style={{ fontSize: isSido ? 16 : 11, fontWeight: 800, fill: "#1a1e23" }}>
                          {displayName}
                        </text>
                        {/* 주간 거래량 */}
                        <text x={cx} y={cy + (isSido ? 4 : 4)} textAnchor="middle"
                          stroke="#fff" strokeWidth={3.5} paintOrder="stroke" strokeLinejoin="round"
                          style={{ fontSize: isSido ? 15 : 10, fontWeight: 800, fill: "#1a1e23", fontVariantNumeric: "tabular-nums" }}>
                          {weekCnt.toLocaleString()}건
                        </text>
                        {/* 증감% 또는 신고가 */}
                        {pct != null ? (
                          <text x={cx} y={cy + (isSido ? 20 : 16)} textAnchor="middle"
                            stroke="#fff" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round"
                            style={{ fontSize: isSido ? 13 : 9, fontWeight: 700, fill: pctColor }}>
                            {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                          </text>
                        ) : data.nh > 0 ? (
                          <text x={cx} y={cy + (isSido ? 21 : 17)} textAnchor="middle"
                            stroke="#fff" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round"
                            style={{ fontSize: isSido ? 13 : 9, fontWeight: 800, fill: "#DC2626" }}>
                            신고가 {data.nh}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </>
              );
            })()}

            {/* 제주 인셋 (시도 뷰에서만) */}
            {jejuTransform && (() => {
              const jeju = activeFeatures.find((f) => String(f.properties?.name ?? "") === "제주특별자치도");
              if (!jeju || !pathFn) return null;
              const data = dataMap.get("제주특별자치도") ?? { cnt: 0, nh: 0 };
              const weekCnt = weeklyDealMap?.get("제주특별자치도") ?? data.cnt;
              const pct = changePctMap?.get("제주특별자치도");
              const fill = changePctMap ? changePctFill(pct) : fillFor(data.cnt, maxCnt);
              const [[bx0, by0], [bx1, by1]] = pathFn.bounds(jeju as unknown as GeoPermissibleObjects);
              const pad = 6, scale = 1.8;
              const boxX = (width - (bx1 - bx0) * scale) - 16 - pad;
              const boxY = (height - (by1 - by0) * scale) - 16 - pad;
              const boxW = (bx1 - bx0) * scale + pad * 2;
              const boxH = (by1 - by0) * scale + pad * 2;
              const centroid = pathFn.centroid(jeju as unknown as GeoPermissibleObjects);
              return (
                <g>
                  <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={4}
                    fill="#f8f9fc" stroke="#e4e6ea" strokeWidth={0.8} />
                  <g transform={jejuTransform}>
                    <path d={pathFn(jeju) ?? undefined} fill={fill}
                      stroke="#ccc" strokeWidth={0.4}
                      style={{ cursor: "pointer" }}
                      onClick={() => { setLevel("sigungu:39"); }} />
                    <g style={{ pointerEvents: "none" }}>
                      <text x={centroid[0]} y={centroid[1] - 5} textAnchor="middle"
                        stroke="#fff" strokeWidth={1.8} paintOrder="stroke"
                        style={{ fontSize: 7, fontWeight: 800, fill: "#1a1e23" }}>제주</text>
                      <text x={centroid[0]} y={centroid[1] + 4} textAnchor="middle"
                        stroke="#fff" strokeWidth={1.5} paintOrder="stroke"
                        style={{ fontSize: 6, fontWeight: 700, fill: "#1a1e23" }}>{weekCnt}건</text>
                      {pct != null && (
                        <text x={centroid[0]} y={centroid[1] + 11} textAnchor="middle"
                          stroke="#fff" strokeWidth={1.5} paintOrder="stroke"
                          style={{ fontSize: 5.5, fontWeight: 700, fill: pct >= 0 ? "#DC2626" : "#2563EB" }}>
                          {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
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
            <div style={{
              position: "absolute",
              left: Math.min(tooltip.x + 12, width - 200),
              top:  Math.max(tooltip.y - 60, 0),
              background: "#fff", border: "1px solid #e4e6ea", borderRadius: 8,
              padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              pointerEvents: "none", whiteSpace: "nowrap", zIndex: 10,
            }}>
              <div style={{ fontWeight: 800, color: "var(--color-text)", fontSize: 12, marginBottom: 3 }}>{tooltip.name}</div>
              <div style={{ color: "var(--bp-gray-600)" }}>
                주간 거래 <strong style={{ color: "#2563EB" }}>{tooltip.cnt.toLocaleString()}</strong>건
              </div>
              {tooltip.changePct != null && (
                <div style={{ fontWeight: 700, color: tooltip.changePct >= 0 ? "#DC2626" : "#2563EB", marginTop: 1 }}>
                  {fmtChangePct(tooltip.changePct)} (평균 대비)
                </div>
              )}
              {tooltip.nh > 0 && !changePctMap && (
                <div style={{ color: "#DC2626", marginTop: 1, fontWeight: 700 }}>신고가 {tooltip.nh}건</div>
              )}
              {level === "sido" && tooltip.cnt > 0 && (
                <div style={{ color: "var(--bp-gray-400)", fontSize: 10, marginTop: 3 }}>클릭 → 시군구 보기</div>
              )}
              {level !== "sido" && onSigunguClick && (
                <div style={{ color: "var(--bp-gray-400)", fontSize: 10, marginTop: 3 }}>클릭 → 읍면동 현황</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 범례 */}
      {changePctMap ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 10, color: "#2563EB", fontWeight: 700 }}>평균↓</span>
          <div style={{ width: 200, height: 10, borderRadius: 5, background: "linear-gradient(to right, #2563EB, #f5f9ff 50%, #DC2626)" }} />
          <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 700 }}>평균↑</span>
          <span style={{ fontSize: 10, color: "var(--bp-gray-400)", marginLeft: 8 }}>기준: 역사적 주간 평균</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 10, color: "var(--bp-gray-500)", fontWeight: 600 }}>적음</span>
          <div style={{ width: 200, height: 10, borderRadius: 5, background: "linear-gradient(to right, #f5f9ff 0%, #2563EB 100%)" }} />
          <span style={{ fontSize: 10, color: "var(--bp-gray-500)", fontWeight: 600 }}>많음 (거래건수)</span>
          <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 700, marginLeft: 10 }}>● 신고가</span>
        </div>
      )}
    </div>
  );
}
