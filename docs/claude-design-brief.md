# Boospatch Landing — Claude Design 기획서

> **목적**: 현재 `http://localhost:3000/` 에 실제 렌더되는 화면 구성을 Claude Design(Artifact/HTML 단일 파일 프로토타입)에 그대로 옮겨 그릴 수 있도록 모든 시각·데이터·인터랙션 사양을 한 문서에 담는다.
> **전제**: Next.js 15 App Router + Tailwind v4. Pretendard Variable, 768px 브레이크포인트, 모바일 우선.
> **스코프**: 2026-04-24 현재 `ContentTabs.tsx`가 마운트하는 9개 탭 + 공용 레이아웃(Header, MobileBottomTabBar, FloatingCTA).
> **범위 외**: `HeroSection` 단독, `Tab1DrillDown`(Tab1 내부 패널), `Tab2KB` 단독(Tab0Market 안에 포함됨), `Tab4Cycle`(현재 마운트 X) → 참고용으로만 기술.

---

## 0. 글로벌 디자인 시스템

### 0.1 컬러 토큰 (`:root` CSS 변수)

| 역할 | 토큰 | HEX |
|---|---|---|
| Primary (딥 블루) | `--color-primary` | `#1A56DB` |
| Primary hover | `--color-primary-hover` | `#1347C2` |
| Primary light | `--color-primary-light` | `#EBF1FF` |
| Accent (CTA 오렌지) | `--color-accent` | `#F97316` |
| Accent hover | `--color-accent-hover` | `#EA6C0A` |
| Error / 급등 | `--bp-error` | `#DC2626` |
| Info / 급감 | `--bp-info` | `#2563EB` |
| Success (BM CTA 그린) | `--bp-success` / `--bp-primary-500` | `#18997d` |
| BM Green 500 (베이스) | `--bp-primary` / `--bp-green-500` | `#06b281` |
| BM Green 100 (CTA 배경) | `--bp-primary-100` / `--bp-green-50` | `#e7f8f4` |
| BM Green 200 | `--bp-green-200` | `#ade2d5` |
| BM Green 100 (hover) | `--bp-green-100` | `#c8f0e8` |
| BM Green 800 | `--bp-green-800` | `#0d7a63` |
| BM Red 500 | `--bp-red-500` | `#ec432c` |
| BM Red 50 | `--bp-red-50` | `#fff5f5` |
| Gray 900 | `--bp-gray-900` | `#1a1e23` |
| Gray 600 | `--bp-gray-600` | `#63666c` |
| Gray 500 | `--bp-gray-500` | `#6b7280` |
| Gray 400 | `--bp-gray-400` | `#9a9da2` |
| Gray 350 | `--bp-gray-350` | `#b7babe` |
| Gray 300 | `--bp-gray-300` | `#d1d5db` |
| Gray 200 | `--bp-gray-200` | `#e4e6ea` |
| Gray 100 | `--bp-gray-100` | `#f0f2f6` |
| Gray 50 / bg-subtle | `--bp-gray-50` / `--color-bg-subtle` | `#f8f9fc` |
| Surface / BG | `--color-bg` / `--color-surface` | `#FFFFFF` |
| Border | `--color-border` | `#E5E7EB` |
| Text primary | `--color-text` | `#111827` |
| Text muted | `--color-text-muted` | `#6B7280` |
| Text inverse | `--color-text-inverse` | `#FFFFFF` |

### 0.2 타이포그래피

- **Font family**: `"Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Size scale**: `xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36 / 5xl 48` (px)
- **Weight scale**: `normal 400 / medium 500 / semibold 600 / bold 700`
- **Body line-height**: 1.6
- **Font smoothing**: `-webkit-font-smoothing: antialiased`

### 0.3 Spacing / Radius / Shadow / Motion

- **Space**: `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64, 20=80` (px)
- **Radius**: `sm 4 / md 8 / lg 12 / xl 16 / full 9999` (px)
- **Shadow**:
  - `sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
  - `md`: `0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)`
  - `lg`: `0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)`
  - `xl`: `0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)`
  - `cta`: `0 8px 24px 0 rgb(249 115 22 / 0.35)` (Accent CTA 전용)
- **Transition**: `fast 150ms ease / base 200ms ease / slow 300ms ease`

### 0.4 레이아웃 변수

| 변수 | 데스크탑 | 모바일 (≤768px) |
|---|---|---|
| `--container-max` | `1200px` | 동일 |
| `--header-height` | `64px` | `56px` |
| `--bottom-tab-height` | `0px` | `60px + env(safe-area-inset-bottom)` |

### 0.5 상태·단계 뱃지(공통)

부동산 시장 "단계(stage)" 라벨은 다음 5종 색 매핑으로 반복 사용된다.

| 단계 | 배경 | 텍스트 | 테두리 |
|---|---|---|---|
| 강세 | `#c8f0e8` (green-100) | `#0d7a63` (green-800) | 없음 |
| 강보합 | `#e7f8f4` (primary-100) | `#18997d` (primary-500) | 없음 |
| 보합 | `#f0f2f6` (gray-100) | `#63666c` (gray-600) | 없음 |
| 약보합 | `#FFFFFF` | `#9a9da2` (gray-400) | `1px #e4e6ea` |
| 약세 | `#fff5f5` (red-50) | `#ec432c` (red-500) | 없음 |

Pill 사이즈: `padding 3px 10px / border-radius 9999 / font-size 12 / weight 700`.

### 0.6 BM CTA 버튼(핵심 표준 패턴)

리스트·카드 하단 "상담" 류 CTA는 전부 동일 스펙.

```
width:100%; padding:10px; background:#e7f8f4; color:#18997d;
border:none; border-radius:6px; font-size:12px; font-weight:500;
cursor:pointer; display:flex; align-items:center; justify-content:center;
gap:8px; transition:background 150ms ease;
hover → background:#c8f0e8
```

### 0.7 반응형 원칙

- Mobile-first, 단일 브레이크포인트 **768px** (`md:`).
- 데스크탑 다단 grid → 모바일 1-col stack.
- 데이터 테이블은 `overflow-x:auto` + `min-width`로 좌우 스크롤.
- `hide-scrollbar` 유틸로 스크롤바 비가시화.

---

## 1. 공용 쉘(Shell)

### 1.1 Header (`components/Header.tsx`)

- **위치**: `position:fixed; top:0; z-index:100; height: var(--header-height)`
- **배경**: 글래스모피즘 — 기본 `rgba(255,255,255,0.75)`, 스크롤 8px 이상 시 `rgba(255,255,255,0.92)` + `backdrop-filter: blur(12px)` + 하단 1px `--color-border`.
- **컨테이너**: `max-width:1200px; margin:0 auto; padding:0 16px`, `flex align:center gap:20px`.
- **좌측 로고**: `Logo` 컴포넌트 (flex-shrink:0). 클릭 → `#market` 해시 이동 + `scrollTo({top:0, smooth})`.
- **데스크탑 Nav** (`md:` 이상에서만 노출, 768px 이하 숨김):
  - 9개 링크를 가로 스크롤 컨테이너(`flex overflow-x:auto hide-scrollbar gap:4px`)에 배치.
  - 링크 라벨 순서 ↔ hash:
    1. `시황` `#market`
    2. `현장지수` `#field-index`
    3. `리딩단지` `#leading`
    4. `급지표` `#grade`
    5. `평형갭` `#gap`
    6. `거래량` `#volume`
    7. `실거래 분석` `#daily`
    8. `청약분석` `#subscription`
    9. `단지비교` `#compare`
  - 링크 버튼:
    - 기본: `background:none; color:#6B7280; weight:500; padding:6px 12px; border-radius:8px; font-size:14px; white-space:nowrap`
    - Active: `background:#e7f8f4; color:#18997d; weight:700`
    - Hover (non-active): `color: #111827`
- **모바일**: 로고만 노출.

### 1.2 Logo (`components/Logo.tsx`)

- SVG 120x30, 소문자 "boospatch" 워드마크 + 좌상단 그린 웨지(`#11B491`) + 가운데 "oo" 연결 스트로크.
- `variant="white"` 시 전체 `#FFFFFF`.
- 기본: 검정 `#000000`.

### 1.3 MobileBottomTabBar (`components/MobileBottomTabBar.tsx`)

- **노출**: 768px 이하 전용, `position:fixed; bottom:0; height:60px` + safe-area 패딩.
- **배경**: `rgba(255,255,255,0.95)` + `backdrop-filter: blur(16px)` + 상단 1px `--color-border`.
- **레이아웃**: `flex justify-evenly align-items:stretch`. 각 슬롯 `flex:1; flex-direction:column; align-items:center; gap:3px; padding:2px 0`.
- **5개 슬롯** (좌→우):
  1. 홈 (home icon) → `/`
  2. 시황 (chart-line icon) → `#market`
  3. 현장지수 (pages icon) → `#field-index`
  4. 실거래 (building icon) → `#daily`
  5. 단지비교 **AI 액센트** (sparkle icon) → `#compare`
- **아이콘**: 22x22 SVG. 기본 `stroke-width:1.5`, 활성 `stroke-width:2`.
- **라벨**: 10px. 활성 시 `weight:700` + 활성 컬러.
- **활성 인디케이터**: 아이콘 위 절대 위치, `top:0; width:32px; height:3px; border-radius:0 0 6px 6px`. 1–4번은 `--color-primary`, 5번(AI)은 `--color-accent`.
- **색상**: 비활성 `--color-text-muted`. 활성 1–4 = `--color-primary`, 5 = `--color-accent`.

### 1.4 FloatingCTA (`components/FloatingCTA.tsx`)

- **노출**: 데스크탑 전용(모바일은 하단 탭바로 대체), 스크롤 300px 이상부터 페이드인.
- **위치**: 데스크탑 `bottom:24px; right:24px`. 모바일 폴백 `bottom:80px`(탭바 회피).
- **형태**: 라운드 pill. `background:#1a1e23; color:#fff; padding:12px 20px; border-radius:24px; font-size:14px; weight:700; gap:8px`.
- **아이콘**: 14x14 스파크 SVG(흰색).
- **라벨**: `AI 상담받기`.
- **그림자**: `0 8px 24px rgba(26,30,35,0.28)`. Hover 시 `0 12px 32px rgba(26,30,35,0.38)` + `translateY(-2px)` + 배경 `--bp-gray-600`.
- **등장**: `opacity+translateY(-16px)+scale(0.95) → 0 1 1`, `transition: all 300ms ease`.
- **z-index**: 200.

### 1.5 페이지 루트 (`app/layout.tsx`)

- `<html lang="ko" class="h-full scroll-smooth"><body class="min-h-full flex flex-col">`
- 구조: `Header` → `<main style="padding-top: var(--header-height); flex:1">{children}</main>` → `FloatingCTA` + `MobileBottomTabBar`.
- `metadata.title`: `부스패치 — 무료 랜딩페이지로 매물 노출을 높이세요`
- Viewport: `width=device-width, initialScale=1, viewportFit=cover`.

### 1.6 페이지 본문 (`app/page.tsx` + `ContentTabs.tsx`)

- `page.tsx` 는 `<ContentTabs />` 만 렌더.
- `ContentTabs`: `max-width:1200px; margin:0 auto; padding: 24px 16px calc(80px + var(--bottom-tab-height))`.
- hash 구독 → 9개 탭 lazy load, 초기 hash 없으면 `#market`로 `replaceState`.
- 폴백 UI: 중앙 `"불러오는 중..."` 텍스트 (`color: var(--color-text-muted); padding:80px`).

---

## 2. 9개 탭 상세 (상단 nav 순서)

각 탭은 **페이지 본문** 영역(max 1200px) 안에 그려지며, 상단 여백 24px부터 시작. 탭 전체는 `display:flex; flex-direction:column; gap:16px` 기본.

---

### 2.1 `#market` — 시황 (Tab0Market)

**구성**: `HeroSection` + `Tab2KB` 수직 스택(탭 내부 단일 스크롤).

#### 2.1.1 HeroSection

- **배경**: `linear-gradient(160deg, #EBF1FF 0%, #FFFFFF 55%)`, 컨테이너 전폭(1200 max), 상하 패딩 `clamp(32px, 6vw, 80px)`.
- **타이틀 행**: `flex wrap space-between align:baseline`
  - 좌: `<h1>지금 부동산 시장은?</h1>` — `font-size: clamp(32px, 4vw, 48px); weight:700; line-height:1.2`
  - 우: 작은 날짜 배지 `YYYY.MM.DD 기준` — `font-size:12; color:#6B7280; background:#FFFFFF; border:1px solid #E5E7EB; padding:4px 10px; border-radius:9999`
- **시황 4카드**(모바일 가로 스크롤, 데스크탑 flex row gap 16):
  각 카드 `StatCard` 스펙 참조. 4장의 구성:
  1. **현장지수** `54점` · trend `neutral` · `보합` · 업데이트 `매주 월`
  2. **KB 매매지수** `+0.12%` · trend `neutral` · `보합` · 업데이트 `매주`
  3. **전국 거래량** `8,421건` · trend `up` · `전주比 +3%` · 업데이트 `매일`
  4. **급매율** `2.3%` · trend `down` · `invertColor` · `전주比 ▼` · 업데이트 `매일`
- **히트맵 영역**: `KoreaHeatmap` 1개(자세히 §2.1.2).
- **하단 CTA 섹션** (centered column gap 20):
  - 안내 문구: `부동산 고민, AI가 무료로 답해드려요`(회색 18px)
  - 버튼: `padding:16px 32px; background:#1A56DB; color:#fff; border-radius:9999; weight:700; shadow: var(--shadow-md)` — 라벨 `무료 AI 상담 시작하기` + 우측 → 아이콘.
  - 서브텍스트: `가입 불필요 · 완전 무료` (12px muted)

#### 2.1.2 KoreaHeatmap (Hero 내부, Tab2KB의 지역선택기 역할 겸함)

- **컨테이너**: `background:#fff; border:1px solid #E5E7EB; border-radius:16px; padding:20px`.
- **Header row**: h2(`14px bold`) + 우측 토글 그룹 `[매매|전세]` + 드릴다운 상태면 `← 전국으로` 복귀 버튼(`#e7f8f4` bg / `#18997d` text / 11px / 700).
- **범위 슬라이더**:
  - 상단 라벨행: 좌 기간 표시(11px gray-600), 우 단축 버튼 `이번주 시황`, `최근 3년`.
  - 트랙 높이 4px, 선택 영역 `#3b82f6` 채움.
  - 썸: 지름 18px 흰 원 + `#3b82f6` 2.5px 테두리.
  - 하단 연도 tick: 10px `#9a9da2`.
  - 상태 변경 시 350ms 디바운스 후 데이터 재요청.
- **본문 그리드**:
  - 데스크탑: `grid-template-columns: 1fr minmax(0,1fr) 300px` — 지도 / (확대 영역) / 랭킹 패널.
  - 모바일: 1-col stack, 랭킹 패널 하단으로.
- **지도 SVG**: viewBox 820x760.
  - **본토**: 시도 17개 path, 컬러는 diverging Red-White-Blue (`#2563EB → #f8fafc → #DC2626`), 값 ±colorMaxAbs(90분위수, 최소 0.1%, 최대 30%)에 매핑.
  - **제주**: 우하단 inset, 1.5x 스케일, 상자 `fill:#f8f9fc; stroke:#e4e6ea 0.8px`.
  - 라벨: 지역 축약명 (예: "서울"), 하단 `▲/▼ 0.00%`. 텍스트는 `paint-order:stroke`, 흰 외곽 4px.
  - Hover: path stroke `#1a1e23 1.8px` + 툴팁(`11px white bg border gray-200 shadow-md`, 지역명/변화율/드릴 힌트).
- **레전드**: 하단 중앙, `200x12` diverging gradient bar + 5 tick 라벨.
- **랭킹 패널 `상승 상위 TOP 20`**:
  - 타이틀 14px bold + ↑ 아이콘. 서브 12px muted = `YYYY-MM-DD · 주간/누적 변동률`.
  - 행 20개: rank 뱃지(1–3위는 `MedalBadge` 금/은/동, 4+는 숫자 원), 지역명, 변화율.
  - 행 폰트: rank 13px 800 / 지역 12px 500(top3는 700) / 변화 12px 700.
  - Top 3 행 배경 `rgba(251,191,36,0.06)`, hover 시 모두 `#f8f9fc`.

#### 2.1.3 StatCard (재사용 컴포넌트)

- `<article>` flex column gap 8, `min-width:140px; flex:1 0; background:#fff; border:1px solid #E5E7EB; border-radius:16px; padding:20px 24px`.
- 기본 shadow `sm`, hover `md` + `translateY(-2px)`.
- **구조**:
  1. 라벨 행 (flex space-between): 라벨 대문자 11px semibold 0.06em letter-spacing muted / 우측 업데이트 사이클 작은 배지(`10px; bg:#f8f9fc; border:1px solid #E5E7EB; border-radius:9999; padding:1px 6px`).
  2. 값: 28px(3xl) bold `#111827`.
  3. Trend pill: `align-self:flex-start; padding:2px 8px; border-radius:9999; font-size:12`.
     - up = `#F0FDF4 bg / #16A34A text` + △ 14x14 triangle
     - down = `#FEF2F2 bg / #DC2626 text` + ▽ triangle
     - neutral = muted bg/border/text + dash
     - `invertColor` + down = green(급매율 하락=호재)
- `StatCard`는 여러 탭에서 공통으로 사용되므로 Claude Design 쪽에도 재사용 가능한 컴포넌트로 노출.

#### 2.1.4 Tab2KB (Hero 하단 KB 시계열)

- **지역 셀렉터** + **기간 버튼 4개**(`24주 / 52주 / 3년 / 전체`).
- **지표 카드 4개**(grid auto-fit min 120):
  1. 매매가격지수 — `#06b281`
  2. 전세가격지수 — `#2563EB`
  3. 월세가격지수 — `#7C3AED`
  4. 매수우위지수 — `#F97316`
  - 카드 border: active 2px primary, inactive transparent / bg active white, inactive `#f8f9fc`.
  - 값 19px 500 + 변화 11px subtext.
  - Signal pill: 강세(`#FEF3C7/#D97706`), 약세(`#FEF2F2/#DC2626`), 보합(`#f0f2f6/#63666c`), 매수우위(`#e7f8f4/#18997d`).
- **차트**(recharts): 반응형 컨테이너, 데스크탑 350 / 모바일 250 높이.
  - 선택된 지표 1~4개 라인 오버레이, stroke 2px.
  - 옵션 MA: 52주 단기 + 156주 장기(얇은 1px 점선, 낮은 opacity).
  - 골든크로스 구간은 ReferenceArea로 하이라이트.
  - Tooltip: dark bg white text, 날짜/값/MA.

---

### 2.2 `#field-index` — 현장지수 (Tab1FieldIndex)

- **Breadcrumb**: `전국 › 시도 › 시군구` (13px, 링크 underline).
- **RegionGrid**: 데스크탑 3-col / 모바일 2-col, gap 12.
  - **RegionCard** (button, padding 16, border-radius 10, border `0.5px rgba(0,0,0,0.06)`):
    - 배경은 현장지수 구간별 컬러:
      - 0~20 `#EBF1FF`, 20~40 `#e7f8f4`, 40~60 `#f8f9fc`, 60~80 `#c8f0e8`, 80+ `#0d7a63 20%`.
    - 본문: 지역명 14px medium / 현장지수 22px bold + " 점" / 단계 뱃지(§0.5) / 호가·매물 증감 텍스트 11px(호가+ 녹색, 매물- 녹색 / 반대면 적색).
    - Hover: `translateY(-1px)` + `0 4px 12px rgba(0,0,0,0.08)`.
- **드릴다운 패널 (Tab1DrillDown)**: 시군구 클릭 시 그리드 위에 펼쳐지는 흰 카드.
  - Header: ← 뒤로(gray-100 bg), 지역명 16px semibold + 지수 22px + "점" + 단계 pill.
  - Body grid 2-col (mobile 1-col, gap 24):
    - 좌: MetricBar 3개 수직 스택 (호가/매물/급매율). 6px height, rounded-full. 값 13px, 라벨 12px. 호재=green, 악재=red.
    - 우: 4주 SVG 추이 미니 차트 160x40, 스트로크 `#06b281` 2px, 마지막 점 4px 원 + 10px 라벨.
  - Footer: BM CTA 버튼(§0.6).

---

### 2.3 `#leading` — 리딩단지 (Tab3Leading)

- **필터 칩 바**:
  - 시도: `전체 / 서울 / 경기 / 인천` (5px 14px, radius 6, 13px 700, active = primary bg white).
  - Tier: `전체 / ★ 리딩 / 지역대표`.
- **14-column 표** (mobile 좌우 스크롤):
  열: `구분 | 시군구 | 읍면동 | 단지명 | 시세 | 평단가 | 구평단가 | 시총 | 환금성 | 리딩점수 | 상승전환월 | 호가증감 | 매물수증감 | 입지레포트`.
- **행 스타일**:
  - leading: left-border 3px `--bp-primary`, 연녹색 살짝 깔린 배경.
  - local_rep: left-border 3px `--bp-green-200`, 배경 투명.
  - local_top: left-border 3px `--bp-gray-200`.
- **구분 뱃지 pill**: 2px 7px · 10px · 700:
  - leading: `★ 리딩` primary bg / 흰 텍스트
  - local_rep: `지역대표` `#e7f8f4` / `#18997d` / `1px #ade2d5`
  - local_top: `지역` gray-100 / gray-400
- **리딩점수 헤더 hover tooltip**: 다크(gray-900) bg, 흰 텍스트, 220px, 좌표 `top: calc(100% + 8px); right:0`, 10x10 삼각 화살표. 공식 안내.
- **점수 셀 hover popup**: 190px, 3개 미니 바(시총·평단가·환금성, 48x4px, %).
- **입지레포트 아이콘**: 28x28, gray-100 bg, gray-500 icon, border-radius 6. 클릭 → `www.boospatch.com/danji/{naver_id}` 새 탭.

---

### 2.4 `#grade` — 전국 급지표 (Tab5Grade)

- **상단 검색**: full-width input, 36px 높이, 좌측 돋보기(16x16 absolute left 12) + placeholder `단지명 또는 지역 검색`. Focus = 파란 테두리 + shadow. 값 있을 때 우측 X 버튼.
- **급지 그리드**: 5개 급지(1~5) 칼럼(또는 수직 섹션 with chip row).
  - 급지 헤더: 22x22 원 배지 (중앙에 숫자) + 라벨.
  - **GRADE_STYLE** (bg / text):
    1. 최고급 `#d1fae5` / `#065f46`
    2. 고급 `#dbeafe` / `#1e40af`
    3. 중급 `#e0e7ff` / `#3730a3`
    4. 준보급 `#fef3c7` / `#92400e`
    5. 보급 `#f3f4f6` / `#6b7280`
  - 칩 행: 해당 급지 단지명 칩들(padding 8 16, radius md, 14px 700). 선택 시 `outline: 2px primary (offset 2px) + shadow-md + translateY(-1px)`.
- **입지상세 카드** (선택 시 하단 노출): 흰 배경, border-radius 10, padding 20. 헤더 + KPI(평단가/시세/안전마진/입지점수/환금성/평형/세대수) + BM CTA(§0.6).

---

### 2.5 `#gap` — 평형갭 (Tab6Gap)

- **필터 바**:
  - 평형 갭 선택: `59㎡ ↔ 84㎡`, `84㎡ ↔ 115㎡` (primary 활성).
  - 시도 dropdown.
  - 정렬 dropdown (갭%, 갭금액, 호가).
- **테이블 열**: `단지명·위치 | 소형 | 대형 | 갭금액 | 갭% | 4주 추이 | CTA`.
- **행 셀 세부**:
  - 단지명: 12px 파란 underline 링크 / 주소: 11px gray-350 / 평형: 작은 회색 (예 `22평`).
  - 호가: 13px 우측정렬.
  - 갭%: 컬러 규칙 — `≤2% #06b281`, `≤8% #F97316`, `>8% #6b7280`, bold.
  - **DualSparkline SVG 120x38** per row:
    - 베이스 라인 gray.
    - 소형 라인: `#1A56DB` polyline 1.6px.
    - 대형 라인: `#F97316` polyline 1.6px 투명도 0.85.
    - 마지막 점: 2.5px 컬러 원.
  - CTA: BM CTA(§0.6) 소형 변형.
- **행 hover**: `background: #f8f9fc`.

---

### 2.6 `#volume` — 거래량 (Tab8Volume)

- **기간 필터 바**: `1주 / 2주 / 1개월 / 3개월 / 6개월 / 1년` 6버튼. 11px 700, 5px 14px, radius-full. Active = primary bg white.
- **2-col 그리드(모바일 1-col)**:
  - **좌 카드 "시도별 거래량 순위"**:
    - 헤더: 14px bold + 20x20 primary 원 뱃지(중앙 10px 700 숫자).
    - 행 10개: 좌측 20x20 순위 뱃지(Top 3 primary, 이하 bg-subtle) / 시도명 14px / 우측 건수 14px bold.
    - 막대: 로그 스케일 높이, bg `#e7f8f4`, fill `--bp-primary`, rounded-full, max 100%.
  - **우 카드 "급등/급감 아파트"**: 동일 카드 스타일 내부에 단지 리스트(거래량·변동률·상승/하락).
- **카드 공통**: `background:#fff; border:1px solid #E5E7EB; border-radius:10px; padding:20px`.

---

### 2.7 `#daily` — 실거래 분석 (Tab9DailyTrades)

- **서브탭 3개** (radius 6, 11px):
  1. `신고가`
  2. `지역현황`
  3. `반등거래`
- **공통 서브탭 버튼**: active primary bg / 흰 텍스트 / 700, inactive 흰 bg 회색 텍스트.

#### 서브탭 1: 신고가
- **필터**: 지역 필터 모달 + 날짜 범위.
- **TradesMap** 전폭(아래 상세): 지역별 신고가 버블(텍스트 3줄: 지역명·주간 거래·신고가수).
- **랭킹 패널**: Top 20 신고가 단지 (금/은/동 메달 + 단지명 + 신고가 건수).

#### 서브탭 2: 지역현황
- **필터**: 시도/시군구 dropdown + 기간.
- **테이블**: `시군구 | 신고가 | 거래량 | 변동률` + 행별 미니 sparkline(90x28 area + stroke).

#### 서브탭 3: 반등거래
- **상단**: 단지명 검색 + 가격대 버킷(`0–3억 / 3–5억 / 5–7억 / 7–10억 / 10억+`).
- **리스트 아이템**: 단지명·가격·면적 + 반등신호 pill + 미니 sparkline + 디테일 링크.
- **신호 매핑**:
  - rate ≤ 0.5 → `강한 반등신호` (green)
  - 0.5 < rate ≤ 1.0 → `반등신호` (orange)
  - rate > 1.0 → `안정` (gray)

#### TradesMap (공용 SVG, viewBox 820x760)
- 본토 + 제주 inset 구조 동일.
- 색상:
  - `changePctMap` 제공 시 diverging R-W-B.
  - 미제공 시 log 스케일 `#2563EB` 기반 (거래 적음→많음).
- 라벨 3줄: 지역명 / 주간 거래 수 / 신고가 수(또는 증감%).
- 툴팁: `11px`, 지역명·주간거래·신고가/변화.
- 드릴: 시도 클릭 → 시군구 뷰 전환, 상단 힌트 텍스트 교체.

---

### 2.8 `#subscription` — 청약분석 (Tab7Apt)

- **AptHeader 카드**:
  - `background:#f8f9fc; border-radius:10px; padding:20px; display:flex; gap:16px; flex-wrap`.
  - 좌측 column: `현대아파트 강남`(19px 500), `서울시 강남구 테헤란로 123`(12px gray-500), `총 1,250세대` pill(`#e7f8f4 bg / #18997d text / radius-full / padding 3px 10px / 12px`).
  - 우측 column: 지역 pill(`#EBF1FF bg / #1A56DB text`), `1순위 2025-12-15`(12px).
- **섹션 1 — 안전마진 분석**:
  - 섹션 타이틀 + 서브 `반경 1km · 10년 내 · 300세대 이상`.
  - 테이블 `min-width:560px` 좌우 스크롤:
    - 컬럼: `평형 | 타입 | 분양가 | 평단가 | 인근평단가 | 안전마진`.
    - TH 12px 700 gray-500 bottom-border 1.5px.
    - TD padding 12, 13px, border-bottom 0.5px.
    - 안전마진 음수: bg `#fff5f5`, 양수: bg `#f0faf7` (=green-50 톤).
    - 타입 라벨: 11px gray-350.
    - 값 우측정렬.
- **섹션 2 — 시세 비교**: 인근 단지 비교 카드(위치/거리/평단가/비교%).
- **섹션 3 — 분양일정**: 타임라인 또는 리스트 (`1순위 2025-12-15 / 2순위 2025-12-20 / 계약 2026-01-10`).

---

### 2.9 `#compare` — 단지비교 (TabCompare)

- **검색 섹션**:
  - Input 14px / padding 12 16 / radius 8 / focus 파란 테두리 + shadow. Placeholder `단지명 검색`.
  - 우측에 `검색` 버튼 또는 Enter 트리거.
- **선택된 DanjiChips (최대 3개, A/B/C 컬러 라벨)**:
  - A = 파랑 계열, B = 오렌지 계열, C = 그린 계열 (배지 18x18 흰 텍스트 10px 700).
  - 칩: `flex gap:6; padding:6 10; border-radius:8; bg: 색 틴트`.
  - 내부: 컬러 배지 + 단지명 13px 600 + 주소 11px gray-500 + X 닫기 16px gray-400.
- **2개 이상 선택 시 내부 탭 3개**:
  1. **기본 정보**: 3-col grid, 각 열 = 단지, 행 = `주소/세대/브랜드/준공연도/평균 평단가/환금성 점수/…`. 숫자 열 우측정렬.
  2. **시세 추이** (recharts LineChart):
     - 높이 데스크탑 300 / 모바일 200.
     - X: 월별 날짜, Y: 가격(만원).
     - 3개 라인 A/B/C 컬러, stroke 2.
     - 레전드 하단 flex row.
     - Tooltip: dark bg / 흰 텍스트.
     - 우상단 `JPG 다운로드` 버튼.
  3. **상세 비교 (커플링)**: 각 단지 하단에 `유사 가격대 단지 추천` 리스트 5~10개(평단가±5% + 상관계수).
- **내부 탭 버튼**: 12px, 5px 14px, Active 흰 bg / primary 텍스트 / 하단 2px underline 인디케이터.

---

## 3. 공통 데이터 샘플 (디자인용 Mock 세트)

> Claude Design에서 의미 있는 렌더를 얻으려면 아래 수치를 그대로 사용하라.

### 3.1 시황 4카드 (HeroSection)

| 라벨 | 값 | trend | 서브 | cycle |
|---|---|---|---|---|
| 현장지수 | 54점 | neutral | 보합 | 매주 월 |
| KB 매매지수 | +0.12% | neutral | 보합 | 매주 |
| 전국 거래량 | 8,421건 | up | 전주比 +3% | 매일 |
| 급매율 | 2.3% | down (invert) | 전주比 ▼ | 매일 |

### 3.2 KoreaHeatmap 랭킹 샘플 (TOP 20 상승)

1. 서울 강남구 `+0.48%`, 2. 서울 서초구 `+0.41%`, 3. 성남 분당 `+0.37%`, 4. 서울 송파구 `+0.33%`, 5. 하남 `+0.31%`, 6. 서울 용산구 `+0.29%`, 7. 과천 `+0.27%`, 8. 서울 광진구 `+0.26%`, 9. 성남 수정 `+0.24%`, 10. 서울 마포구 `+0.22%`, …20. 수원 영통구 `+0.12%`.

### 3.3 리딩단지 예시 1행

- 구분: `★ 리딩` · 시군구: 서울 강남 · 읍면동: 대치동 · 단지명: `래미안대치팰리스` · 시세: `38.5억` · 평단가: `1.18억` · 구평단가: `0.94억` · 시총: `12조` · 환금성: `92` · 리딩점수: `98` · 상승전환월: `24/02` · 호가증감: `+0.42%` · 매물수증감: `-8.1%` · 입지레포트: (아이콘 링크)

### 3.4 현장지수 RegionCard 예시 3종

- 서울: fieldIndex `78`, 단계 `강세`, 호가 `+0.35%`, 매물 `-12%`
- 경기: fieldIndex `52`, 단계 `보합`, 호가 `+0.04%`, 매물 `+3%`
- 부산: fieldIndex `23`, 단계 `약세`, 호가 `-0.22%`, 매물 `+18%`

### 3.5 청약 pyeongRows 2행

| 평형 | 타입 | 분양가 | 평단가 | 인근평단가 | 안전마진 |
|---|---|---|---|---|---|
| 31평(84㎡) | 타입A | 8.5억 | 10,120 | 9,800 | +3.2천 |
| 40평(115㎡) | 타입B | 12.3억 | 10,950 | 11,500 | -5.5천 |

### 3.6 단지비교 A/B/C 기본정보 예시

| 항목 | A 래미안대치팰리스 | B 아크로리버파크 | C 헬리오시티 |
|---|---|---|---|
| 주소 | 서울 강남 대치 | 서울 서초 반포 | 서울 송파 가락 |
| 세대 | 1,608 | 1,612 | 9,510 |
| 준공 | 2015 | 2016 | 2018 |
| 평균 평단가 | 11,800 | 13,400 | 7,200 |
| 환금성 | 92 | 95 | 88 |

---

## 4. 상호작용 & URL 동기화 규칙

- hash 변경은 `history.pushState(null, "", "#xxx")` + 스크롤 top으로. 기본 브라우저 점프 방지.
- 초기 진입 hash 없음 → `replaceState("", "", "#market")`.
- `window.hashchange` 리스너로 헤더 nav / 본문 / 모바일 탭바 3군데가 동시 active 갱신.
- 탭 전환 시 본문 스크롤을 0으로 돌리고 부드럽게(`scroll-behavior: smooth`) 보정.
- 드롭다운·모달·툴팁은 모두 클릭 바깥 시 닫힘, ESC 시 닫힘.

---

## 5. 접근성·SEO 메모

- 헤더 nav: `aria-label="주요 메뉴"`, 각 버튼은 `role="tab"`이 아닌 앵커 버튼으로 구현 (hash 이동).
- 본문 컨테이너: `role="tabpanel"`, `id="panel-{id}"`, `aria-labelledby="tab-{id}"`.
- 모든 CTA 버튼에 명시적인 `aria-label`, 아이콘만 있는 경우 `aria-label="AI 상담받기"` 등 필수.
- 페이지 제목: `부스패치 — 무료 랜딩페이지로 매물 노출을 높이세요`.

---

## 6. Claude Design 재현 가이드 (체크리스트)

다음 순서대로 단일 HTML 프로토타입을 만들면 localhost:3000과 일치한다.

1. `<style>` 안에 §0 디자인 토큰을 `:root` CSS 변수로 선언(컬러/폰트/스페이스/shadow/transition 전부).
2. Pretendard Variable CDN(`cdn.jsdelivr.net/gh/orioncactus/pretendard`)로 웹폰트 로드.
3. `body { display:flex; flex-direction:column; min-height:100vh }`.
4. §1 Header(글래스, 9-link nav, 모바일 숨김) 고정.
5. `<main>`에 `padding-top: var(--header-height)` 적용 후 §1.6 규격의 컨테이너.
6. 9개 섹션을 hash 기반이 아닌 **한 장 스크롤 or 버튼 스위칭**으로 렌더 (Claude Design 단일 HTML 한계 감안). 기본은 `#market` 섹션부터 스크롤 아래로 `#field-index` → … → `#compare` 순.
7. 각 탭은 §2 각 소절 규격 그대로: 컨테이너는 `background:#fff; border:1px solid #E5E7EB; border-radius:10–16px; padding:20–24px` 원칙.
8. 지도 2종(KoreaHeatmap / TradesMap)은 단순화된 SVG placeholder(한국 실루엣 + 17개 시도 rect)로 대체해도 무방. 색 규칙과 랭킹 패널만 정확히 맞추면 OK.
9. 테이블·차트는 §3 Mock 샘플을 그대로 넣어 실데이터 느낌을 낸다.
10. 하단에 §1.3 MobileBottomTabBar(768px 이하 display:flex) + §1.4 FloatingCTA(768px 초과 display:flex) 둘을 모두 포함하고 미디어 쿼리로 분기.

---

## 부록 A. Z-Index 맵

| 요소 | z-index |
|---|---|
| 컨텐츠 기본 | 0~10 |
| Sticky sub-filter | 20 |
| 드롭다운 / 툴팁 | 50 |
| Header | 100 |
| FloatingCTA | 200 |
| Modal overlay | 900 |
| Modal content | 1000 |

## 부록 B. 아이콘 방침

- 현재 코드베이스는 **인라인 SVG** 사용(lucide-react 미도입). Claude Design에서도 인라인 SVG로 통일.
- 사용 아이콘: home, chart-line, pages/book, building, sparkle, arrow-right, chevron-down, search, x, medal, triangle-up/down, dash.

## 부록 C. 현재 스펙 외(참고)

- `HeroSection` 단독 사용처 없음 — `Tab0Market` 내부에서만 마운트.
- `Tab1DrillDown`: `Tab1FieldIndex` 내부 전용.
- `Tab4Cycle`: 현재 `ContentTabs` 미포함. 상승사이클 타임라인이 필요하다면 §2.x에 추가 섹션으로 삽입할 수 있음(가로 타임라인, 노드 28x28 원, 점선/실선 커넥터, 현재 여기 ▼ 인디케이터).
- `Tab9DailyTrades-HOON.tsx`: 실험본 → 디자인 기획 대상 아님.

---

*작성일: 2026-04-24*
*기준 커밋: `ea7b80b` (boospatch-landing)*
*편집 가이드: 탭이 추가·제거되면 §0.4 레이아웃 → §1.1 Nav 순서 → §2.x 탭 스펙 → §3 Mock 순으로 갱신.*
