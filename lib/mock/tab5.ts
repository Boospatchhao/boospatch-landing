/* ============================================================
   Tab5 — 전국 급지표 Mock Data
   실 서비스: 부스패치 입지점수 DB로 교체
   ============================================================ */

export type GradeLevel = 1 | 2 | 3 | 4 | 5;

export interface GradeItem {
  id: string;
  name: string;        // 구/지역명
  grade: GradeLevel;
  sido: string;        // 시도 (서울, 경기 등)
}

export interface AptDetail {
  id: string;
  aptName: string;
  sigungu: string;
  grade: GradeLevel;
  locationScore: number;   // 입지점수 0~100
  transport: number;       // 교통
  school: number;          // 학군
  commerce: number;        // 상권
}

/* ------------------------------------------------------------------
   급지 데이터
------------------------------------------------------------------ */
export const GRADE_ITEMS: GradeItem[] = [
  // 1급지
  { id: "gangnam",  name: "강남구",  grade: 1, sido: "서울" },
  { id: "seocho",   name: "서초구",  grade: 1, sido: "서울" },
  { id: "yongsan",  name: "용산구",  grade: 1, sido: "서울" },
  // 2급지
  { id: "songpa",   name: "송파구",  grade: 2, sido: "서울" },
  { id: "mapo",     name: "마포구",  grade: 2, sido: "서울" },
  { id: "seongdong",name: "성동구",  grade: 2, sido: "서울" },
  { id: "gwangjin", name: "광진구",  grade: 2, sido: "서울" },
  // 3급지
  { id: "dongjak",  name: "동작구",  grade: 3, sido: "서울" },
  { id: "yeongdeungpo", name: "영등포구", grade: 3, sido: "서울" },
  { id: "gangdong", name: "강동구",  grade: 3, sido: "서울" },
  { id: "seodaemun",name: "서대문구",grade: 3, sido: "서울" },
  // 4급지
  { id: "nowon",    name: "노원구",  grade: 4, sido: "서울" },
  { id: "dobong",   name: "도봉구",  grade: 4, sido: "서울" },
  { id: "gangbuk",  name: "강북구",  grade: 4, sido: "서울" },
  { id: "jungnang", name: "중랑구",  grade: 4, sido: "서울" },
  // 5급지 (예시)
  { id: "bucheon",  name: "부천시",  grade: 5, sido: "경기" },
  { id: "uijeongbu",name: "의정부시",grade: 5, sido: "경기" },
  { id: "goyang",   name: "고양시",  grade: 5, sido: "경기" },
];

/* ------------------------------------------------------------------
   단지 상세 예시
------------------------------------------------------------------ */
export const APT_DETAILS: AptDetail[] = [
  {
    id: "mapo-raemian",
    aptName: "마포래미안푸르지오",
    sigungu: "마포구",
    grade: 2,
    locationScore: 82,
    transport: 88,
    school: 74,
    commerce: 85,
  },
  {
    id: "gangnam-raemian",
    aptName: "래미안 대치팰리스",
    sigungu: "강남구",
    grade: 1,
    locationScore: 96,
    transport: 95,
    school: 98,
    commerce: 94,
  },
  {
    id: "songpa-parrio",
    aptName: "파크리오",
    sigungu: "송파구",
    grade: 2,
    locationScore: 87,
    transport: 90,
    school: 82,
    commerce: 88,
  },
  {
    id: "nowon-suraksan",
    aptName: "수락산역 현대",
    sigungu: "노원구",
    grade: 4,
    locationScore: 61,
    transport: 65,
    school: 58,
    commerce: 55,
  },
];

/* ------------------------------------------------------------------
   급지별 스타일 매핑
------------------------------------------------------------------ */
export const GRADE_STYLE: Record<GradeLevel, { bg: string; color: string; label: string }> = {
  1: { bg: "#06b281", color: "#fff",    label: "1급지" },
  2: { bg: "#ade2d5", color: "#18997d", label: "2급지" },
  3: { bg: "#e7f8f4", color: "#63666c", label: "3급지" },
  4: { bg: "#f0f2f6", color: "#494d52", label: "4급지" },
  5: { bg: "#fff",    color: "#7e8186", label: "5급지" },
};
