/**
 * 로컬 SQLite (better-sqlite3) → Turso (@libsql/client) 업로드.
 *
 * 실행: node scripts/upload_to_turso.mjs danji
 *       node scripts/upload_to_turso.mjs kb
 *       node scripts/upload_to_turso.mjs all
 */
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── .env.local 로드 ──
const envPath = join(process.cwd(), ".env.local");
const envText = readFileSync(envPath, "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const CONFIGS = {
  danji: {
    localPath: join(process.cwd(), "data", "danji", "danji.db"),
    url: process.env.TURSO_DANJI_URL,
    token: process.env.TURSO_DANJI_TOKEN,
  },
  kb: {
    localPath: join(process.cwd(), "data", "kb", "kb_index.db"),
    url: process.env.TURSO_KB_URL,
    token: process.env.TURSO_KB_TOKEN,
  },
};

const target = process.argv[2];
if (!target || (!CONFIGS[target] && target !== "all")) {
  console.error("Usage: node scripts/upload_to_turso.mjs <danji|kb|all>");
  process.exit(1);
}

const targets = target === "all" ? ["danji", "kb"] : [target];
const BATCH = 500; // Turso 배치 INSERT 크기

for (const name of targets) {
  const cfg = CONFIGS[name];
  if (!cfg.url || !cfg.token) {
    console.error(`[${name}] ENV 없음: TURSO_${name.toUpperCase()}_URL / _TOKEN`);
    process.exit(1);
  }
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(` [${name}] ${cfg.localPath}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const local  = new Database(cfg.localPath, { readonly: true });
  const remote = createClient({ url: cfg.url, authToken: cfg.token });

  // 1. 테이블 목록
  const tables = local.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all();
  const indexes = local.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
  ).all();
  console.log(`테이블: ${tables.map(t => t.name).join(", ")}`);

  // 2. 원격에서 기존 테이블 DROP 후 재생성
  for (const t of tables) {
    console.log(`\n▶ [${t.name}] 스키마 재생성...`);
    await remote.execute(`DROP TABLE IF EXISTS ${t.name}`);
    await remote.execute(t.sql);
  }

  // 3. 인덱스 재생성
  for (const idx of indexes) {
    console.log(`  인덱스: ${idx.name}`);
    try { await remote.execute(`DROP INDEX IF EXISTS ${idx.name}`); } catch {}
    await remote.execute(idx.sql);
  }

  // 4. 데이터 배치 삽입
  for (const t of tables) {
    const cols = local.prepare(`PRAGMA table_info(${t.name})`).all().map(c => c.name);
    const total = local.prepare(`SELECT COUNT(*) AS c FROM ${t.name}`).get().c;
    console.log(`\n▶ [${t.name}] ${total.toLocaleString()}행 업로드`);
    if (total === 0) continue;

    const placeholders = cols.map(() => "?").join(",");
    const insertSql = `INSERT INTO ${t.name}(${cols.join(",")}) VALUES (${placeholders})`;

    const rows = local.prepare(`SELECT * FROM ${t.name}`).all();
    let sent = 0;
    const t0 = Date.now();

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const stmts = chunk.map(r => ({
        sql: insertSql,
        args: cols.map(c => r[c] ?? null),
      }));
      await remote.batch(stmts, "write");
      sent += chunk.length;
      if (sent % 5000 === 0 || sent === rows.length) {
        const pct = ((sent / total) * 100).toFixed(1);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        process.stdout.write(`  ${sent.toLocaleString()}/${total.toLocaleString()} (${pct}%, ${elapsed}s)\r`);
      }
    }
    console.log(`\n  ✓ ${total.toLocaleString()}행 완료 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }

  local.close();
  remote.close();
}

console.log(`\n✓ 업로드 완료: ${new Date().toISOString()}`);
