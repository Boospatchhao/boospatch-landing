/* ============================================================
   Tab8 — 지역별 거래량 Mock Data
   실 서비스: 국토부 실거래 (molit_trade_meme) 일별 집계로 교체
   ============================================================ */
import type { VolumeData } from "@/lib/types/volume";

export const MOCK_VOLUME_DATA: VolumeData = {
  /* ── 최근 1주 ─────────────────────────────────────────── */
  "1w": {
    reportDate: "2026.04.06~04.12",
    sidoRank: [
      { rank: 1,  sido: "경기",  count: 25951, prevWeekChange:  6.2 },
      { rank: 2,  sido: "서울",  count:  9787, prevWeekChange: -1.4 },
      { rank: 3,  sido: "경남",  count:  6279, prevWeekChange:  2.0 },
      { rank: 4,  sido: "부산",  count:  5979, prevWeekChange: -3.1 },
      { rank: 5,  sido: "인천",  count:  5057, prevWeekChange:  8.7 },
      { rank: 6,  sido: "경북",  count:  4832, prevWeekChange:  1.1 },
      { rank: 7,  sido: "충남",  count:  4421, prevWeekChange:  4.3 },
      { rank: 8,  sido: "대구",  count:  3987, prevWeekChange: -0.5 },
      { rank: 9,  sido: "충북",  count:  3210, prevWeekChange:  2.8 },
      { rank: 10, sido: "전남",  count:  2891, prevWeekChange: -1.9 },
    ],
    surgeUp:   [
      { sido: "세종", change:  42 },
      { sido: "대전", change:  31 },
      { sido: "광주", change:  18 },
    ],
    surgeDown: [
      { sido: "제주", change: -28 },
      { sido: "울산", change: -19 },
    ],
  },

  /* ── 최근 1개월 ──────────────────────────────────────── */
  "1m": {
    reportDate: "2026.03.13~04.12",
    sidoRank: [
      { rank: 1,  sido: "경기",  count: 98214, prevWeekChange:  4.1 },
      { rank: 2,  sido: "서울",  count: 38901, prevWeekChange: -0.8 },
      { rank: 3,  sido: "경남",  count: 24108, prevWeekChange:  1.5 },
      { rank: 4,  sido: "부산",  count: 22541, prevWeekChange: -2.2 },
      { rank: 5,  sido: "인천",  count: 19872, prevWeekChange:  6.3 },
      { rank: 6,  sido: "경북",  count: 18540, prevWeekChange:  0.9 },
      { rank: 7,  sido: "충남",  count: 17120, prevWeekChange:  3.1 },
      { rank: 8,  sido: "대구",  count: 15341, prevWeekChange: -1.2 },
      { rank: 9,  sido: "충북",  count: 12980, prevWeekChange:  1.7 },
      { rank: 10, sido: "전남",  count: 11432, prevWeekChange: -0.5 },
    ],
    surgeUp:   [
      { sido: "세종", change:  29 },
      { sido: "광주", change:  22 },
      { sido: "강원", change:  11 },
    ],
    surgeDown: [
      { sido: "제주", change: -21 },
      { sido: "울산", change: -14 },
    ],
  },

  /* ── 최근 3개월 ──────────────────────────────────────── */
  "3m": {
    reportDate: "2026.01.13~04.12",
    sidoRank: [
      { rank: 1,  sido: "경기",  count: 287540, prevWeekChange:  3.8 },
      { rank: 2,  sido: "서울",  count: 112340, prevWeekChange:  1.2 },
      { rank: 3,  sido: "경남",  count:  71230, prevWeekChange:  2.3 },
      { rank: 4,  sido: "부산",  count:  66890, prevWeekChange: -0.9 },
      { rank: 5,  sido: "인천",  count:  58410, prevWeekChange:  5.1 },
      { rank: 6,  sido: "경북",  count:  53120, prevWeekChange:  0.7 },
      { rank: 7,  sido: "충남",  count:  49870, prevWeekChange:  2.6 },
      { rank: 8,  sido: "대구",  count:  44320, prevWeekChange: -0.3 },
      { rank: 9,  sido: "충북",  count:  37820, prevWeekChange:  1.4 },
      { rank: 10, sido: "전남",  count:  33140, prevWeekChange: -0.8 },
    ],
    surgeUp:   [
      { sido: "세종", change:  38 },
      { sido: "대전", change:  24 },
      { sido: "광주", change:  19 },
    ],
    surgeDown: [
      { sido: "제주", change: -33 },
      { sido: "울산", change: -22 },
    ],
  },
};
