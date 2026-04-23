"use client";

import { useState, useEffect } from "react";
import type { TradesSilggaData } from "@/lib/types/tradesData";

export type UseTradesSilggaState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: TradesSilggaData };

export function useTradesSilgga(): UseTradesSilggaState {
  const [state, setState] = useState<UseTradesSilggaState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trades-silgga")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TradesSilggaData>;
      })
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
    return () => { cancelled = true; };
  }, []);

  return state;
}
