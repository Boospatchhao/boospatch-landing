"use client";

import { useState, useEffect } from "react";
import type { DailyTradesResponse, ApiErrorResponse } from "@/lib/types/dailyTrades";

const ENDPOINT = "/api/daily-trades";

/* ------------------------------------------------------------------
   fetch 함수 — 서버 컴포넌트 / 테스트에서도 직접 사용 가능
------------------------------------------------------------------ */
export async function fetchDailyTrades(): Promise<DailyTradesResponse> {
  const res = await fetch(ENDPOINT, {
    // Next.js App Router 캐시 설정: 1시간 revalidate
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body: ApiErrorResponse = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<DailyTradesResponse>;
}

/* ------------------------------------------------------------------
   클라이언트 hook
------------------------------------------------------------------ */
export type UseTab9DataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: DailyTradesResponse };

export function useTab9Data(): UseTab9DataState {
  const [state, setState] = useState<UseTab9DataState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchDailyTrades()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "알 수 없는 오류",
          });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/* ------------------------------------------------------------------
   반등거래 신호 helper (컴포넌트에서 import)
------------------------------------------------------------------ */
export type ReboundSignal = "상승 모멘텀" | "관망" | "가격 조정";

export function getReboundSignal(rate: number): { label: ReboundSignal; color: string; bg: string } {
  if (rate >= 50) return { label: "상승 모멘텀", color: "#16A34A", bg: "#DCFCE7" };
  if (rate >= 30) return { label: "관망",        color: "#CA8A04", bg: "#FEF3C7" };
  return             { label: "가격 조정",    color: "#DC2626", bg: "#FEE2E2" };
}
