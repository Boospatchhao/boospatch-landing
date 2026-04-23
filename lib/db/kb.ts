import Database from "better-sqlite3";
import path from "node:path";

let dbInstance: Database.Database | null = null;

function db(): Database.Database {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), "data", "kb", "kb_index.db");
    dbInstance = new Database(dbPath, { readonly: true, fileMustExist: true });
    dbInstance.pragma("journal_mode = WAL");
  }
  return dbInstance;
}

export type KBPeriodic = "weekly" | "monthly";
export type KBIndexType =
  | "매매가격지수"
  | "전세가격지수"
  | "월세가격지수"
  | "매수우위지수"
  | "전세수급지수";

export interface KBPoint {
  date: string;
  value: number;
  sellers_more?: number | null;
  buyers_more?: number | null;
  similar?: number | null;
}

const ALL_INDEX_TYPES: KBIndexType[] = [
  "매매가격지수",
  "전세가격지수",
  "월세가격지수",
  "매수우위지수",
  "전세수급지수",
];

// "5개광역시 5", "6개광역시 6" 등 파싱 잔재 한 줄 필터
function isValidRegion(name: string): boolean {
  return !/\s\d+$/.test(name);
}

export function listRegions(periodic?: KBPeriodic, indexType?: KBIndexType): string[] {
  const where: string[] = [];
  const args: (string)[] = [];
  if (periodic)  { where.push("periodic = ?");   args.push(periodic); }
  if (indexType) { where.push("index_type = ?"); args.push(indexType); }
  const sql = `
    SELECT DISTINCT region_name
    FROM kb_index
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY region_name
  `;
  const rows = db().prepare(sql).all(...args) as { region_name: string }[];
  return rows.map((r) => r.region_name).filter(isValidRegion);
}

export function querySeries(opts: {
  type: KBIndexType;
  periodic: KBPeriodic;
  region: string;
  since?: string; // YYYY-MM-DD or YYYY-MM
  limit?: number; // most recent N points
}): KBPoint[] {
  const { type, periodic, region, since, limit } = opts;
  const where = ["index_type = ?", "periodic = ?", "region_name = ?"];
  const args: (string | number)[] = [type, periodic, region];
  if (since) { where.push("date >= ?"); args.push(since); }
  const isSentiment = type === "매수우위지수" || type === "전세수급지수";
  const cols = isSentiment
    ? "date, value, sellers_more, buyers_more, similar"
    : "date, value";
  const sql = `
    SELECT ${cols}
    FROM kb_index
    WHERE ${where.join(" AND ")}
    ORDER BY date ${limit ? "DESC" : "ASC"}
    ${limit ? "LIMIT ?" : ""}
  `;
  if (limit) args.push(limit);
  const rows = db().prepare(sql).all(...args) as KBPoint[];
  return limit ? rows.reverse() : rows;
}

export interface KBIndicatorSnapshot {
  type: KBIndexType;
  latestDate: string | null;
  latestValue: number | null;
  prevDate: string | null;
  prevValue: number | null;
  weekChangePct: number | null; // 직전 대비 % 변동
}

/** 특정 type/periodic 에 대해 모든 지역의 최근 2개 포인트 기반 변동률 맵 */
export function regionDeltas(
  indexType: KBIndexType,
  periodic: KBPeriodic,
): { region: string; latest: number; prev: number; deltaPct: number; latestDate: string }[] {
  const sql = `
    WITH ranked AS (
      SELECT region_name, date, value,
             ROW_NUMBER() OVER (PARTITION BY region_name ORDER BY date DESC) AS rn
      FROM kb_index
      WHERE index_type = ? AND periodic = ?
    )
    SELECT region_name, date, value, rn
    FROM ranked
    WHERE rn <= 2
    ORDER BY region_name, rn
  `;
  const rows = db().prepare(sql).all(indexType, periodic) as {
    region_name: string; date: string; value: number; rn: number;
  }[];
  const byRegion = new Map<string, { latest?: { date: string; v: number }; prev?: { date: string; v: number } }>();
  for (const r of rows) {
    const entry = byRegion.get(r.region_name) ?? {};
    if (r.rn === 1) entry.latest = { date: r.date, v: r.value };
    if (r.rn === 2) entry.prev   = { date: r.date, v: r.value };
    byRegion.set(r.region_name, entry);
  }
  const result: { region: string; latest: number; prev: number; deltaPct: number; latestDate: string }[] = [];
  for (const [region, e] of byRegion) {
    if (!e.latest || !e.prev || e.prev.v === 0) continue;
    const deltaPct = Math.round(((e.latest.v - e.prev.v) / e.prev.v) * 10000) / 100;
    result.push({ region, latest: e.latest.v, prev: e.prev.v, deltaPct, latestDate: e.latest.date });
  }
  return result;
}

/** 특정 type/periodic 에 사용 가능한 날짜 목록 (오름차순) */
export function listDates(indexType: KBIndexType, periodic: KBPeriodic): string[] {
  const rows = db().prepare(`
    SELECT DISTINCT date FROM kb_index
    WHERE index_type = ? AND periodic = ?
    ORDER BY date ASC
  `).all(indexType, periodic) as { date: string }[];
  return rows.map((r) => r.date);
}

/** fromDate ~ toDate 구간의 누적 변동률 (지도 히트맵용) */
export function regionDeltasRange(
  indexType: KBIndexType,
  periodic: KBPeriodic,
  fromDate: string,
  toDate: string,
): { region: string; startVal: number; endVal: number; deltaPct: number; endDate: string }[] {
  const sql = `
    WITH ranged AS (
      SELECT region_name, date, value
      FROM kb_index
      WHERE index_type = ? AND periodic = ? AND date BETWEEN ? AND ?
    ),
    start_vals AS (
      SELECT region_name, value AS start_val
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY region_name ORDER BY date ASC) AS rn
        FROM ranged
      ) WHERE rn = 1
    ),
    end_vals AS (
      SELECT region_name, value AS end_val, date AS end_date
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY region_name ORDER BY date DESC) AS rn
        FROM ranged
      ) WHERE rn = 1
    )
    SELECT sv.region_name, sv.start_val, ev.end_val, ev.end_date
    FROM start_vals sv
    JOIN end_vals ev ON sv.region_name = ev.region_name
    WHERE sv.start_val > 0
  `;
  const rows = db().prepare(sql).all(indexType, periodic, fromDate, toDate) as {
    region_name: string; start_val: number; end_val: number; end_date: string;
  }[];
  return rows.filter(isValidRegion2).map((r) => ({
    region: r.region_name,
    startVal: r.start_val,
    endVal: r.end_val,
    deltaPct: Math.round(((r.end_val - r.start_val) / r.start_val) * 10000) / 100,
    endDate: r.end_date,
  }));
}

function isValidRegion2(r: { region_name: string }): boolean {
  return !/\s\d+$/.test(r.region_name);
}

export function summary(region: string, periodic: KBPeriodic): KBIndicatorSnapshot[] {
  const sql = `
    SELECT date, value
    FROM kb_index
    WHERE index_type = ? AND periodic = ? AND region_name = ?
    ORDER BY date DESC
    LIMIT 2
  `;
  const stmt = db().prepare(sql);
  return ALL_INDEX_TYPES.map((type) => {
    const rows = stmt.all(type, periodic, region) as KBPoint[];
    const latest = rows[0] ?? null;
    const prev   = rows[1] ?? null;
    const change =
      latest && prev && prev.value !== 0
        ? Math.round(((latest.value - prev.value) / prev.value) * 10000) / 100
        : null;
    return {
      type,
      latestDate:  latest?.date  ?? null,
      latestValue: latest?.value ?? null,
      prevDate:    prev?.date    ?? null,
      prevValue:   prev?.value   ?? null,
      weekChangePct: change,
    };
  });
}
