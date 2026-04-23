"use client";

import { useState, useEffect } from "react";
import type { LeadingDanjiResponse } from "@/lib/types/leading";
import { scoreToStage } from "@/lib/types/leading";

const ENDPOINT = "/api/leading-danji";

/* ============================================================
   단지 목록 훅
   ============================================================ */
export type UseLeadingDanjiState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: LeadingDanjiResponse };

export function useLeadingDanji(
  sido: string = "전체",
  filter: "all" | "leading" = "all",
  limit = 100
): UseLeadingDanjiState {
  const [state, setState] = useState<UseLeadingDanjiState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    const params = new URLSearchParams({ sido, filter, limit: String(limit) });

    fetch(`${ENDPOINT}?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error ?? "알 수 없는 오류");

        const items = json.items.map((d: LeadingDanjiResponse["items"][0]) => ({
          ...d,
          fieldStage: scoreToStage(d.leading_score, d.turn_status),
        }));

        setState({ status: "success", data: { ...json, items } });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", message: err instanceof Error ? err.message : "로드 실패" });
      });

    return () => { cancelled = true; };
  }, [sido, filter, limit]);

  return state;
}

/* ============================================================
   시군구 목록 훅 — 페이지네이션 없이 전체 distinct 반환
   ============================================================ */
export type UseSigunguListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; list: string[] };

export function useSigunguList(sido: string): UseSigunguListState {
  const [state, setState] = useState<UseSigunguListState>({ status: "idle" });

  useEffect(() => {
    if (sido === "전체") {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    fetch(`${ENDPOINT}/sigungu?sido=${encodeURIComponent(sido)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.ok) {
          setState({ status: "success", list: json.sigunguList });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "success", list: [] });
      });

    return () => { cancelled = true; };
  }, [sido]);

  return state;
}
