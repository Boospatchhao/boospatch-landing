"use client";

import { useState, useEffect, useCallback } from "react";

/* ============================================================
   Types
   ============================================================ */
interface GapItem {
  naverId: number;
  name: string;
  sido: string;
  sigungu: string;
  emd: string;
  pyeongS: number;
  pyeongL: number;
  hogaS: number;
  hogaL: number;
  gap: number;
  gapPct: number;
  householdCount: number;
  sparkS: [number, (number | null)[]] | [];
  sparkL: [number, (number | null)[]] | [];
}

type GapType  = "59_84" | "84_115";
type SortKey  = "gapPct" | "gap" | "hogaS" | "hogaL";

/* ============================================================
   상수
   ============================================================ */
const GAP_TYPES: { id: GapType; label: string; desc: string }[] = [
  { id: "59_84",  label: "59㎡ ↔ 84㎡",  desc: "22~26평 ↔ 31~35평" },
  { id: "84_115", label: "84㎡ ↔ 115㎡", desc: "31~35평 ↔ 39~45평" },
];

const SIDO_LIST = [
  "전체",
  "서울특별시","경기도","인천광역시",
  "부산광역시","대구광역시","대전광역시","광주광역시","울산광역시","세종특별자치시",
  "강원특별자치도","충청북도","충청남도","전라북도","전북특별자치도","전라남도",
  "경상북도","경상남도","제주특별자치도",
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "gapPct", label: "갭% 낮은 순" },
  { key: "gap",    label: "갭 금액 낮은 순" },
  { key: "hogaS",  label: "소형 호가 높은 순" },
  { key: "hogaL",  label: "대형 호가 높은 순" },
];

/* ============================================================
   Helpers
   ============================================================ */
function fmtPrice(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${Math.round(v / 1000)}천만`;
}

function shortSido(sido: string): string {
  const MAP: Record<string, string> = {
    "서울특별시":"서울","경기도":"경기","인천광역시":"인천",
    "부산광역시":"부산","대구광역시":"대구","대전광역시":"대전",
    "광주광역시":"광주","울산광역시":"울산","세종특별자치시":"세종",
    "강원특별자치도":"강원","강원도":"강원","충청북도":"충북",
    "충청남도":"충남","전라북도":"전북","전북특별자치도":"전북",
    "전라남도":"전남","경상북도":"경북","경상남도":"경남",
    "제주특별자치도":"제주",
  };
  return MAP[sido] ?? sido;
}

function gapColor(pct: number): string {
  if (pct <= 2)  return "#06b281";
  if (pct <= 8)  return "#F97316";
  return "#6b7280";
}

/* ============================================================
   듀얼 스파크라인 SVG (소형=파랑, 대형=오렌지)
   ============================================================ */
const SPARK_W = 120;
const SPARK_H = 38;
const COLOR_S = "#1A56DB";
const COLOR_L = "#F97316";

function DualSparkline({
  sparkS,
  sparkL,
}: {
  sparkS: GapItem["sparkS"];
  sparkL: GapItem["sparkL"];
}) {
  // spark = [startYear, [val|null, ...]] or []
  const toPoints = (spark: GapItem["sparkS"]): number[] => {
    if (!spark || spark.length === 0) return [];
    const vals = spark[1] as (number | null)[];
    return vals.filter((v): v is number => v !== null);
  };

  const ptsS = toPoints(sparkS);
  const ptsL = toPoints(sparkL);
  if (ptsS.length < 2 && ptsL.length < 2) {
    return <span style={{ fontSize: 10, color: "var(--bp-gray-300)" }}>데이터 없음</span>;
  }

  // 전체 Y 범위 (두 시리즈 합산)
  const allVals = [...ptsS, ...ptsL].filter(Boolean);
  const minY = Math.min(...allVals);
  const maxY = Math.max(...allVals);
  const rangeY = maxY - minY || 1;

  // 각 시리즈의 X 범위 (spark[0]=시작년도 기준)
  const toSvgPoints = (spark: GapItem["sparkS"]): string => {
    if (!spark || spark.length === 0) return "";
    const startYear = spark[0] as number;
    const vals      = spark[1] as (number | null)[];
    const points: string[] = [];
    vals.forEach((v, i) => {
      if (v == null) return;
      const year = startYear + i;
      const x = ((year - 2006) / (2026 - 2006)) * SPARK_W;
      const y = SPARK_H - 4 - ((v - minY) / rangeY) * (SPARK_H - 8);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    return points.join(" ");
  };

  const svgS = toSvgPoints(sparkS);
  const svgL = toSvgPoints(sparkL);

  // 현재 시점 마지막 도트
  const lastDot = (spark: GapItem["sparkS"], color: string) => {
    if (!spark || spark.length === 0) return null;
    const vals = spark[1] as (number | null)[];
    let lastVal: number | null = null;
    let lastIdx = -1;
    vals.forEach((v, i) => { if (v != null) { lastVal = v; lastIdx = i; } });
    if (lastVal == null) return null;
    const year = (spark[0] as number) + lastIdx;
    const x = ((year - 2006) / (2026 - 2006)) * SPARK_W;
    const y = SPARK_H - 4 - ((lastVal - minY) / rangeY) * (SPARK_H - 8);
    return <circle key={color} cx={x} cy={y} r={2.5} fill={color} />;
  };

  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} aria-hidden style={{ display: "block", overflow: "visible" }}>
      {/* 기준선 */}
      <line x1={0} y1={SPARK_H - 2} x2={SPARK_W} y2={SPARK_H - 2} stroke="var(--bp-gray-100)" strokeWidth={1} />
      {/* 소형 라인 */}
      {svgS && (
        <polyline points={svgS} fill="none" stroke={COLOR_S} strokeWidth={1.6}
          strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* 대형 라인 */}
      {svgL && (
        <polyline points={svgL} fill="none" stroke={COLOR_L} strokeWidth={1.6}
          strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      )}
      {lastDot(sparkS, COLOR_S)}
      {lastDot(sparkL, COLOR_L)}
    </svg>
  );
}

/* ============================================================
   테이블 행
   ============================================================ */
function GapRow({ item, onCompare }: { item: GapItem; onCompare: (item: GapItem) => void }) {
  const color = gapColor(item.gapPct);

  return (
    <tr
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bp-gray-50)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
      style={{ borderBottom: "1px solid var(--bp-gray-100)" }}
    >
      {/* 단지명 + 위치 (단지상세 링크) */}
      <td style={{ padding: "10px 14px", minWidth: 150 }}>
        <a
          href={`https://www.boospatch.com/danji/${item.naverId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "var(--bp-gray-900)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--bp-primary-500)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--bp-gray-900)"; }}
        >
          {item.name}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ opacity: 0.55 }}>
            <path d="M7 17L17 7" /><path d="M7 7h10v10" />
          </svg>
        </a>
        <div style={{ fontSize: 11, color: "var(--bp-gray-500)", marginTop: 2 }}>
          {shortSido(item.sido)} {item.sigungu} {item.emd}
        </div>
        <div style={{ fontSize: 10, color: "var(--bp-gray-400)", marginTop: 1 }}>
          {item.householdCount?.toLocaleString()}세대
        </div>
      </td>

      {/* 소형 호가 */}
      <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLOR_S }}>{fmtPrice(item.hogaS)}</div>
        <div style={{ fontSize: 10, color: "var(--bp-gray-400)", marginTop: 1 }}>{item.pyeongS}평</div>
      </td>

      {/* 화살표 */}
      <td style={{ padding: "0 4px", textAlign: "center", color: "var(--bp-gray-300)", fontSize: 13 }}>→</td>

      {/* 대형 호가 */}
      <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLOR_L }}>{fmtPrice(item.hogaL)}</div>
        <div style={{ fontSize: 10, color: "var(--bp-gray-400)", marginTop: 1 }}>{item.pyeongL}평</div>
      </td>

      {/* 갭 금액 */}
      <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>
          {item.gap === 0 ? "동일" : `+${fmtPrice(item.gap)}`}
        </div>
      </td>

      {/* 갭% 뱃지 */}
      <td style={{ padding: "10px 10px", textAlign: "center" }}>
        <span style={{
          display: "inline-block", padding: "3px 9px", borderRadius: 20,
          fontSize: 12, fontWeight: 700,
          background: `${color}18`, color,
        }}>
          {item.gapPct === 0 ? "0%" : `+${item.gapPct}%`}
        </span>
      </td>

      {/* 스파크라인 */}
      <td style={{ padding: "8px 12px" }}>
        <div>
          <DualSparkline sparkS={item.sparkS} sparkL={item.sparkL} />
          {/* 범례 */}
          <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 9, color: COLOR_S }}>{item.pyeongS}평</span>
            <span style={{ fontSize: 9, color: COLOR_L }}>{item.pyeongL}평</span>
            <span style={{ fontSize: 9, color: "var(--bp-gray-300)", marginLeft: "auto" }}>
              06~현재
            </span>
          </div>
        </div>
      </td>

      {/* 입지 리포트 버튼 */}
      <td style={{ padding: "10px 12px", textAlign: "center" }}>
        <button
          onClick={() => onCompare(item)}
          style={{
            padding: "5px 10px", borderRadius: 6,
            border: "1.5px solid var(--bp-primary-100)",
            background: "var(--bp-primary-100)", color: "var(--bp-primary-500)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bp-green-100)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bp-primary-100)"; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          입지 리포트
        </button>
      </td>
    </tr>
  );
}

/* ============================================================
   정렬 가능 헤더 셀
   ============================================================ */
function SortTh({
  label, sortK, active, asc, onSort,
}: {
  label: string; sortK: SortKey; active: SortKey; asc: boolean;
  onSort: (k: SortKey) => void;
}) {
  const isActive = active === sortK;
  return (
    <th
      onClick={() => onSort(sortK)}
      style={{
        padding: "9px 10px", textAlign: "right", fontSize: 11,
        fontWeight: 600, color: isActive ? "var(--bp-primary-500)" : "var(--bp-gray-500)",
        cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
      }}
    >
      {label} {isActive ? (asc ? "↑" : "↓") : ""}
    </th>
  );
}

/* ============================================================
   Tab6Gap — 메인
   ============================================================ */
export default function Tab6Gap() {
  const [gapType,   setGapType]   = useState<GapType>("59_84");
  const [sido,      setSido]      = useState("전체");
  const [sortKey,   setSortKey]   = useState<SortKey>("gapPct");
  const [sortAsc,   setSortAsc]   = useState(true);
  const [items,     setItems]     = useState<GapItem[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback((type: GapType, sidoVal: string) => {
    setLoading(true);
    const params = new URLSearchParams({ type, limit: "300" });
    if (sidoVal !== "전체") params.set("sido", sidoVal);
    fetch(`/api/pyeong-gap?${params}`)
      .then((r) => r.json())
      .then((d: { items: GapItem[]; total: number; updatedAt: string }) => {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
        setUpdatedAt(d.updatedAt ?? "");
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(gapType, sido); }, [gapType, sido, load]);

  /* 정렬 */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === "gapPct" || key === "gap"); }
  };

  const sorted = [...items].sort((a, b) => {
    let diff = 0;
    if (sortKey === "gapPct") diff = a.gapPct - b.gapPct;
    else if (sortKey === "gap")   diff = a.gap - b.gap;
    else if (sortKey === "hogaS") diff = a.hogaS - b.hogaS;
    else if (sortKey === "hogaL") diff = a.hogaL - b.hogaL;
    return sortAsc ? diff : -diff;
  });

  /* 단지비교로 이동 */
  const handleCompare = useCallback((item: GapItem) => {
    sessionStorage.setItem("preloadDanjiId", String(item.naverId));
    window.location.hash = "#compare";
  }, []);

  const activeGap = GAP_TYPES.find((g) => g.id === gapType)!;

  return (
    <section style={{ padding: "var(--space-6) 0", display: "flex", flexDirection: "column", gap: "var(--space-4)", fontFamily: "var(--font-sans)" }}>

      {/* 헤더 */}
      <div>
        <h2 style={{ margin: 0, fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", color: "var(--bp-gray-900)" }}>
          평형갭 분석
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--bp-gray-500)" }}>
          소형 ↔ 대형 매매호가 차이가 좁혀진 단지 — 스파크라인으로 2006년~현재 시세 흐름 확인
        </p>
      </div>

      {/* 컨트롤 바 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {/* 갭 유형 탭 */}
        <div style={{ display: "flex", background: "var(--bp-gray-100)", borderRadius: 8, padding: 3, gap: 2 }}>
          {GAP_TYPES.map((g) => (
            <button
              key={g.id}
              onClick={() => { setGapType(g.id); setSido("전체"); }}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none",
                background: gapType === g.id ? "#fff" : "transparent",
                color: gapType === g.id ? "var(--bp-gray-900)" : "var(--bp-gray-500)",
                fontWeight: gapType === g.id ? 700 : 400, fontSize: 13,
                cursor: "pointer", boxShadow: gapType === g.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.12s", whiteSpace: "nowrap",
              }}
            >
              {g.label}
              <span style={{ fontSize: 10, color: "var(--bp-gray-400)", marginLeft: 4 }}>{g.desc}</span>
            </button>
          ))}
        </div>

        {/* 시도 드롭다운 */}
        <select
          value={sido}
          onChange={(e) => setSido(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid var(--bp-gray-200)", fontSize: 13, color: "var(--bp-gray-700)", background: "#fff", cursor: "pointer" }}
        >
          {SIDO_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* 건수 */}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--bp-gray-400)", whiteSpace: "nowrap" }}>
          {total.toLocaleString()}건{updatedAt && ` · ${updatedAt} 기준`}
        </span>
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { color: "#06b281", label: "0~2% 완전 수렴" },
          { color: "#F97316", label: "2~8% 근접" },
          { color: "#6b7280", label: "8%+ 일반" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--bp-gray-500)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
        <span style={{ fontSize: 11, color: "var(--bp-gray-400)", marginLeft: 4 }}>
          스파크라인: <span style={{ color: COLOR_S }}>━</span> 소형&nbsp;
          <span style={{ color: COLOR_L }}>━</span> 대형 · 헤더 클릭 시 정렬
        </span>
      </div>

      {/* 테이블 */}
      <div style={{ background: "#fff", border: "1.5px solid var(--bp-gray-200)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--bp-gray-400)", fontSize: 13 }}>
            불러오는 중…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--bp-gray-200)", background: "var(--bp-gray-50)" }}>
                  <th style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--bp-gray-500)", whiteSpace: "nowrap" }}>
                    단지명 · 위치 ({activeGap.desc})
                  </th>
                  <SortTh label="소형 호가" sortK="hogaS" active={sortKey} asc={sortAsc} onSort={handleSort} />
                  <th />
                  <SortTh label="대형 호가" sortK="hogaL" active={sortKey} asc={sortAsc} onSort={handleSort} />
                  <SortTh label="가격차이"  sortK="gap"   active={sortKey} asc={sortAsc} onSort={handleSort} />
                  <SortTh label="갭%"       sortK="gapPct" active={sortKey} asc={sortAsc} onSort={handleSort} />
                  <th style={{ padding: "9px 12px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--bp-gray-500)", whiteSpace: "nowrap" }}>
                    실거래가 추이
                  </th>
                  <th style={{ padding: "9px 12px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--bp-gray-500)" }}>
                    바로가기
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--bp-gray-400)", fontSize: 13 }}>
                      해당 조건의 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <GapRow
                      key={`${item.naverId}-${item.pyeongS}`}
                      item={item}
                      onCompare={handleCompare}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 11, color: "var(--bp-gray-400)", padding: "0 2px" }}>
        * 매매호가(중간값) 기준 · 갭 수렴 단지는 대형 전환 수요 증가 신호로 해석 가능
        · &quot;입지 리포트&quot; 클릭 시 단지비교 탭에서 상세 분석
      </p>
    </section>
  );
}
