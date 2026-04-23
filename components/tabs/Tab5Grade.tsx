"use client";

import { useState, useMemo } from "react";
import {
  GRADE_ITEMS,
  APT_DETAILS,
  GRADE_STYLE,
} from "@/lib/mock/tab5";
import type { GradeLevel, GradeItem, AptDetail } from "@/lib/mock/tab5";

/* ============================================================
   검색바
   ============================================================ */
function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      {/* 검색 아이콘 */}
      <span
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--color-text-muted)",
          pointerEvents: "none",
          display: "flex",
        }}
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 10.5L13.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        placeholder="단지명 또는 지역 검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "var(--space-3) var(--space-4) var(--space-3) 36px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text)",
          background: "#fff",
          outline: "none",
          transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-primary)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,86,219,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {value && (
        <button
          aria-label="검색어 초기화"
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            padding: 2,
            display: "flex",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ============================================================
   급지 칩
   ============================================================ */
function GradeChip({
  item,
  isSelected,
  onClick,
}: {
  item: GradeItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const s = GRADE_STYLE[item.grade];
  return (
    <button
      onClick={onClick}
      title={`${item.name} — ${s.label}`}
      style={{
        padding: "var(--space-2) var(--space-4)",
        background: s.bg,
        color: s.color,
        border: item.grade === 5 ? "0.5px solid var(--bp-gray-200)" : "none",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-semibold)",
        cursor: "pointer",
        textAlign: "left",
        outline: isSelected ? `2px solid ${item.grade <= 2 ? "#fff" : "var(--color-primary)"}` : "none",
        outlineOffset: 2,
        boxShadow: isSelected ? "var(--shadow-md)" : "none",
        transform: isSelected ? "translateY(-1px)" : "none",
        transition: "transform var(--transition-fast), box-shadow var(--transition-fast)",
        whiteSpace: "nowrap",
      }}
    >
      {item.name}
    </button>
  );
}

/* ============================================================
   급지 그리드 섹션
   ============================================================ */
function GradeGrid({
  items,
  selectedId,
  onSelect,
}: {
  items: GradeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const byGrade = ([1, 2, 3, 4, 5] as GradeLevel[]).map((g) => ({
    grade: g,
    style: GRADE_STYLE[g],
    items: items.filter((item) => item.grade === g),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {byGrade.map(({ grade, style, items: gradeItems }) => {
        if (gradeItems.length === 0) return null;
        return (
          <div key={grade}>
            {/* 급지 레이블 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: style.bg,
                  color: style.color,
                  border: grade === 5 ? "0.5px solid var(--bp-gray-200)" : "none",
                  fontSize: 11,
                  fontWeight: "var(--font-weight-bold)",
                }}
              >
                {grade}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-muted)",
                }}
              >
                {style.label}
              </span>
            </div>
            {/* 칩 목록 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-2)",
              }}
            >
              {gradeItems.map((item) => (
                <GradeChip
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => onSelect(item.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   입지 점수 바
   ============================================================ */
function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span
        style={{
          width: 32,
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "var(--color-bg-subtle)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: score >= 80 ? "var(--bp-primary)" : score >= 60 ? "var(--bp-green-200)" : "#f0f2f6",
            borderRadius: "var(--radius-full)",
            transition: "width var(--transition-slow)",
          }}
        />
      </div>
      <span
        style={{
          width: 30,
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-text)",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {score}점
      </span>
    </div>
  );
}

/* ============================================================
   단지 상세 카드
   ============================================================ */
function AptDetailCard({ apt }: { apt: AptDetail }) {
  const gs = GRADE_STYLE[apt.grade];
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid var(--bp-gray-200)",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* 단지명 + 급지 뱃지 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <div>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            {apt.sigungu}
          </p>
          <h3 style={{ margin: "var(--space-1) 0 0", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
            {apt.aptName}
          </h3>
        </div>
        <span
          style={{
            padding: "var(--space-2) var(--space-4)",
            background: gs.bg,
            color: gs.color,
            border: apt.grade === 5 ? "0.5px solid var(--bp-gray-200)" : "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-bold)",
          }}
        >
          {gs.label}
        </span>
      </div>

      {/* 입지 종합 점수 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          padding: "var(--space-4)",
          background: "var(--bp-gray-50)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: "var(--font-weight-bold)", color: "var(--bp-primary)", lineHeight: 1 }}>
            {apt.locationScore}
          </p>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            입지점수
          </p>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <ScoreBar label="교통" score={apt.transport} />
          <ScoreBar label="학군" score={apt.school} />
          <ScoreBar label="상권" score={apt.commerce} />
        </div>
      </div>

      {/* 입지상세 버튼 */}
      <button
        onClick={() => console.log(`[Tab5] 입지상세: ${apt.aptName}`)}
        style={{
          width: "100%",
          padding: "var(--space-3)",
          background: "var(--color-primary-light)",
          color: "var(--color-primary)",
          border: "1px solid #BFDBFE",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-semibold)",
          cursor: "pointer",
          transition: "background var(--transition-fast)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-2)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#DBEAFE"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-primary-light)"; }}
      >
        입지상세 보기
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/* ============================================================
   검색 결과로 매칭되는 단지 상세 찾기
   ============================================================ */
function findAptByQuery(query: string): AptDetail | null {
  if (!query.trim()) return null;
  const q = query.trim().toLowerCase();
  return (
    APT_DETAILS.find(
      (a) =>
        a.aptName.toLowerCase().includes(q) ||
        a.sigungu.toLowerCase().includes(q)
    ) ?? null
  );
}

/* ============================================================
   Tab5Grade — 메인 컴포넌트
   ============================================================ */
export default function Tab5Grade() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* 검색어로 급지 아이템 필터링 */
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GRADE_ITEMS;
    return GRADE_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sido.toLowerCase().includes(q)
    );
  }, [query]);

  /* 선택된 구 → 해당하는 단지 상세 찾기 (없으면 검색어로 매칭) */
  const selectedGradeItem = selectedId
    ? GRADE_ITEMS.find((i) => i.id === selectedId) ?? null
    : null;

  const detailApt = useMemo(() => {
    if (selectedGradeItem) {
      return (
        APT_DETAILS.find((a) => a.sigungu === selectedGradeItem.name) ??
        findAptByQuery(query)
      );
    }
    return findAptByQuery(query);
  }, [selectedGradeItem, query]);

  /* 검색어 변경 시 선택 초기화 */
  const handleQueryChange = (v: string) => {
    setQuery(v);
    setSelectedId(null);
  };

  const showNoResult = filteredItems.length === 0;

  return (
    <section
      style={{
        padding: "var(--space-6) 0",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* 검색바 */}
      <SearchBar value={query} onChange={handleQueryChange} />

      {/* 급지 그리드 */}
      <div
        style={{
          background: "#fff",
          border: "0.5px solid var(--bp-gray-200)",
          borderRadius: 10,
          padding: 20,
        }}
      >
        <h3
          style={{
            margin: "0 0 var(--space-5)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text)",
          }}
        >
          전국 급지표
          <span
            style={{
              marginLeft: "var(--space-3)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-normal)",
              color: "var(--color-text-muted)",
            }}
          >
            구/지역을 클릭하면 단지 상세를 확인합니다
          </span>
        </h3>

        {showNoResult ? (
          <div
            style={{
              padding: "var(--space-12)",
              textAlign: "center",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <p style={{ margin: "0 0 var(--space-2)" }}>
              &ldquo;{query}&rdquo; 검색 결과가 없습니다
            </p>
            <button
              onClick={() => handleQueryChange("")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              전체 보기
            </button>
          </div>
        ) : (
          <GradeGrid
            items={filteredItems}
            selectedId={selectedId}
            onSelect={(id) =>
              setSelectedId((prev) => (prev === id ? null : id))
            }
          />
        )}
      </div>

      {/* 단지 상세 카드 — 구 선택 또는 단지명 검색 시 */}
      {detailApt && <AptDetailCard apt={detailApt} />}

      {/* 단지 선택 없을 때 안내 */}
      {!detailApt && !showNoResult && (
        <div
          style={{
            padding: "var(--space-6)",
            background: "var(--bp-gray-50)",
            border: "0.5px dashed var(--color-border)",
            borderRadius: 10,
            textAlign: "center",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
          }}
        >
          위 급지표에서 지역을 클릭하거나
          단지명을 검색하면 입지 상세 정보를 확인할 수 있습니다.
        </div>
      )}

      {/* BM CTA */}
      <button
        onClick={() => console.log("[Tab5 CTA] 내 단지 상세 입지 분석 클릭")}
        style={{
          width: "100%",
          padding: "10px",
          background: "var(--bp-primary-100)",
          color: "var(--bp-primary-500)",
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: "var(--font-weight-medium)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-2)",
          transition: "background var(--transition-fast)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bp-green-100)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bp-primary-100)"; }}
      >
        내 단지 상세 입지 분석
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M2 12L12 2M12 2H6M12 2V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  );
}
