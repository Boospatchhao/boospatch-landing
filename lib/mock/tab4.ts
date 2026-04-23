/* ============================================================
   Tab4 — 상승순서 사이클 Mock Data
   실 서비스: 과거 KB/실거래 데이터 분석으로 교체
   ============================================================ */
import type { CycleData } from "@/lib/types/cycle";

export const MOCK_CYCLES: CycleData[] = [
  {
    id: "2006",
    label: "2006~2008",
    phases: [
      { order: 1, region: "강남·서초", period: "2006.Q1", priceChange: "+42%" },
      { order: 2, region: "마포·용산", period: "2006.Q3", priceChange: "+38%" },
      { order: 3, region: "노원·도봉", period: "2007.Q1", priceChange: "+31%" },
      { order: 4, region: "수도권외곽", period: "2007.Q3", priceChange: "+24%" },
    ],
  },
  {
    id: "2015",
    label: "2015~2018",
    phases: [
      { order: 1, region: "강남·서초", period: "2015.Q2", priceChange: "+35%" },
      { order: 2, region: "마포·성동", period: "2016.Q1", priceChange: "+28%" },
      { order: 3, region: "노원·강북", period: "2016.Q3", priceChange: "+22%" },
      { order: 4, region: "경기남부", period: "2017.Q1", priceChange: "+18%" },
    ],
  },
  {
    id: "2020",
    label: "2020~2022",
    phases: [
      { order: 1, region: "강남·서초", period: "2020.Q1", priceChange: "+55%" },
      { order: 2, region: "마포·용산", period: "2020.Q3", priceChange: "+48%" },
      { order: 3, region: "노원·도봉", period: "2021.Q1", priceChange: "+41%" },
      { order: 4, region: "수도권외곽", period: "2021.Q3", priceChange: "+35%" },
    ],
  },
  {
    id: "current",
    label: "현재",
    phases: [
      { order: 1, region: "강남·서초", period: "2024.Q3", priceChange: "+8%" },
      { order: 2, region: "마포·용산", period: "2025.Q1", priceChange: "+5%", isCurrentPosition: true },
      { order: 3, region: "노원·도봉", period: "미정", priceChange: "예상" },
      { order: 4, region: "수도권외곽", period: "미정", priceChange: "예상" },
    ],
  },
];
