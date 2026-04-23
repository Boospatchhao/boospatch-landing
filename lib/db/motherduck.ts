import duckdb from "duckdb";

let _db: duckdb.Database | null = null;

function getDb(): duckdb.Database {
  if (!_db) {
    const token = process.env.MOTHERDUCK_TOKEN;
    if (!token) throw new Error("MOTHERDUCK_TOKEN not set");
    _db = new duckdb.Database(`md:?motherduck_token=${token}`);
  }
  return _db;
}

/** MotherDuck에 SQL을 실행하고 행 배열을 반환 */
export function mdQuery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const conn = getDb().connect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn.all(sql, (err: Error | null, rows: any[]) => {
      conn.close();
      if (err) return reject(err);
      resolve((rows ?? []) as T[]);
    });
  });
}
