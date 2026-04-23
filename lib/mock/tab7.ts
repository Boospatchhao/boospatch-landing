/* ============================================================
   Tab7 — 주간 청약 분석 Mock Data
   실 서비스: 청약홈 크롤링 + 부스패치 입지·현장지수 연계로 교체
   ============================================================ */
import type { AptAnalysis } from "@/lib/types/apt";

export const MOCK_APT_LIST: AptAnalysis[] = [
  {
    name: "두산위브 더센트럴 수원",
    address: "경기도 수원시 장안구 영화동 93-6번지 일원",
    totalUnits: 275,
    region: "경기",
    pyeongTypes: [
      {
        name: "71A",
        area: 59.93,
        pyeong: 18,
        price: 79090,
        pricePerPyeong: 3295,
        nearbyAvgPerPyeong: 2229,
        safetyMargin: -25593,
      },
      {
        name: "37B",
        area: 59.91,
        pyeong: 18,
        price: 79010,
        pricePerPyeong: 3278,
        nearbyAvgPerPyeong: 2229,
        safetyMargin: -25173,
      },
      {
        name: "45B",
        area: 84.45,
        pyeong: 25,
        price: 99650,
        pricePerPyeong: 2963,
        nearbyAvgPerPyeong: 2238,
        safetyMargin: -23204,
      },
      {
        name: "80C",
        area: 84.80,
        pyeong: 25,
        price: 100310,
        pricePerPyeong: 2989,
        nearbyAvgPerPyeong: 2238,
        safetyMargin: -24024,
      },
    ],
    nearbyComps: [
      {
        name: "더샵광교산퍼스트파크",
        year: 2022,
        units: 666,
        pyeong: 25,
        pricePerPyeong: 2400,
        distanceKm: 0.51,
      },
      {
        name: "더샵광교산퍼스트파크",
        year: 2022,
        units: 666,
        pyeong: 29,
        pricePerPyeong: 2241,
        distanceKm: 0.51,
      },
      {
        name: "더샵광교산퍼스트파크",
        year: 2022,
        units: 666,
        pyeong: 34,
        pricePerPyeong: 2235,
        distanceKm: 0.51,
      },
      {
        name: "수원아너스빌위즈(주상복합)",
        year: 2017,
        units: 798,
        pyeong: 26,
        pricePerPyeong: 2087,
        distanceKm: 0.93,
      },
    ],
    schedule: {
      announcement: "2026-02-27",
      specialSupply: "2026-03-09",
      firstPriority: "2026-03-09",
      winner: "2026-03-17",
    },
  },
];

export const MOCK_APT = MOCK_APT_LIST[0];
