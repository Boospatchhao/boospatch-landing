"use client";

import { useEffect, useState } from "react";
import type {
  KBPeriodic,
  KBIndexType,
  KBPoint,
  KBIndicatorSnapshot,
} from "@/lib/db/kb";

export type { KBPeriodic, KBIndexType, KBPoint, KBIndicatorSnapshot };

/* ------------------------------------------------------------------
   fetch helpers
------------------------------------------------------------------ */
async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface KBRegionsPayload {
  regions: string[];
  periodic: KBPeriodic;
  indexType: KBIndexType | null;
}

export interface KBSeriesPayload {
  type: KBIndexType;
  periodic: KBPeriodic;
  region: string;
  count: number;
  points: KBPoint[];
}

export interface KBSummaryPayload {
  region: string;
  periodic: KBPeriodic;
  indicators: KBIndicatorSnapshot[];
}

export const fetchKBRegions = (periodic: KBPeriodic = "weekly", indexType?: KBIndexType) => {
  const qs = new URLSearchParams({ periodic });
  if (indexType) qs.set("indexType", indexType);
  return getJSON<KBRegionsPayload>(`/api/kb/regions?${qs}`);
};

export const fetchKBSeries = (opts: {
  type: KBIndexType;
  periodic: KBPeriodic;
  region: string;
  since?: string;
  limit?: number;
}) => {
  const qs = new URLSearchParams({
    type: opts.type,
    periodic: opts.periodic,
    region: opts.region,
  });
  if (opts.since) qs.set("since", opts.since);
  if (opts.limit) qs.set("limit", String(opts.limit));
  return getJSON<KBSeriesPayload>(`/api/kb/series?${qs}`);
};

export const fetchKBSummary = (region: string, periodic: KBPeriodic = "weekly") =>
  getJSON<KBSummaryPayload>(`/api/kb/summary?region=${encodeURIComponent(region)}&periodic=${periodic}`);

/* ------------------------------------------------------------------
   hooks — useAsync 패턴
------------------------------------------------------------------ */
type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

function useAsync<T>(deps: unknown[], fn: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fn()
      .then((data) => { if (!cancelled) setState({ status: "success", data }); })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const useKBRegions = (periodic: KBPeriodic = "weekly", indexType?: KBIndexType) =>
  useAsync([periodic, indexType], () => fetchKBRegions(periodic, indexType));

export const useKBSummary = (region: string, periodic: KBPeriodic = "weekly") =>
  useAsync([region, periodic], () => fetchKBSummary(region, periodic));

export const useKBSeries = (opts: {
  type: KBIndexType;
  periodic: KBPeriodic;
  region: string;
  since?: string;
  limit?: number;
}) => useAsync(
  [opts.type, opts.periodic, opts.region, opts.since, opts.limit],
  () => fetchKBSeries(opts),
);

/** 여러 지역 시리즈 병렬 fetch — 비교 모드용 */
export const useKBSeriesMulti = (opts: {
  type: KBIndexType;
  periodic: KBPeriodic;
  regions: string[];
  limit?: number;
}) => useAsync(
  [opts.type, opts.periodic, opts.regions.join("|"), opts.limit],
  () => Promise.all(opts.regions.map((r) => fetchKBSeries({ type: opts.type, periodic: opts.periodic, region: r, limit: opts.limit }))),
);
