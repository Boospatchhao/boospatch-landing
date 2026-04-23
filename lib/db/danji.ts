import Database from "better-sqlite3";
import { join } from "path";

let _db: ReturnType<typeof Database> | null = null;

export function getDanjiDb(): ReturnType<typeof Database> {
  if (!_db) {
    const p = join(process.cwd(), "data", "danji", "danji.db");
    _db = new Database(p, { readonly: true, fileMustExist: true });
    _db.pragma("journal_mode = WAL");
    _db.pragma("cache_size = -32000"); // 32MB cache
  }
  return _db;
}
