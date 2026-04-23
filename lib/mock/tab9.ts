/* ============================================================
   Tab9 Mock Data — 실제 서비스 전 개발/테스트용
   타입은 lib/types/dailyTrades.ts 에서 관리
   ============================================================ */
import type {
  DailyTradesResponse,
  NewHighTrade,
  RegionSummary,
  RegionBarItem,
  SurgeItem,
  TradeItem,
  ReboundItem,
} from "@/lib/types/dailyTrades";

const newHighTrades: NewHighTrade[] = [
  { rank: 1, sigungu: "서초구",      aptName: "반포자이",              area: "48평", floor: "23층", price: "62억",   prevHigh: "+2억",   gapMonths: 24 },
  { rank: 2, sigungu: "강남구",      aptName: "래미안 대치팰리스",     area: "34평", floor: "11층", price: "38억",   prevHigh: "+1.5억", gapMonths: 14 },
  { rank: 3, sigungu: "마포구",      aptName: "마포래미안푸르지오",    area: "25평", floor: "7층",  price: "18.5억", prevHigh: "+0.5억", gapMonths: 8  },
  { rank: 4, sigungu: "용산구",      aptName: "한강자이",              area: "38평", floor: "15층", price: "31억",   prevHigh: "+3억",   gapMonths: 31 },
  { rank: 5, sigungu: "성동구",      aptName: "왕십리센트라스",        area: "33평", floor: "9층",  price: "17억",   prevHigh: "+0.8억", gapMonths: 6  },
  { rank: 6, sigungu: "수원 영통구", aptName: "광교아이파크",          area: "34평", floor: "12층", price: "11.5억", prevHigh: "+1.2억", gapMonths: 18 },
  { rank: 7, sigungu: "분당구",      aptName: "파크뷰",                area: "42평", floor: "18층", price: "19.8억", prevHigh: "+2.3억", gapMonths: 22 },
];

const regionalSummary: RegionSummary[] = [
  { label: "전국",   count: 8421, change:  3.1 },
  { label: "서울",   count:  892, change: -1.4 },
  { label: "수도권", count: 3104, change:  5.2 },
];

const sidoRank: RegionBarItem[] = [
  { rank: 1, sido: "경기", count: 2341, prevWeekChange:  6.2 },
  { rank: 2, sido: "서울", count:  892, prevWeekChange: -1.4 },
  { rank: 3, sido: "경남", count:  621, prevWeekChange:  2.0 },
  { rank: 4, sido: "부산", count:  543, prevWeekChange: -3.1 },
  { rank: 5, sido: "인천", count:  481, prevWeekChange:  8.7 },
  { rank: 6, sido: "경북", count:  412, prevWeekChange:  1.1 },
  { rank: 7, sido: "대구", count:  378, prevWeekChange: -0.5 },
  { rank: 8, sido: "충남", count:  356, prevWeekChange:  4.3 },
];

const surgeRegions: SurgeItem[] = [
  { sido: "세종", change:  42 },
  { sido: "인천", change:  38 },
  { sido: "제주", change: -28 },
  { sido: "대전", change: -19 },
];

const tradeList: TradeItem[] = [
  { region: "서울 서초구",        aptName: "아크로리버파크",              area: "84㎡",  price: "58억",   floor: "20층", date: "04.11" },
  { region: "경기 성남 분당구",   aptName: "파크뷰",                      area: "110㎡", price: "19.8억", floor: "18층", date: "04.11" },
  { region: "서울 강남구",        aptName: "도곡렉슬",                    area: "84㎡",  price: "32.5억", floor: "14층", date: "04.11" },
  { region: "경기 수원 영통구",   aptName: "광교자연앤힐스테이트",        area: "84㎡",  price: "9.2억",  floor: "6층",  date: "04.10" },
  { region: "서울 마포구",        aptName: "마포래미안푸르지오",          area: "59㎡",  price: "14.2억", floor: "3층",  date: "04.10" },
  { region: "서울 용산구",        aptName: "파크타워",                    area: "98㎡",  price: "27억",   floor: "11층", date: "04.10" },
  { region: "부산 해운대구",      aptName: "해운대두산위브더제니스",      area: "84㎡",  price: "8.7억",  floor: "32층", date: "04.10" },
];

const reboundRank: ReboundItem[] = [
  { rank: 1, sigungu: "은평구", total: 19, rebound: 14, rate: 73.7, trend: "up"   },
  { rank: 2, sigungu: "노원구", total: 36, rebound: 13, rate: 36.1, trend: "up"   },
  { rank: 3, sigungu: "강동구", total: 28, rebound:  9, rate: 32.1, trend: "up"   },
  { rank: 4, sigungu: "도봉구", total: 22, rebound:  7, rate: 31.8, trend: "down" },
  { rank: 5, sigungu: "마포구", total: 41, rebound: 12, rate: 29.3, trend: "up"   },
  { rank: 6, sigungu: "강남구", total:  6, rebound:  1, rate: 16.7, trend: "down" },
  { rank: 7, sigungu: "서초구", total:  8, rebound:  1, rate: 12.5, trend: "down" },
];

/** API route.ts 에서 사용하는 전체 mock payload */
export const MOCK_DAILY_TRADES: DailyTradesResponse = {
  reportDate: "2026.04.12(일)",
  newHighTrades,
  regional: {
    summary:      regionalSummary,
    sidoRank,
    surgeRegions,
    tradeList,
  },
  rebound: {
    rank: reboundRank,
  },
};

/* 컴포넌트에서 직접 쓰던 helper — 타입만 남기고 로직은 lib/api에 */
export type { DailyTradesResponse };
