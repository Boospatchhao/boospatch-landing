/* ============================================================
   Tab6 — 평형갭 Mock Data
   실 서비스: 실거래 DB 연계로 교체
   단위: 만원 (1억 = 10000)
   ============================================================ */
import type { GapDanji } from "@/lib/types/gap";

export const MOCK_GAP: GapDanji[] = [
  {
    name: "상계주공5단지",
    sigungu: "노원구",
    region: "서울",
    smallArea: "59㎡",
    smallPrice: 52000,
    largeArea: "84㎡",
    largePrice: 61000,
    gap: 9000,
    gapTrend: "narrowing",
    gapChangeWeeks: 3,
    weeklyGap: [18000, 16000, 15000, 14000, 13000, 12000, 10000, 9000],
  },
  {
    name: "목동신시가지7단지",
    sigungu: "양천구",
    region: "서울",
    smallArea: "59㎡",
    smallPrice: 81000,
    largeArea: "84㎡",
    largePrice: 98000,
    gap: 17000,
    gapTrend: "narrowing",
    gapChangeWeeks: 2,
    weeklyGap: [24000, 23000, 22000, 21000, 20000, 19000, 18000, 17000],
  },
  {
    name: "마포래미안푸르지오",
    sigungu: "마포구",
    region: "서울",
    smallArea: "59㎡",
    smallPrice: 123000,
    largeArea: "84㎡",
    largePrice: 151000,
    gap: 28000,
    gapTrend: "narrowing",
    gapChangeWeeks: 1,
    weeklyGap: [35000, 33000, 32000, 31000, 30000, 29000, 29000, 28000],
  },
  {
    name: "고덕그라시움",
    sigungu: "강동구",
    region: "서울",
    smallArea: "59㎡",
    smallPrice: 101000,
    largeArea: "84㎡",
    largePrice: 128000,
    gap: 27000,
    gapTrend: "stable",
    gapChangeWeeks: 0,
    weeklyGap: [27000, 28000, 27000, 26000, 27000, 28000, 27000, 27000],
  },
  {
    name: "판교푸르지오",
    sigungu: "성남시",
    region: "경기",
    smallArea: "59㎡",
    smallPrice: 98000,
    largeArea: "84㎡",
    largePrice: 135000,
    gap: 37000,
    gapTrend: "widening",
    gapChangeWeeks: 2,
    weeklyGap: [32000, 33000, 34000, 35000, 35000, 36000, 36000, 37000],
  },
];
