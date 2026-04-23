@AGENTS.md

# 부스패치 랜딩페이지 — Claude Code 컨텍스트

## 프로젝트 개요
- 부동산 데이터 분석 랜딩페이지 (Next.js 15 App Router + Tailwind v4)
- 기획서: `../Boospatch Analysis (1)/부스패치_무료랜딩페이지_기획초안_v1.2.md`

## 디자인 토큰
전체 토큰은 `app/globals.css` `:root` 블록에 CSS 변수로 정의됨.
주요 토큰:
- `--color-primary: #1A56DB` (딥 블루)
- `--color-accent: #F97316` (CTA 오렌지)
- `--color-bg-subtle: #F8F9FC`
- `--header-height: 64px` (모바일 56px)
- `--bottom-tab-height: 60px` (모바일 전용)
- `--container-max: 1200px`

### `--bp-*` 확장 팔레트 (v2)
그린 계열: `--bp-primary` (#06b281) / `--bp-primary-100` (#e7f8f4) / `--bp-primary-500` (#18997d) / `--bp-green-800` (#0d7a63) / `--bp-green-200` (#ade2d5) / `--bp-green-100` (#c8f0e8) / `--bp-green-50` (#e7f8f4)
레드 계열: `--bp-red-500` (#ec432c) / `--bp-red-50` (#fff5f5)
그레이 계열: `--bp-gray-900` (#1a1e23) / `--bp-gray-600` (#63666c) / `--bp-gray-500` (#6b7280) / `--bp-gray-400` (#9a9da2) / `--bp-gray-350` (#b7babe) / `--bp-gray-300` (#d1d5db) / `--bp-gray-200` (#e4e6ea) / `--bp-gray-100` (#f0f2f6) / `--bp-gray-50` (#f8f9fc)

### BM CTA 버튼 표준 패턴
```tsx
style={{
  width: "100%", padding: "10px", background: "var(--bp-primary-100)",
  color: "var(--bp-primary-500)", border: "none", borderRadius: 6,
  fontSize: 12, fontWeight: "var(--font-weight-medium)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: "var(--space-2)", transition: "background var(--transition-fast)",
}}
onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bp-green-100)"; }}
onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bp-primary-100)"; }}
```

## 컴포넌트 규칙
- 아이콘: 인라인 SVG (lucide-react 설치 전까지)
- 폰트: Pretendard Variable (CSS 변수 `--font-sans`)
- 반응형: mobile-first, **768px** 브레이크포인트 (`md:` Tailwind 클래스)
- 스타일: CSS 변수 인라인 style 우선, Tailwind는 레이아웃 유틸에만 사용

## 컴포넌트 목록
| 컴포넌트 | 경로 | 설명 |
|----------|------|------|
| Logo | `/components/Logo.tsx` | SVG 로고 + 워드마크, `variant="white"` 지원 |
| Header | `/components/Header.tsx` | 스크롤 글래스모피즘, 모바일은 로고만 표시 |
| FloatingCTA | `/components/FloatingCTA.tsx` | 데스크탑 전용 (모바일은 MobileBottomTabBar의 AI상담 탭 사용) |
| MobileBottomTabBar | `/components/MobileBottomTabBar.tsx` | 768px 이하 하단 5탭 고정 바 |
| HeroSection | `/components/HeroSection.tsx` | 시황 4카드 + 히트맵 placeholder + CTA |
| StatCard | `/components/StatCard.tsx` | 수치 카드, `trend` / `invertColor` prop |
| ContentTabs | `/components/ContentTabs.tsx` | 9개 탭, URL hash 동기화, lazy 로드 |
| Tab1FieldIndex | `/components/tabs/Tab1FieldIndex.tsx` | 브레드크럼 + 시도/시군구 카드 그리드 (현장지수 히트맵 대체) |
| Tab1DrillDown | `/components/tabs/Tab1DrillDown.tsx` | 시군구 상세: 호가/매물/급매율 막대 + 4주 SVG 추이 차트 |
| Tab2KB | `/components/tabs/Tab2KB.tsx` | 지역 선택 + 4지표 카드 + recharts 이평선 차트 |
| Tab3Leading | `/components/tabs/Tab3Leading.tsx` | 시도 필터 + 리딩단지 리스트 (현장지수 뱃지 + 전고점 + 전주대비) |
| Tab4Cycle | `/components/tabs/Tab4Cycle.tsx` | 사이클 선택 + 가로/세로 타임라인 + 현재위치 표시 + 인사이트 카드 |
| Tab5Grade | `/components/tabs/Tab5Grade.tsx` | 검색바 + 급지 그리드 + 단지 입지상세 카드 |
| Tab6Gap | `/components/tabs/Tab6Gap.tsx` | 지역 필터 + 평형갭 리스트 (SVG 스파크라인 + 추세 뱃지) |
| Tab7Apt | `/components/tabs/Tab7Apt.tsx` | 청약 단지 헤더 + 안전마진 테이블 + 시세비교 + 분양일정 타임라인 |
| Tab8Volume | `/components/tabs/Tab8Volume.tsx` | 기간 필터 + 2컬럼 (시도순위/급등급감) |
| Tab9DailyTrades | `/components/tabs/Tab9DailyTrades.tsx` | 서브탭 3개 (신고가/지역현황/반등거래) |
| TabCompare | `/components/tabs/TabCompare.tsx` | 단지 검색 → 상세카드 → 커플링단지 → 비교차트+비교표 |

## 탭 구현 현황
| 탭 | hash | 상태 |
|----|------|------|
| **현장지수** | `#field-index` | **완료** ✅ |
| **KB 시계열** | `#kb` | **완료** ✅ |
| **리딩단지** | `#leading` | **완료** ✅ |
| **상승순서** | `#cycle` | **완료** ✅ |
| **전국 급지표** | `#grade` | **완료** ✅ |
| **평형갭** | `#gap` | **완료** ✅ |
| **주간청약** | `#subscription` | **완료** ✅ |
| **거래량** | `#volume` | **완료** ✅ |
| **데일리실거래** | `#daily` | **완료** ✅ |
| **단지비교** | `#compare` | **완료** ✅ |

## API / 데이터
| 엔드포인트 | 경로 | 설명 |
|-----------|------|------|
| GET /api/daily-trades | `/app/api/daily-trades/route.ts` | 신고가/지역현황/반등거래 |
| GET /api/danji/search | `/app/api/danji/search/route.ts` | 단지명 검색 (SQLite) |
| GET /api/danji/[id] | `/app/api/danji/[id]/route.ts` | 단지 상세 + 평형목록 + 월별시세 |
| GET /api/danji/[id]/coupling | `/app/api/danji/[id]/coupling/route.ts` | 커플링 단지 (평단가±5% + 상관계수) |
| GET /api/danji/compare | `/app/api/danji/compare/route.ts` | 최대 3단지 비교 데이터 |

- 응답 타입: `/lib/types/dailyTrades.ts`
- Mock 데이터: `/lib/mock/tab9.ts` (`MOCK_DAILY_TRADES` 객체)
- 클라이언트 hook: `/lib/api/dailyTrades.ts` → `useTab9Data()`
- 실 DB 연동 시 `route.ts`의 TODO 블록만 교체

## 유틸 / 훅
- `useIsMobile()` — `/lib/hooks/useIsMobile.ts` (768px 미디어쿼리, SSR safe)
- `getReboundSignal(rate)` — `/lib/api/dailyTrades.ts`

## 주의사항
- `"use client"` 지시어: 상태·이벤트 사용 컴포넌트에만 붙임
- 모바일 하단 탭바가 있으므로 콘텐츠 하단에 `padding-bottom: var(--bottom-tab-height)` 필수
- 탭 전환 시 `history.pushState`로 hash 변경 (스크롤 방지 목적)
- 새 탭 구현 시 `ContentTabs.tsx`의 `Tab9DailyTrades` 패턴 따를 것
