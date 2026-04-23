"use client";

import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { useTab9Data, getReboundSignal } from "@/lib/api/dailyTrades";
import { useTradesSilgga } from "@/lib/api/tradesData";
import TradesMap from "@/components/TradesMap";
import MedalBadge from "@/components/ui/MedalBadge";
import type {
  DailyTradesResponse,
  ReboundItem,
  ReboundDetailItem,
  PriceBucket,
} from "@/lib/types/dailyTrades";
import { PRICE_BUCKETS } from "@/lib/types/dailyTrades";
import type {
  NewHighDetailItem,
  TradesSilggaData,
  SigunguItem,
} from "@/lib/types/tradesData";

/* ============================================================
   유틸 함수
   ============================================================ */
function fmtPrice(manwon: number | null | undefined): string {
  if (manwon == null || isNaN(manwon)) return "—";
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    const r = Math.round(eok * 10) / 10;
    return r % 1 === 0 ? `${r}억` : `${r.toFixed(1)}억`;
  }
  const chun = Math.round(manwon / 100) / 10;
  return chun >= 1 ? `${chun}천만` : `${manwon.toLocaleString()}만`;
}

function fmtArea(m2: number | null | undefined): string {
  if (m2 == null || isNaN(m2)) return "—";
  return `${m2.toFixed(1)}m²`;
}

const SIDO_SHORT: Record<string, string> = {
  "서울특별시":     "서울",
  "부산광역시":     "부산",
  "대구광역시":     "대구",
  "인천광역시":     "인천",
  "광주광역시":     "광주",
  "대전광역시":     "대전",
  "울산광역시":     "울산",
  "세종특별자치시": "세종",
  "경기도":         "경기",
  "강원특별자치도": "강원",
  "강원도":         "강원",
  "충청북도":       "충북",
  "충청남도":       "충남",
  "전라북도":       "전북",
  "전북특별자치도": "전북",
  "전라남도":       "전남",
  "경상북도":       "경북",
  "경상남도":       "경남",
  "제주특별자치도": "제주",
};
function shortSido(sido: string | null | undefined): string {
  if (!sido) return "—";
  return SIDO_SHORT[sido] ?? sido;
}

function fmtDateShort(dateStr: string): string {
  // "2026-04-06" → "26.04.06"
  const [y, m, d] = dateStr.split("-");
  return `${y.slice(2)}.${m}.${d}`;
}

function fmtDateFull(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

/* ============================================================
   공통 로딩 / 에러
   ============================================================ */
function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 0" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ height: 48, borderRadius: 8, background: "#F0F2F6", animation: "pulse 1.5s ease-in-out infinite", opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ padding: 20, background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, color: "#DC2626", fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div>
        <p style={{ margin: 0, fontWeight: 600 }}>데이터를 불러오지 못했습니다</p>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{message}</p>
      </div>
    </div>
  );
}

/* ============================================================
   KB 월간 매매가격지수 캐시 (sido → points[])
   ============================================================ */
interface KBPoint { date: string; value: number; }

const kbCache: Map<string, KBPoint[]> = new Map();

async function fetchKBSeries(sido: string): Promise<KBPoint[]> {
  if (kbCache.has(sido)) return kbCache.get(sido)!;
  const since = `${new Date().getFullYear() - 10}-01`;
  const url = `/api/kb/series?type=${encodeURIComponent("매매가격지수")}&periodic=monthly&region=${encodeURIComponent(sido)}&since=${since}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch fail");
    const data = await res.json() as { points: KBPoint[] };
    kbCache.set(sido, data.points ?? []);
    return data.points ?? [];
  } catch {
    kbCache.set(sido, []);
    return [];
  }
}

/* ============================================================
   스파크라인 SVG — KB 월간 지수 10년 추이
   ============================================================ */
function MiniSparkline({ region, idx }: { region: string | null | undefined; idx: number }) {
  const id = `sg-${idx}`;
  const [points, setPoints] = useState<KBPoint[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!region) { setPoints([]); return; }
    fetchKBSeries(region).then((pts) => {
      if (mounted.current) setPoints(pts);
    });
    return () => { mounted.current = false; };
  }, [region]);

  const w = 90, h = 28, padX = 3, padY = 4;

  if (points.length < 2) {
    return (
      <div style={{ width: w, height: h + 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: w, height: h, background: "#F0F2F6", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    );
  }

  const vals = points.map((p) => p.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;

  const toX = (i: number) => padX + (i / (points.length - 1)) * (w - padX * 2);
  const toY = (v: number) => h - padY - ((v - minV) / rangeV) * (h - padY * 2);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${toX(points.length - 1).toFixed(1)},${h} L${toX(0).toFixed(1)},${h} Z`;

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const changePct = Math.round(((last - first) / first) * 100);
  const color = changePct >= 0 ? "#EC432C" : "#1A56DB";

  // 현재가 점 위치
  const cx = toX(points.length - 1);
  const cy = toY(last);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${id})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={cx} cy={cy} r={3} fill={color} />
      </svg>
      <span style={{ fontSize: 10, color, fontWeight: 700, lineHeight: 1 }}>
        {changePct >= 0 ? "+" : ""}{changePct}%
      </span>
    </div>
  );
}

/* ============================================================
   지역 필터 모달 (부스패치 스타일)
   ============================================================ */
interface RegionFilterModalProps {
  allSidos: string[];
  sigungusBySido: Record<string, string[]>;
  selectedSidos: string[];
  selectedSiggus: string[];
  onApply: (sidos: string[], siggus: string[]) => void;
  onClose: () => void;
}

function RegionFilterModal({ allSidos, sigungusBySido, selectedSidos, selectedSiggus, onApply, onClose }: RegionFilterModalProps) {
  const [localSidos, setLocalSidos] = useState<string[]>(selectedSidos);
  const [localSiggus, setLocalSiggus] = useState<string[]>(selectedSiggus);
  const [focusSido, setFocusSido] = useState<string | null>(selectedSidos[0] ?? allSidos[0] ?? null);

  const siggusForFocus = focusSido ? (sigungusBySido[focusSido] ?? []) : [];

  function toggleSido(sido: string) {
    const removing = localSidos.includes(sido);
    setLocalSidos((prev) => removing ? prev.filter((s) => s !== sido) : [...prev, sido]);
    if (removing) {
      const rm = sigungusBySido[sido] ?? [];
      setLocalSiggus((prev) => prev.filter((g) => !rm.includes(g)));
    }
    setFocusSido(sido);
  }

  function toggleSiggu(sg: string) {
    setLocalSiggus((prev) => prev.includes(sg) ? prev.filter((g) => g !== sg) : [...prev, sg]);
  }

  const CheckIcon = () => (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 16px 16px" }}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.42)" }} onClick={onClose} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 600, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E4E6EA" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1E23" }}>지역 필터</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#6B7280", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
        {/* 전국 버튼 */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #F0F2F6" }}>
          <button
            onClick={() => { setLocalSidos([]); setLocalSiggus([]); }}
            style={{ padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: localSidos.length === 0 ? "none" : "1px solid #D1D5DB", background: localSidos.length === 0 ? "#1A1E23" : "#fff", color: localSidos.length === 0 ? "#fff" : "#6B7280" }}
          >
            전국
          </button>
        </div>
        {/* 2-column */}
        <div style={{ display: "flex", height: 320, overflow: "hidden" }}>
          {/* 시/도 */}
          <div style={{ width: 168, borderRight: "1px solid #E4E6EA", overflowY: "auto", flexShrink: 0 }}>
            {allSidos.map((sido) => {
              const selected = localSidos.includes(sido);
              const isFocus = focusSido === sido;
              return (
                <button key={sido} onClick={() => toggleSido(sido)} onMouseEnter={() => setFocusSido(sido)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: isFocus ? "#F0F2F6" : "transparent", border: "none", cursor: "pointer", textAlign: "left", color: selected ? "#06b281" : "#1A1E23", fontWeight: selected ? 700 : 400, fontSize: 13 }}
                >
                  <span style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0, border: selected ? "none" : "1.5px solid #D1D5DB", background: selected ? "#06b281" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected && <CheckIcon />}
                  </span>
                  {shortSido(sido)}
                </button>
              );
            })}
          </div>
          {/* 시/군/구 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!focusSido && <div style={{ padding: "20px 16px", color: "#9CA3AF", fontSize: 13 }}>좌측에서 시/도를 선택하세요</div>}
            {focusSido && siggusForFocus.length === 0 && <div style={{ padding: "20px 16px", color: "#9CA3AF", fontSize: 13 }}>시군구 정보 없음</div>}
            {siggusForFocus.map((sg) => {
              const selected = localSiggus.includes(sg);
              return (
                <button key={sg} onClick={() => toggleSiggu(sg)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: selected ? "#F0FBF8" : "transparent", border: "none", cursor: "pointer", textAlign: "left", color: selected ? "#06b281" : "#1A1E23", fontWeight: selected ? 600 : 400, fontSize: 13 }}
                >
                  <span style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0, border: selected ? "none" : "1.5px solid #D1D5DB", background: selected ? "#06b281" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected && <CheckIcon />}
                  </span>
                  {sg}
                </button>
              );
            })}
          </div>
        </div>
        {/* Footer */}
        <div style={{ borderTop: "1px solid #E4E6EA", padding: "12px 20px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, minHeight: 28 }}>
            {localSidos.map((sido) => (
              <span key={sido} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#E7F8F4", color: "#18997d", fontSize: 12, fontWeight: 600 }}>
                {shortSido(sido)}
                <button onClick={() => toggleSido(sido)} style={{ background: "none", border: "none", cursor: "pointer", color: "#18997d", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
            {localSiggus.map((sg) => (
              <span key={sg} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#E7F8F4", color: "#18997d", fontSize: 12, fontWeight: 600 }}>
                {sg}
                <button onClick={() => toggleSiggu(sg)} style={{ background: "none", border: "none", cursor: "pointer", color: "#18997d", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
            {localSidos.length === 0 && <span style={{ fontSize: 12, color: "#9CA3AF", alignSelf: "center" }}>전국 (필터 없음)</span>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setLocalSidos([]); setLocalSiggus([]); }} style={{ padding: "8px 16px", border: "1px solid #D1D5DB", borderRadius: 8, background: "#fff", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>초기화</button>
            <button onClick={() => { onApply(localSidos, localSiggus); onClose(); }} style={{ padding: "8px 22px", border: "none", borderRadius: 8, background: "#1A1E23", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>적용하기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   신고가 테이블 행
   ============================================================ */
function NewHighRow({ t, idx }: { t: NewHighDetailItem; idx: number }) {
  const isEven = idx % 2 === 1;
  const rowBg = isEven ? "#F8F9FC" : "#fff";
  return (
    <tr
      style={{ borderBottom: "1px solid #F0F2F6", background: rowBg, transition: "background 0.1s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#EEF2FF"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
    >
      <td style={{ padding: "10px 12px", verticalAlign: "middle", textAlign: "center" }}>
        {t.rank <= 3
          ? <MedalBadge rank={t.rank as 1 | 2 | 3} />
          : <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#F0F2F6", color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{t.rank}</span>
        }
      </td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", display: "block", marginBottom: 1 }}>{shortSido(t.sido)}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1E23" }}>{t.sigungu}</span>
      </td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1E23", letterSpacing: "-0.2px" }}>{t.aptName}</span>
          {t.isNewHigh && (
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 18, borderRadius: 4,
              background: "#DC2626", color: "#fff",
              fontSize: 10, fontWeight: 800, flexShrink: 0,
            }}>신</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#9CA3AF", display: "block", marginTop: 1 }}>{t.dong}</span>
      </td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1E23" }}>{fmtArea(t.area)}</span>
        <span style={{ fontSize: 11, color: "#9CA3AF", display: "block" }}>{t.pyeong != null ? `${t.pyeong}평` : "—"}</span>
      </td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle", fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" }}>{t.floor != null ? `${t.floor}층` : "—"}</td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#1A1E23", letterSpacing: "-0.5px" }}>{fmtPrice(t.price)}</span>
      </td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        {t.isNewHigh && t.gap != null && t.gap > 0 ? (
          <>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#EC432C" }}>▲ {fmtPrice(t.gap)}</span>
            <span style={{ fontSize: 11, color: "#9CA3AF", display: "block", marginTop: 2 }}>전고 {fmtPrice(t.prevHigh)}</span>
          </>
        ) : t.prevHigh ? (
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>전고 {fmtPrice(t.prevHigh)}</span>
        ) : (
          <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>
        )}
      </td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
        <MiniSparkline region={t.sigungu} idx={idx} />
      </td>
      <td style={{ padding: "14px 12px", verticalAlign: "middle", fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap" }}>
        {t.dealDate ? fmtDateShort(t.dealDate) : "—"}
      </td>
    </tr>
  );
}

const TRADE_COLS = [
  { label: "#",          w: 44  },
  { label: "지역",       w: 100 },
  { label: "아파트명 / 동", w: undefined },
  { label: "전용면적",    w: 80  },
  { label: "층",          w: 48  },
  { label: "거래가",      w: 100 },
  { label: "전고가 대비",  w: 110 },
  { label: "시세 추이",   w: 110 },
  { label: "거래일",      w: 70  },
];

function NewHighTable({ trades }: { trades: NewHighDetailItem[] }) {
  return (
    <div style={{ overflowX: "auto" }} className="hide-scrollbar">
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E4E6EA", background: "#F8F9FC" }}>
            {TRADE_COLS.map((h) => (
              <th key={h.label} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6B7280", textAlign: "left", whiteSpace: "nowrap", width: h.w }}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, idx) => <NewHighRow key={`${t.aptName}-${t.dealDate ?? ""}-${idx}`} t={t} idx={idx} />)}
          {trades.length === 0 && (
            <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>조건에 맞는 신고가 거래가 없습니다</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   서브탭 1 — 신고가 주요거래
   ============================================================ */
type Period = "daily" | "weekly" | "monthly";

function SubTabNewHighs({ silgga }: { silgga: TradesSilggaData }) {
  const [period, setPeriod] = useState<Period>("daily");
  const [showFilter, setShowFilter] = useState(false);
  const [filterSidos, setFilterSidos] = useState<string[]>([]);
  const [filterSiggus, setFilterSiggus] = useState<string[]>([]);

  const availDates = useMemo(() => silgga.availableDates.meme.map((d) => d.date), [silgga]);
  const dailyDate = useMemo(() => silgga.availableDates.meme.find((d) => d.cnt >= 100)?.date ?? availDates[0] ?? "", [silgga, availDates]);

  const rawTrades = useMemo((): NewHighDetailItem[] => {
    const details = silgga.newHighDetails.meme;
    if (period === "daily") return (details[dailyDate] ?? []).map((t) => ({ ...t, dealDate: dailyDate }));
    const cutoff = period === "weekly" ? 7 : availDates.length;
    return availDates
      .slice(0, cutoff)
      .flatMap((d) => (details[d] ?? []).map((t) => ({ ...t, dealDate: d })))
      .sort((a, b) => b.price - a.price)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }, [silgga, period, dailyDate, availDates]);

  const allSidos = useMemo(() => [...new Set(rawTrades.map((t) => t.sido))].sort(), [rawTrades]);
  const sigungusBySido = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of rawTrades) {
      if (!map[t.sido]) map[t.sido] = [];
      if (!map[t.sido].includes(t.sigungu)) map[t.sido].push(t.sigungu);
    }
    for (const k of Object.keys(map)) map[k] = map[k].sort();
    return map;
  }, [rawTrades]);

  const trades = useMemo(() => {
    if (filterSidos.length === 0) return rawTrades;
    return rawTrades.filter((t) => filterSidos.includes(t.sido) && (filterSiggus.length === 0 || filterSiggus.includes(t.sigungu)));
  }, [rawTrades, filterSidos, filterSiggus]);

  const filterActive = filterSidos.length > 0;
  const periodLabel = period === "daily" ? `일간 · ${fmtDateShort(dailyDate)} 기준` : period === "weekly" ? "주간 · 최근 7일" : `월간 · 최근 ${availDates.length}일`;

  return (
    <div>
      {/* 컨트롤 바 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "#F0F2F6", borderRadius: 8, padding: 2 }}>
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: period === p ? "#fff" : "transparent", color: period === p ? "#1A1E23" : "#6B7280", fontWeight: period === p ? 700 : 400, fontSize: 13, boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
              {p === "daily" ? "일간" : p === "weekly" ? "주간" : "월간"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowFilter(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: filterActive ? "1.5px solid #06b281" : "1px solid #D1D5DB", background: filterActive ? "#E7F8F4" : "#fff", color: filterActive ? "#18997d" : "#6B7280", fontSize: 13, fontWeight: filterActive ? 600 : 400, cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          지역{filterActive ? ` (${filterSidos.length})` : ""}
        </button>
        {filterActive && <button onClick={() => { setFilterSidos([]); setFilterSiggus([]); }} style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 12, cursor: "pointer" }}>초기화</button>}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF" }}>{trades.length}건 · {periodLabel}</span>
      </div>

      {/* 필터 칩 */}
      {filterActive && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {filterSidos.map((s) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#E7F8F4", color: "#18997d", fontSize: 12, fontWeight: 600 }}>
              {shortSido(s)}
              <button onClick={() => setFilterSidos((p) => p.filter((x) => x !== s))} style={{ background: "none", border: "none", cursor: "pointer", color: "#18997d", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          {filterSiggus.map((sg) => (
            <span key={sg} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#E7F8F4", color: "#18997d", fontSize: 12, fontWeight: 600 }}>
              {sg}
              <button onClick={() => setFilterSiggus((p) => p.filter((x) => x !== sg))} style={{ background: "none", border: "none", cursor: "pointer", color: "#18997d", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* 신고가 거래 레이블 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#FFF0EE", color: "#EC432C", fontSize: 12, fontWeight: 700 }}>▲ 신고가 거래</span>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{trades.length}건</span>
      </div>

      <NewHighTable trades={trades} />

      {showFilter && (
        <RegionFilterModal allSidos={allSidos} sigungusBySido={sigungusBySido} selectedSidos={filterSidos} selectedSiggus={filterSiggus}
          onApply={(sidos, siggus) => { setFilterSidos(sidos); setFilterSiggus(siggus); }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   서브탭 2 — 오늘의 실거래가
   ============================================================ */
type TradeType = "meme" | "jeonse";

function SubTabTodayTrades({ silgga }: { silgga: TradesSilggaData }) {
  const availDates = silgga.availableDates.meme;
  const defaultDate = availDates.find((d) => d.cnt >= 100)?.date ?? availDates[0]?.date ?? "";

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [tradeType, setTradeType] = useState<TradeType>("meme");
  const [selectedSido, setSelectedSido] = useState<string | null>(null);
  const [selectedSiggu, setSelectedSiggu] = useState<string | null>(null);

  const summary = silgga.summaries[tradeType][selectedDate];
  const sigunguMap = silgga.sigunguSummaries[tradeType][selectedDate] ?? {};
  const newHighs = (silgga.newHighDetails[tradeType][selectedDate] ?? []).map((t) => ({ ...t, dealDate: selectedDate }));

  const sidoList = useMemo(() => [...new Set(summary?.sidoCards.map((c) => c.sido) ?? [])].sort(), [summary]);
  const sigunguList: SigunguItem[] = selectedSido ? (sigunguMap[selectedSido] ?? []) : [];

  const filteredHighs = useMemo(() => {
    let list = newHighs;
    if (selectedSido) list = list.filter((t) => t.sido === selectedSido);
    if (selectedSiggu) list = list.filter((t) => t.sigungu === selectedSiggu);
    return list;
  }, [newHighs, selectedSido, selectedSiggu]);

  const sidoCard = summary?.sidoCards.find((c) => c.sido === selectedSido) ?? null;

  return (
    <div>
      {/* 날짜 + 거래유형 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setSelectedSido(null); setSelectedSiggu(null); }}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#1A1E23", background: "#fff", cursor: "pointer" }}
        >
          {availDates.map((d) => (
            <option key={d.date} value={d.date}>{fmtDateFull(d.date)} ({d.cnt.toLocaleString()}건)</option>
          ))}
        </select>
        <div style={{ display: "flex", background: "#F0F2F6", borderRadius: 8, padding: 2 }}>
          {(["meme", "jeonse"] as TradeType[]).map((t) => (
            <button key={t} onClick={() => { setTradeType(t); setSelectedSido(null); setSelectedSiggu(null); }}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: tradeType === t ? "#fff" : "transparent", color: tradeType === t ? "#1A1E23" : "#6B7280", fontWeight: tradeType === t ? 700 : 400, fontSize: 13, boxShadow: tradeType === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
              {t === "meme" ? "매매" : "전세"}
            </button>
          ))}
        </div>
        {summary && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 13, color: "#6B7280" }}>
            <span>총 <strong style={{ color: "#1A1E23" }}>{summary.total.toLocaleString()}</strong>건</span>
            <span style={{ color: "#EC432C" }}>신고가 <strong>{summary.newHigh}</strong>건</span>
          </div>
        )}
      </div>

      {!summary ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>해당 날짜 데이터 없음</div>
      ) : (
        <>
          {/* 시/도 탭 */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }} className="hide-scrollbar">
            <button onClick={() => { setSelectedSido(null); setSelectedSiggu(null); }} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: selectedSido === null ? "#1A1E23" : "#F0F2F6", color: selectedSido === null ? "#fff" : "#6B7280", fontSize: 13, fontWeight: selectedSido === null ? 700 : 400 }}>전국</button>
            {sidoList.map((sido) => {
              const card = summary.sidoCards.find((c) => c.sido === sido);
              const active = selectedSido === sido;
              return (
                <button key={sido} onClick={() => { setSelectedSido(sido); setSelectedSiggu(null); }}
                  style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: active ? "#1A1E23" : "#F0F2F6", color: active ? "#fff" : "#6B7280", fontSize: 13, fontWeight: active ? 700 : 400 }}>
                  {shortSido(sido)} {card ? `(${card.dealCnt})` : ""}
                </button>
              );
            })}
          </div>

          {/* 요약 카드 */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {sidoCard ? [
              { label: "총 거래", value: `${sidoCard.dealCnt}건`, color: "#1A1E23" },
              { label: "신고가", value: `${sidoCard.newHighCnt}건`, color: "#EC432C" },
              { label: "84m² 평균", value: sidoCard.avg84 ? fmtPrice(sidoCard.avg84) : "—", color: "#1A56DB" },
              { label: "59m² 평균", value: sidoCard.avg59 ? fmtPrice(sidoCard.avg59) : "—", color: "#1A56DB" },
            ].map((c) => (
              <div key={c.label} style={{ flex: "1 1 100px", minWidth: 100, background: "#F8F9FC", border: "1px solid #E4E6EA", borderRadius: 10, padding: "12px 16px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{c.label}</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</p>
              </div>
            )) : [
              { label: "총 거래", value: `${summary.total.toLocaleString()}건`, color: "#1A1E23" },
              { label: "신고가", value: `${summary.newHigh}건`, color: "#EC432C" },
            ].map((c) => (
              <div key={c.label} style={{ flex: "1 1 120px", minWidth: 120, background: "#F8F9FC", border: "1px solid #E4E6EA", borderRadius: 10, padding: "12px 16px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{c.label}</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* ── 주요 신고가 거래 ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#FFF0EE", color: "#EC432C", fontSize: 12, fontWeight: 700 }}>▲ 주요 신고가 거래</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{filteredHighs.length}건</span>
            </div>
            {filteredHighs.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13, background: "#F8F9FC", borderRadius: 10 }}>해당 날짜·지역의 신고가 거래 없음</div>
            ) : (
              <NewHighTable trades={filteredHighs} />
            )}
          </div>

          {/* ── 일반 거래 현황 ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#F0F2F6", color: "#6B7280", fontSize: 12, fontWeight: 600 }}>일반 거래 현황</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{selectedSido ? `${shortSido(selectedSido)} · 시군구별` : "전국 · 시/도별"}</span>
            </div>

            {/* 시/도 미선택: 시/도별 */}
            {!selectedSido && (
              <div style={{ overflowX: "auto" }} className="hide-scrollbar">
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E4E6EA", background: "#F8F9FC" }}>
                      {["시/도", "총 거래", "신고가", "84m² 평균", "59m² 평균"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6B7280", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.sidoCards.sort((a, b) => b.dealCnt - a.dealCnt).map((card, idx) => {
                      const isEven = idx % 2 === 1;
                      return (
                        <tr key={card.sido} style={{ borderBottom: "1px solid #F0F2F6", background: isEven ? "#F8F9FC" : "#fff", cursor: "pointer", transition: "background 0.1s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#EEF2FF"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isEven ? "#F8F9FC" : "#fff"; }}
                          onClick={() => { setSelectedSido(card.sido); setSelectedSiggu(null); }}
                        >
                          <td style={{ padding: "12px 12px", fontWeight: 600, fontSize: 14, color: "#1A1E23" }}>{shortSido(card.sido)}</td>
                          <td style={{ padding: "12px 12px", fontWeight: 700, fontSize: 14 }}>{card.dealCnt.toLocaleString()}건</td>
                          <td style={{ padding: "12px 12px", fontSize: 14, color: "#EC432C", fontWeight: 600 }}>{card.newHighCnt > 0 ? `▲ ${card.newHighCnt}건` : "—"}</td>
                          <td style={{ padding: "12px 12px", fontSize: 14, color: "#1A56DB", fontWeight: 600 }}>{card.avg84 ? fmtPrice(card.avg84) : "—"}</td>
                          <td style={{ padding: "12px 12px", fontSize: 14, color: "#1A56DB", fontWeight: 600 }}>{card.avg59 ? fmtPrice(card.avg59) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 시/도 선택: 시군구별 */}
            {selectedSido && (
              <>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, paddingBottom: 2 }} className="hide-scrollbar">
                  <button onClick={() => setSelectedSiggu(null)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: selectedSiggu === null ? "#06b281" : "#F0F2F6", color: selectedSiggu === null ? "#fff" : "#6B7280", fontSize: 12, fontWeight: selectedSiggu === null ? 700 : 400 }}>전체</button>
                  {sigunguList.map((sg) => (
                    <button key={sg.sigungu} onClick={() => setSelectedSiggu(sg.sigungu)}
                      style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: selectedSiggu === sg.sigungu ? "#06b281" : "#F0F2F6", color: selectedSiggu === sg.sigungu ? "#fff" : "#6B7280", fontSize: 12, fontWeight: selectedSiggu === sg.sigungu ? 700 : 400 }}>
                      {sg.sigungu} ({sg.dealCnt})
                    </button>
                  ))}
                </div>
                <div style={{ overflowX: "auto" }} className="hide-scrollbar">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #E4E6EA", background: "#F8F9FC" }}>
                        {["시/군/구", "총 거래", "신고가", "84m² 평균", "59m² 평균"].map((h) => (
                          <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6B7280", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSiggu ? sigunguList.filter((s) => s.sigungu === selectedSiggu) : sigunguList)
                        .sort((a, b) => b.dealCnt - a.dealCnt)
                        .map((sg, idx) => {
                          const isEven = idx % 2 === 1;
                          return (
                            <tr key={sg.sigungu} style={{ borderBottom: "1px solid #F0F2F6", background: isEven ? "#F8F9FC" : "#fff", transition: "background 0.1s" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#EEF2FF"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isEven ? "#F8F9FC" : "#fff"; }}
                            >
                              <td style={{ padding: "12px 12px", fontWeight: 600, fontSize: 14, color: "#1A1E23" }}>{sg.sigungu}</td>
                              <td style={{ padding: "12px 12px", fontWeight: 700, fontSize: 14 }}>{sg.dealCnt.toLocaleString()}건</td>
                              <td style={{ padding: "12px 12px", fontSize: 14, color: "#EC432C", fontWeight: 600 }}>{sg.newHighCnt > 0 ? `▲ ${sg.newHighCnt}건` : "—"}</td>
                              <td style={{ padding: "12px 12px", fontSize: 14, color: "#1A56DB", fontWeight: 600 }}>{sg.avg84 ? fmtPrice(sg.avg84) : "—"}</td>
                              <td style={{ padding: "12px 12px", fontSize: 14, color: "#1A56DB", fontWeight: 600 }}>{sg.avg59 ? fmtPrice(sg.avg59) : "—"}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   주간 거래 통계 계산 유틸
   ============================================================ */
const SIDO_CODE_TO_NAME_LOCAL: Record<string, string> = {
  "11": "서울특별시", "21": "부산광역시", "22": "대구광역시", "23": "인천광역시",
  "24": "광주광역시", "25": "대전광역시", "26": "울산광역시", "29": "세종특별자치시",
  "31": "경기도", "32": "강원특별자치도", "33": "충청북도", "34": "충청남도",
  "35": "전라북도", "36": "전라남도", "37": "경상북도", "38": "경상남도",
  "39": "제주특별자치도",
};

/** "2026-04-07" → 해당 주 일요일 날짜 문자열 */
/** 해당 날짜가 속한 주의 일요일 (로컬 타임존, YYYY-MM-DD) */
function getWeekSunday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** 최신 데이터 날짜 기준, reporting 안정화된 마지막 주(일~토)의 일요일.
 *  국토부 실거래는 거래일 + 30일 내 신고 규정 → 2주 버퍼로 안정적 비교 보장 */
function getLastCompleteWeekSunday(latestDate: string): string {
  const REPORTING_BUFFER_DAYS = 14;
  const d = new Date(latestDate + "T00:00:00");
  d.setDate(d.getDate() - REPORTING_BUFFER_DAYS);
  // 그 날짜의 토요일(포함)로 이동
  const daysBackToSat = (d.getDay() + 1) % 7; // Sun=0→1, Mon=1→2, ..., Sat=6→0
  d.setDate(d.getDate() - daysBackToSat);
  // 해당 주의 일요일은 그 토요일 - 6
  d.setDate(d.getDate() - 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

interface SgWeekEntry {
  sido: string;
  sigungu: string;
  sggCode: string;
  weeks: Map<string, number>; // weekSunday → 누적 dealCnt
}

interface WeeklyStatsResult {
  sidoStats: Map<string, { currentWeekCnt: number; avgCnt: number; pct: number }>;
  sigunguStats: Map<string, Map<string, { sggCode: string; currentWeekCnt: number; avgCnt: number; pct: number }>>;
  currentWeekSunday: string;
}

function computeWeeklyStats(silgga: TradesSilggaData): WeeklyStatsResult {
  const dates = silgga.availableDates.meme.map((d) => d.date); // desc
  if (dates.length === 0) {
    return { sidoStats: new Map(), sigunguStats: new Map(), currentWeekSunday: "" };
  }

  // 최신 날짜가 주중인 경우 해당 주는 reporting 데이터가 불완전 → 마지막 완전 주 사용
  const currentWeekSunday = getLastCompleteWeekSunday(dates[0]);

  // 시군구별 주차별 누적
  const sgMap = new Map<string, SgWeekEntry>();
  for (const date of dates) {
    const weekKey = getWeekSunday(date);
    const dayData = silgga.sigunguSummaries.meme[date] ?? {};
    for (const sido of Object.keys(dayData)) {
      for (const sg of dayData[sido]) {
        const key = `${sido}|${sg.sigungu}`;
        if (!sgMap.has(key)) sgMap.set(key, { sido, sigungu: sg.sigungu, sggCode: sg.sggCode, weeks: new Map() });
        const entry = sgMap.get(key)!;
        entry.weeks.set(weekKey, (entry.weeks.get(weekKey) ?? 0) + sg.dealCnt);
      }
    }
  }

  // 시군구 → 통계
  const sigunguStats = new Map<string, Map<string, { sggCode: string; currentWeekCnt: number; avgCnt: number; pct: number }>>();
  const sidoWeeks = new Map<string, Map<string, number>>();

  for (const [, entry] of sgMap) {
    const currentCnt = entry.weeks.get(currentWeekSunday) ?? 0;
    const pastKeys = [...entry.weeks.keys()].filter((wk) => wk !== currentWeekSunday);
    const avgCnt = pastKeys.length > 0
      ? pastKeys.reduce((s, wk) => s + (entry.weeks.get(wk) ?? 0), 0) / pastKeys.length
      : currentCnt;
    const pct = avgCnt > 0 ? ((currentCnt - avgCnt) / avgCnt) * 100 : 0;

    if (!sigunguStats.has(entry.sido)) sigunguStats.set(entry.sido, new Map());
    sigunguStats.get(entry.sido)!.set(entry.sigungu, { sggCode: entry.sggCode, currentWeekCnt: currentCnt, avgCnt, pct });

    if (!sidoWeeks.has(entry.sido)) sidoWeeks.set(entry.sido, new Map());
    const sidoWm = sidoWeeks.get(entry.sido)!;
    for (const [wk, cnt] of entry.weeks) sidoWm.set(wk, (sidoWm.get(wk) ?? 0) + cnt);
  }

  // 시도 → 통계
  const sidoStats = new Map<string, { currentWeekCnt: number; avgCnt: number; pct: number }>();
  for (const [sido, weeks] of sidoWeeks) {
    const currentCnt = weeks.get(currentWeekSunday) ?? 0;
    const pastKeys = [...weeks.keys()].filter((wk) => wk !== currentWeekSunday);
    const avgCnt = pastKeys.length > 0
      ? pastKeys.reduce((s, wk) => s + (weeks.get(wk) ?? 0), 0) / pastKeys.length
      : currentCnt;
    const pct = avgCnt > 0 ? ((currentCnt - avgCnt) / avgCnt) * 100 : 0;
    sidoStats.set(sido, { currentWeekCnt: currentCnt, avgCnt, pct });
  }

  return { sidoStats, sigunguStats, currentWeekSunday };
}

/* ============================================================
   서브탭 3 — 지역별 거래 현황 (지도 히트맵 + 읍면동 드릴다운)
   ============================================================ */
type TradesMapLevel = "sido" | `sigungu:${string}`;

function SubTabTradesMap({ silgga }: { silgga: TradesSilggaData }) {
  const [level, setLevel] = useState<TradesMapLevel>("sido");
  const [selectedSigungu, setSelectedSigungu] = useState<string | null>(null);
  const [selectedDong, setSelectedDong] = useState<string | null>(null);

  const weeklyStats = useMemo(() => computeWeeklyStats(silgga), [silgga]);

  // TradesMap sidoCards (주간 거래량)
  const sidoCards = useMemo(() =>
    [...weeklyStats.sidoStats.entries()].map(([sido, s]) => ({
      sido, dealCnt: s.currentWeekCnt, newHighCnt: 0,
    })), [weeklyStats]);

  // TradesMap sigunguBySido (주간 거래량)
  const sigunguBySido = useMemo(() => {
    const r: Record<string, Array<{ sigungu: string; sggCode: string; dealCnt: number; newHighCnt: number }>> = {};
    for (const [sido, sgMap] of weeklyStats.sigunguStats) {
      r[sido] = [...sgMap.entries()].map(([sg, s]) => ({ sigungu: sg, sggCode: s.sggCode, dealCnt: s.currentWeekCnt, newHighCnt: 0 }));
    }
    return r;
  }, [weeklyStats]);

  // 현재 레벨에 맞는 changePctMap
  const changePctMap = useMemo(() => {
    const m = new Map<string, number>();
    if (level === "sido") {
      for (const [sido, s] of weeklyStats.sidoStats) m.set(sido, s.pct);
    } else {
      const sidoName = SIDO_CODE_TO_NAME_LOCAL[level.split(":")[1]] ?? "";
      for (const [sg, s] of weeklyStats.sigunguStats.get(sidoName) ?? new Map()) m.set(sg, s.pct);
    }
    return m;
  }, [level, weeklyStats]);

  // 현재 레벨에 맞는 weeklyDealMap
  const weeklyDealMap = useMemo(() => {
    const m = new Map<string, number>();
    if (level === "sido") {
      for (const [sido, s] of weeklyStats.sidoStats) m.set(sido, s.currentWeekCnt);
    } else {
      const sidoName = SIDO_CODE_TO_NAME_LOCAL[level.split(":")[1]] ?? "";
      for (const [sg, s] of weeklyStats.sigunguStats.get(sidoName) ?? new Map()) m.set(sg, s.currentWeekCnt);
    }
    return m;
  }, [level, weeklyStats]);

  // 선택된 시군구의 읍면동 집계 (이번 주 전체 거래)
  // 1) emdWeekly (신규 데이터) 우선 — 주간 전체 거래건수 포함
  // 2) newHighDetails 로 신고가 상세(거래 리스트)도 병합
  const dongData = useMemo(() => {
    if (!selectedSigungu || level === "sido") return null;
    const sidoName = SIDO_CODE_TO_NAME_LOCAL[level.split(":")[1]] ?? "";
    const { currentWeekSunday } = weeklyStats;
    const weekDates = silgga.availableDates.meme
      .map((d) => d.date)
      .filter((d) => getWeekSunday(d) === currentWeekSunday);

    // 해당 시군구의 sggCode
    const sgStatsEntry = weeklyStats.sigunguStats.get(sidoName)?.get(selectedSigungu);
    const sggCode = sgStatsEntry?.sggCode;

    // emdWeekly에서 해당 주 · 시군구의 읍면동별 주간 거래
    const emdWeeklyRow = (sggCode && silgga.emdWeekly)
      ? (silgga.emdWeekly.meme?.[currentWeekSunday]?.[sggCode] ?? [])
      : [];
    const emdStatsMap = new Map<string, { dealCnt: number; newHighCnt: number; maxPrice: number | null }>();
    for (const e of emdWeeklyRow) {
      emdStatsMap.set(e.emd, { dealCnt: e.dealCnt, newHighCnt: e.newHighCnt, maxPrice: e.maxPrice });
    }

    const dongMap = new Map<string, NewHighDetailItem[]>();
    for (const date of weekDates) {
      for (const t of silgga.newHighDetails.meme[date] ?? []) {
        if (t.sido === sidoName && t.sigungu === selectedSigungu) {
          if (!dongMap.has(t.dong)) dongMap.set(t.dong, []);
          dongMap.get(t.dong)!.push({ ...t, dealDate: date });
        }
      }
    }

    // 모든 읍면동 (주간 거래 O 또는 신고가 O) — union
    const allDongs = new Set<string>([...emdStatsMap.keys(), ...dongMap.keys()]);
    const rows = [...allDongs].map((dong) => {
      const nhTrades = dongMap.get(dong) ?? [];
      const emdStat  = emdStatsMap.get(dong);
      const nhCnt    = emdStat?.newHighCnt ?? nhTrades.length;
      const dealCnt  = emdStat?.dealCnt ?? nhTrades.length;
      const maxP     = emdStat?.maxPrice
        ?? (nhTrades.length > 0 ? Math.max(...nhTrades.map((t) => t.price)) : null);
      return {
        dong,
        dealCnt,      // 주간 총 거래건수
        cnt: nhCnt,   // 주간 신고가 건수 (기존 의미 유지)
        maxPrice: maxP ?? 0,
        trades: nhTrades.sort((a, b) => b.price - a.price),
      };
    });
    // 주간 거래 많은 순, 동점일 때 신고가 많은 순
    return rows.sort((a, b) => (b.dealCnt - a.dealCnt) || (b.cnt - a.cnt));
  }, [selectedSigungu, level, silgga, weeklyStats]);

  // 선택된 동의 거래 목록
  const dongTrades = useMemo(() =>
    (!selectedDong || !dongData) ? [] : (dongData.find((d) => d.dong === selectedDong)?.trades ?? []),
    [selectedDong, dongData]);

  const selectedSidoName = level === "sido" ? "" : (SIDO_CODE_TO_NAME_LOCAL[level.split(":")[1]] ?? "");
  const sgStats = (selectedSigungu && selectedSidoName)
    ? weeklyStats.sigunguStats.get(selectedSidoName)?.get(selectedSigungu)
    : null;

  const showSidePanel = !!(level !== "sido" && selectedSigungu && dongData);

  const weekLabel = weeklyStats.currentWeekSunday ? `${fmtDateShort(weeklyStats.currentWeekSunday)} 주 (일~토)` : "";

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1A1E23" }}>지역별 거래 현황</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6B7280" }}>
            주간(일~토) 거래량 · 지난 12주 평균 대비 증감 {weekLabel && `· ${weekLabel}`}
            <span style={{ marginLeft: 8, fontSize: 11, color: "#9CA3AF" }}>
              (국토부 신고 기한 감안해 2주 전 주 기준)
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#DC2626", display: "inline-block" }} />
          <span style={{ fontSize: 11, color: "#6B7280" }}>평균↑</span>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#2563EB", display: "inline-block", marginLeft: 6 }} />
          <span style={{ fontSize: 11, color: "#6B7280" }}>평균↓</span>
        </div>
      </div>

      {/* 지도 + 사이드 패널 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: showSidePanel ? "minmax(0, 1fr) 300px" : "1fr",
        gap: 16,
        alignItems: "start",
      }}>
        {/* 지도 */}
        <TradesMap
          sidoCards={sidoCards}
          sigunguBySido={sigunguBySido}
          level={level}
          onLevelChange={(l) => { setLevel(l); setSelectedSigungu(null); setSelectedDong(null); }}
          titlePrefix="주간"
          changePctMap={changePctMap}
          weeklyDealMap={weeklyDealMap}
          onSigunguClick={(name) => {
            setSelectedSigungu(name === selectedSigungu ? null : name);
            setSelectedDong(null);
          }}
        />

        {/* 읍면동 테이블 (시군구 선택 시) */}
        {showSidePanel && (
          <div style={{ border: "1px solid #E4E6EA", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            {/* 패널 헤더 */}
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F0F2F6", background: "#F8F9FC" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1A1E23" }}>
                    {shortSido(selectedSidoName)} {selectedSigungu}
                  </h4>
                  {sgStats && (
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        주간 <strong style={{ color: "#1A1E23" }}>{sgStats.currentWeekCnt.toLocaleString()}</strong>건
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sgStats.pct >= 0 ? "#EC432C" : "#2563EB" }}>
                        {sgStats.pct >= 0 ? "▲ +" : "▼ "}{Math.abs(sgStats.pct).toFixed(1)}%
                      </span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                        (평균 {Math.round(sgStats.avgCnt)}건)
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedSigungu(null); setSelectedDong(null); }}
                  style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                >×</button>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9CA3AF" }}>
                이번 주 신고가 거래 기준 · 동 클릭 → 상세 거래 확인
              </p>
            </div>

            {/* 동 목록 */}
            <div style={{ maxHeight: 480, overflowY: "auto" }}>
              {dongData!.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                  이번 주 거래 없음
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8F9FC", borderBottom: "1px solid #F0F2F6" }}>
                      <th style={{ padding: "8px 14px", fontSize: 11, color: "#6B7280", fontWeight: 600, textAlign: "left" }}>읍면동</th>
                      <th style={{ padding: "8px 14px", fontSize: 11, color: "#6B7280", fontWeight: 600, textAlign: "right" }}>주간 거래</th>
                      <th style={{ padding: "8px 14px", fontSize: 11, color: "#6B7280", fontWeight: 600, textAlign: "right" }}>신고가</th>
                      <th style={{ padding: "8px 14px", fontSize: 11, color: "#6B7280", fontWeight: 600, textAlign: "right" }}>최고가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dongData!.map((d) => {
                      const isSelected = selectedDong === d.dong;
                      return (
                        <tr
                          key={d.dong}
                          style={{ borderBottom: "1px solid #F0F2F6", background: isSelected ? "#E7F8F4" : "#fff", cursor: "pointer", transition: "background 0.1s" }}
                          onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#F0F2F6"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? "#E7F8F4" : "#fff"; }}
                          onClick={() => setSelectedDong(isSelected ? null : d.dong)}
                        >
                          <td style={{ padding: "11px 14px", fontSize: 13, color: "#1A1E23" }}>
                            {isSelected && <span style={{ marginRight: 4, color: "#06b281", fontSize: 10 }}>▶</span>}
                            <span style={{ fontWeight: isSelected ? 700 : 500 }}>{d.dong}</span>
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "#1A1E23", textAlign: "right" }}>
                            {d.dealCnt}건
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: d.cnt > 0 ? "#EC432C" : "#9CA3AF", textAlign: "right" }}>
                            {d.cnt > 0 ? `${d.cnt}건` : "—"}
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "#1A56DB", textAlign: "right" }}>
                            {d.maxPrice ? fmtPrice(d.maxPrice) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 하단 거래 테이블 (동 선택 시) */}
      {selectedDong && dongTrades.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ padding: "3px 10px", borderRadius: 20, background: "#FFF0EE", color: "#EC432C", fontSize: 12, fontWeight: 700 }}>
              ▲ 신고가
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1E23" }}>
              {selectedSigungu} {selectedDong}
            </span>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              주간 {dongTrades.length}건 · 가격 높은 순
            </span>
            <button
              onClick={() => setSelectedDong(null)}
              style={{ marginLeft: "auto", background: "none", border: "1px solid #E4E6EA", borderRadius: 6, color: "#6B7280", cursor: "pointer", fontSize: 12, padding: "4px 10px" }}
            >
              닫기
            </button>
          </div>
          <NewHighTable trades={dongTrades} />
        </div>
      )}
    </div>
  );
}

const tdStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, verticalAlign: "middle" };

/* ============================================================
   서브탭 4 — 반등거래 분석 (기존)
   ============================================================ */
/** 신규 반등거래 데이터 타입 (public/data/rebound-trades.json) */
interface ReboundRow {
  sggCode: string;
  sido: string;
  sigungu: string;
  total:   number;
  rebound: number;
  rate:    number;  // 0~100
}
interface ReboundPayload {
  lastUpdated: string;
  methodology: string;
  monthly: Record<string, ReboundRow[]>;  // key: "2026-04-01"
  weekly:  Record<string, ReboundRow[]>;  // key: "2026-03-29" (week sunday)
}

type ReboundGranularity = "monthly" | "weekly";

function fmtPeriodLabel(period: string, gr: ReboundGranularity): string {
  if (gr === "monthly") {
    const [y, m] = period.split("-");
    return `${y}년 ${parseInt(m)}월`;
  }
  // weekly → "2026-03-29 주 (일~토)"
  const d = new Date(period + "T00:00:00");
  const endD = new Date(d);
  endD.setDate(d.getDate() + 6);
  const fmt = (x: Date) => `${String(x.getMonth() + 1).padStart(2, "0")}.${String(x.getDate()).padStart(2, "0")}`;
  return `${fmt(d)} ~ ${fmt(endD)} 주`;
}

function SubTabReboundTrades(_: { data: DailyTradesResponse; silgga?: TradesSilggaData | null }) {
  const [payload, setPayload] = useState<ReboundPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<ReboundGranularity>("monthly");
  const [period, setPeriod] = useState<string | null>(null);
  const [minTrades, setMinTrades] = useState<number>(5);
  const [expandedKey, setExpandedKey] = useState<string | null>(null); // sggCode
  const [detailTrades, setDetailTrades] = useState<ReboundDetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/data/rebound-trades.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: ReboundPayload) => setPayload(d))
      .catch((e) => setErr(String(e)));
  }, []);

  // 가용 기간 목록 (내림차순). granularity 변경 시 가장 최신 선택
  const availablePeriods = useMemo<string[]>(() => {
    if (!payload) return [];
    const keys = Object.keys(granularity === "monthly" ? payload.monthly : payload.weekly);
    return keys.sort((a, b) => (a < b ? 1 : -1));
  }, [payload, granularity]);

  useEffect(() => {
    if (availablePeriods.length > 0 && (!period || !availablePeriods.includes(period))) {
      setPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, period]);

  const rows = useMemo<ReboundRow[]>(() => {
    if (!payload || !period) return [];
    const src = granularity === "monthly" ? payload.monthly[period] : payload.weekly[period];
    return (src ?? [])
      .filter((r) => r.total >= minTrades)
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [payload, granularity, period, minTrades]);

  // 행 펼칠 때 세부 내역 API 호출
  useEffect(() => {
    if (!expandedKey || !period) {
      setDetailTrades([]);
      return;
    }
    setDetailLoading(true);
    setDetailTrades([]);
    const url = `/api/rebound-details?granularity=${granularity}&period=${encodeURIComponent(period)}&sggCode=${encodeURIComponent(expandedKey)}`;
    fetch(url)
      .then((r) => r.json())
      .then((d: { details: ReboundDetailItem[] }) => setDetailTrades(d.details ?? []))
      .catch(() => setDetailTrades([]))
      .finally(() => setDetailLoading(false));
  }, [expandedKey, period, granularity]);

  if (err) {
    return (
      <section style={{ padding: 24, textAlign: "center", background: "#FEF2F2", borderRadius: 12, color: "#DC2626" }}>
        데이터를 불러오지 못했습니다: {err}
        <p style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>
          <code>python scripts/export_rebound.py</code>로 JSON을 생성하세요.
        </p>
      </section>
    );
  }
  if (!payload) {
    return <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>데이터 로딩 중…</div>;
  }

  const totalRebound = rows.reduce((s, r) => s + r.rebound, 0);
  const totalAll     = rows.reduce((s, r) => s + r.total, 0);
  const overallRate  = totalAll > 0 ? ((totalRebound / totalAll) * 100).toFixed(1) : "0.0";

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>반등거래 분석</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6B7280" }}>
            동일 단지 + 동일 평형 기준 · {period ? fmtPeriodLabel(period, granularity) : "—"}
          </p>
        </div>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>업데이트: {payload.lastUpdated.slice(0, 10)}</span>
      </div>

      {/* 컨트롤 바 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "12px 16px", background: "#fff", border: "1px solid #E4E6EA", borderRadius: 10, marginBottom: 14,
      }}>
        {/* 월간/주간 토글 */}
        <div style={{ display: "flex", background: "#F0F2F6", borderRadius: 8, padding: 2, gap: 2 }}>
          {(["monthly", "weekly"] as const).map((g) => (
            <button key={g} type="button" onClick={() => setGranularity(g)}
              style={{
                padding: "6px 16px", borderRadius: 6, border: "none",
                background: granularity === g ? "#fff" : "transparent",
                boxShadow: granularity === g ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                color: granularity === g ? "#1A1E23" : "#6B7280",
                fontSize: 12, fontWeight: granularity === g ? 800 : 600, cursor: "pointer",
              }}>
              {g === "monthly" ? "월간" : "주간"}
            </button>
          ))}
        </div>

        {/* 기간 선택 */}
        <select value={period ?? ""} onChange={(e) => setPeriod(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#fff", cursor: "pointer", outline: "none" }}>
          {availablePeriods.map((p) => (
            <option key={p} value={p}>{fmtPeriodLabel(p, granularity)}</option>
          ))}
        </select>

        {/* 최소 거래건수 필터 */}
        <label style={{ fontSize: 11, color: "#6B7280", marginLeft: 6 }}>
          최소 거래:
          <select value={minTrades} onChange={(e) => setMinTrades(Number(e.target.value))}
            style={{ marginLeft: 4, padding: "4px 8px", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 11, background: "#fff" }}>
            {[1, 5, 10, 20].map((n) => <option key={n} value={n}>{n}건↑</option>)}
          </select>
        </label>

        {/* 전체 요약 */}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#6B7280" }}>
          집계 시군구 <strong style={{ color: "#1A1E23" }}>{rows.length}</strong>개 ·
          전체 반등율 <strong style={{ color: "#1A1E23" }}> {overallRate}%</strong>
        </div>
      </div>

      {/* 설명 */}
      <div style={{ background: "#F8F9FC", border: "1px solid #E4E6EA", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 13 }}>반등거래란?</p>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
          해당 단지 · 동일 평형(5㎡ 버킷)의 <strong>전{granularity === "monthly" ? "월" : "주"} 평균 실거래가보다 높게 거래</strong>된 경우를 반등거래로 집계합니다.
          반등비율이 높을수록 해당 시군구의 상승 모멘텀이 강한 신호입니다. 신고가(역대최고)와는 다른 지표입니다.
          <span style={{ color: "#9CA3AF" }}> (직전 기간 비교 기준 없는 거래는 분모에서 제외)</span>
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { range: "50% 이상", label: "상승 모멘텀", rate: 60 },
            { range: "30~50%",   label: "관망",       rate: 40 },
            { range: "30% 미만", label: "가격 조정",   rate: 10 },
          ].map((g) => {
            const sig = getReboundSignal(g.rate);
            return (
              <span key={g.range} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: sig.bg, borderRadius: 20, fontSize: 11, fontWeight: 700, color: sig.color }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: sig.color, display: "inline-block" }} />
                {g.range}: {g.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* 테이블 */}
      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
          해당 기간·조건의 데이터가 없습니다.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }} className="hide-scrollbar">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 580 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E4E6EA", background: "#F8F9FC" }}>
                {["순위", "시도", "시군구", granularity === "monthly" ? "이달 거래" : "이주 거래", "반등 건수", "반등거래율", "신호", ""].map((h, i) => (
                  <th key={i} style={{ ...tdStyle, fontWeight: 600, color: "#9CA3AF", fontSize: 11, textAlign: i === 7 ? "center" : "left", width: i === 7 ? 36 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => {
                const rank = i + 1;
                const signal = getReboundSignal(r.rate);
                const isExpanded = expandedKey === r.sggCode;
                const rowBg = isExpanded ? "#F0FBF8" : i % 2 === 1 ? "#F8F9FC" : "#fff";
                return (
                  <Fragment key={`${r.sggCode}-${r.sigungu}`}>
                    {/* ── 메인 행 ── */}
                    <tr
                      style={{ borderBottom: isExpanded ? "none" : "1px solid #F0F2F6", background: rowBg, cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.background = "#EEF6FF"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                      onClick={() => setExpandedKey(isExpanded ? null : r.sggCode)}
                    >
                      <td style={tdStyle}>
                        {rank <= 3 ? (
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            <MedalBadge rank={rank as 1 | 2 | 3} />
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, color: "#9CA3AF", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{rank}</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: "#9CA3AF", fontSize: 12 }}>{shortSido(r.sido)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.sigungu}</td>
                      <td style={{ ...tdStyle, color: "#6B7280" }}>{r.total.toLocaleString()}건</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.rebound.toLocaleString()}건</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: "#F0F2F6", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, r.rate)}%`, height: "100%", background: signal.color, borderRadius: 99 }} />
                          </div>
                          <span style={{ color: signal.color, fontWeight: 800, minWidth: 48, fontVariantNumeric: "tabular-nums" }}>
                            {r.rate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: signal.bg, color: signal.color, fontSize: 11, fontWeight: 700 }}>
                          {signal.label}
                        </span>
                      </td>
                      {/* 펼침 버튼 */}
                      <td style={{ ...tdStyle, textAlign: "center", width: 36, paddingRight: 12 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: 6,
                          background: isExpanded ? signal.bg : "#F0F2F6",
                          color: isExpanded ? signal.color : "#9CA3AF",
                          fontSize: 9, fontWeight: 700,
                          transition: "transform 0.2s, background 0.15s",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        }}>▶</span>
                      </td>
                    </tr>

                    {/* ── 상세 펼침 행 ── */}
                    {isExpanded && (
                      <tr style={{ borderBottom: `2px solid ${signal.color}`, background: "#F0FBF8" }}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div style={{
                            margin: "0 8px 12px 48px",
                            borderLeft: `3px solid ${signal.color}`,
                            borderRadius: "0 0 8px 0",
                            background: "#fff",
                            boxShadow: "inset 0 -2px 8px rgba(0,0,0,0.03)",
                            overflow: "hidden",
                          }}>
                            {/* 상세 헤더 */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px 8px", borderBottom: "1px solid #F0F2F6", background: "#FAFBFC" }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: signal.color, flexShrink: 0, display: "inline-block" }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1E23" }}>
                                {r.sido} {r.sigungu} · 반등거래 세부 내역
                              </span>
                              {detailTrades.length > 0 && (
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{detailTrades.length}건</span>
                              )}
                              <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>
                                전월평균 대비 상승 거래 (가격 높은 순)
                              </span>
                            </div>

                            {detailLoading ? (
                              <div style={{ padding: "18px 16px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
                                로딩 중…
                              </div>
                            ) : detailTrades.length === 0 ? (
                              <div style={{ padding: "18px 16px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
                                세부 내역은 최근 3개월/8주 분만 제공됩니다.
                              </div>
                            ) : (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: "#F8F9FC" }}>
                                    {["읍면동", "단지명", "면적", "층", "거래가", "거래일", "전월평균", "전월대비"].map((h) => (
                                      <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#9CA3AF", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailTrades.map((t, j) => (
                                    <tr key={j} style={{ borderTop: "1px solid #F0F2F6", background: j % 2 === 1 ? "#FAFBFC" : "#fff" }}>
                                      <td style={{ padding: "9px 12px", color: "#6B7280", whiteSpace: "nowrap" }}>{t.emdName || "—"}</td>
                                      <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1A1E23" }}>{t.aptName}</td>
                                      <td style={{ padding: "9px 12px", color: "#6B7280", whiteSpace: "nowrap" }}>{t.area != null ? `${t.area}㎡` : "—"}</td>
                                      <td style={{ padding: "9px 12px", color: "#6B7280", whiteSpace: "nowrap" }}>{t.floor != null ? `${t.floor}층` : "—"}</td>
                                      <td style={{ padding: "9px 12px", fontWeight: 800, color: "#EC432C", whiteSpace: "nowrap" }}>{fmtPrice(t.price)}</td>
                                      <td style={{ padding: "9px 12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{fmtDateShort(t.dealDate)}</td>
                                      <td style={{ padding: "9px 12px", color: "#6B7280", whiteSpace: "nowrap" }}>{fmtPrice(t.prevMonthAvg)}</td>
                                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#06b281", whiteSpace: "nowrap" }}>
                                        {t.changePct != null ? `+${t.changePct.toFixed(1)}%` : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {rows.length > 100 && (
            <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 10 }}>
              상위 100개 표시 · 전체 {rows.length}개
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   서브탭 5 — 가격대별 인기 아파트 (기존)
   ============================================================ */
const AREA_FILTERS = ["전체", "59m²이하", "84m²"] as const;
type AreaFilter = (typeof AREA_FILTERS)[number];

function SubTabPriceRange({ data }: { data: DailyTradesResponse }) {
  const [bucket, setBucket] = useState<PriceBucket>("2억");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("전체");
  const [sidoFilter, setSidoFilter] = useState<string>("전체");
  const [sigunguFilter, setSigunguFilter] = useState<string>("전체");

  const priceRange = data.priceRange;
  const rawList = priceRange?.buckets?.[bucket] ?? [];

  // 시도 옵션 (선택된 bucket+area 기준)
  const areaOk = (apt: typeof rawList[number]) => {
    if (areaFilter === "전체") return true;
    if (areaFilter === "59m²이하") return apt.avgArea <= 66;
    if (areaFilter === "84m²") return apt.avgArea > 66 && apt.avgArea <= 95;
    return true;
  };
  const sidoOptions = useMemo(
    () => ["전체", ...Array.from(new Set(rawList.filter(areaOk).map((a) => a.sido))).sort()],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawList, areaFilter]
  );
  const sigunguOptions = useMemo(() => {
    if (sidoFilter === "전체") return ["전체"];
    return ["전체", ...Array.from(new Set(rawList.filter((a) => a.sido === sidoFilter && areaOk(a)).map((a) => a.sigungu))).sort()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawList, sidoFilter, areaFilter]);

  // 시도/시군구 변경 시 시군구 초기화
  useEffect(() => { setSigunguFilter("전체"); }, [sidoFilter, bucket, areaFilter]);

  const filtered = rawList.filter((apt) => {
    if (!areaOk(apt)) return false;
    if (sidoFilter    !== "전체" && apt.sido    !== sidoFilter)    return false;
    if (sigunguFilter !== "전체" && apt.sigungu !== sigunguFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>가격대별 인기 아파트</h3>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{priceRange?.generatedRange}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {PRICE_BUCKETS.map((b) => (
          <button key={b} onClick={() => setBucket(b)} style={{ padding: "6px 14px", borderRadius: 20, border: bucket === b ? "none" : "1px solid #E4E6EA", background: bucket === b ? "#1A1E23" : "#fff", color: bucket === b ? "#fff" : "#6B7280", fontSize: 13, fontWeight: bucket === b ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>{b}대</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {AREA_FILTERS.map((a) => (
            <button key={a} onClick={() => setAreaFilter(a)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${areaFilter === a ? "#1A1E23" : "#E4E6EA"}`, background: areaFilter === a ? "#1A1E23" : "#fff", color: areaFilter === a ? "#fff" : "#6B7280", fontSize: 12, fontWeight: areaFilter === a ? 700 : 400, cursor: "pointer" }}>{a}</button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: "#E4E6EA" }} />

        {/* 시도 필터 */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6B7280" }}>
          시도
          <select value={sidoFilter} onChange={(e) => setSidoFilter(e.target.value)}
            style={{ padding: "5px 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#fff", cursor: "pointer", outline: "none" }}>
            {sidoOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        {/* 시군구 필터 (시도 선택시) */}
        {sidoFilter !== "전체" && sigunguOptions.length > 1 && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6B7280" }}>
            시군구
            <select value={sigunguFilter} onChange={(e) => setSigunguFilter(e.target.value)}
              style={{ padding: "5px 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#fff", cursor: "pointer", outline: "none" }}>
              {sigunguOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}

        <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>
          <strong style={{ color: "#1A1E23" }}>{filtered.length}</strong>개 단지
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#F8F9FC", borderBottom: "2px solid #E4E6EA" }}>
              {["#", "아파트", "위치", "면적", "거래", "평균가", "실거래 범위", "최신 실거래"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: h === "#" || h === "거래" ? "center" : "left", fontWeight: 600, color: "#6B7280", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>해당 조건의 거래 데이터가 없습니다</td></tr>
            ) : filtered.map((apt, idx) => {
              const isEven = idx % 2 === 1;
              const rowBg = isEven ? "#F8F9FC" : "#fff";
              const short = apt.sido.replace("특별자치시","").replace("특별자치도","").replace("특별시","").replace("광역시","").replace("도","");
              const localRank = idx + 1; // 필터 적용 후 로컬 순위
              return (
                <tr key={`${apt.aptName}-${idx}`} style={{ borderBottom: "1px solid #F0F2F6", background: rowBg, transition: "background 0.1s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#EEF2FF"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                >
                  <td style={{ padding: "14px 12px", textAlign: "center", verticalAlign: "middle" }}>
                    {localRank <= 3 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <MedalBadge rank={localRank as 1 | 2 | 3} />
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{localRank}</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                    {apt.danjiId
                      ? <Link href={`https://www.boospatch.com/danji/${apt.danjiId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: "#1A1E23", textDecoration: "none" }}>{apt.aptName}</Link>
                      : <span style={{ fontSize: 14, fontWeight: 700 }}>{apt.aptName}</span>}
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF", display: "block" }}>{short}</span>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{apt.sigungu}</span>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap", color: "#6B7280" }}>{apt.avgArea}m²({apt.avgPyeong}평)</td>
                  <td style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center", whiteSpace: "nowrap" }}><span style={{ fontSize: 14, fontWeight: 700 }}>{apt.tradeCnt}건</span></td>
                  <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}><span style={{ fontSize: 15, fontWeight: 800, color: "#EC432C", letterSpacing: "-0.3px" }}>{apt.avgPrice}</span></td>
                  <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap", color: "#6B7280", fontSize: 12 }}>{apt.minPrice} ~ {apt.maxPrice}</td>
                  <td style={{ padding: "14px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{apt.latestPrice}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF", display: "block", marginTop: 1 }}>({apt.latestDate?.slice(5).replace("-", ".")}, {apt.latestFloor}층)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   Tab9DailyTrades — 메인
   ============================================================ */
const SUB_TABS = [
  { id: "new-high",    label: "신고가 주요거래" },
  { id: "today",       label: "오늘의 실거래가" },
  { id: "regional",    label: "지역별 거래 현황" },
  { id: "rebound",     label: "반등거래 분석" },
  { id: "price-range", label: "가격대별 인기 아파트" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export default function Tab9DailyTrades() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("new-high");
  const silggaState = useTradesSilgga();
  const dailyState = useTab9Data();

  function renderContent() {
    // new-high, today, regional 모두 silgga 데이터 사용
    if (activeSubTab === "new-high" || activeSubTab === "today" || activeSubTab === "regional") {
      if (silggaState.status === "loading") return <LoadingSkeleton />;
      if (silggaState.status === "error") return <ErrorBanner message={silggaState.message} />;
      if (activeSubTab === "new-high") return <SubTabNewHighs silgga={silggaState.data} />;
      if (activeSubTab === "regional") return <SubTabTradesMap silgga={silggaState.data} />;
      return <SubTabTodayTrades silgga={silggaState.data} />;
    }
    if (dailyState.status === "loading") return <LoadingSkeleton />;
    if (dailyState.status === "error") return <ErrorBanner message={dailyState.message} />;
    if (activeSubTab === "rebound")     return <SubTabReboundTrades  data={dailyState.data} silgga={silggaState.status === "success" ? silggaState.data : null} />;
    if (activeSubTab === "price-range") return <SubTabPriceRange     data={dailyState.data} />;
    return null;
  }

  return (
    <section style={{ padding: "var(--space-6) 0" }}>
      <div role="tablist" aria-label="데일리 실거래 서브탭"
        style={{ display: "flex", gap: 0, overflowX: "auto", marginBottom: 24, borderBottom: "2px solid #E4E6EA" }}
        className="hide-scrollbar"
      >
        {SUB_TABS.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={activeSubTab === tab.id} onClick={() => setActiveSubTab(tab.id)}
            style={{ padding: "12px 18px", border: "none", cursor: "pointer", borderBottom: activeSubTab === tab.id ? "2px solid #1A56DB" : "2px solid transparent", background: "transparent", color: activeSubTab === tab.id ? "#1A56DB" : "#9CA3AF", fontWeight: activeSubTab === tab.id ? 700 : 400, fontSize: 14, whiteSpace: "nowrap", marginBottom: "-2px", transition: "color 0.15s" }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{renderContent()}</div>
    </section>
  );
}
