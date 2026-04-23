import Database from "better-sqlite3";

const db = new Database("data/kb/kb_index.db", { readonly: true });

console.log("=== 시리즈별 행수 / 지역수 / 기간 ===");
for (const r of db.prepare(`
  SELECT index_type, periodic, COUNT(*) AS rows, COUNT(DISTINCT region_name) AS regions,
         MIN(date) AS first, MAX(date) AS last
  FROM kb_index GROUP BY index_type, periodic ORDER BY periodic, index_type
`).all()) {
  console.log(`  ${r.periodic.padEnd(7)} ${r.index_type.padEnd(8)} rows=${String(r.rows).padStart(7)} regions=${String(r.regions).padStart(3)} ${r.first} ~ ${r.last}`);
}

console.log("\n=== 전국 매매가격지수 weekly 최근 5주 (Excel + API merged) ===");
for (const r of db.prepare(`SELECT date,value FROM kb_index WHERE index_type='매매가격지수' AND periodic='weekly' AND region_name='전국' ORDER BY date DESC LIMIT 5`).all())
  console.log(" ", r.date, r.value.toFixed(4));

console.log("\n=== 서울특별시 매수우위지수 monthly 최근 5달 ===");
for (const r of db.prepare(`SELECT date,value FROM kb_index WHERE index_type='매수우위지수' AND periodic='monthly' AND region_name='서울특별시' ORDER BY date DESC LIMIT 5`).all())
  console.log(" ", r.date, r.value.toFixed(2));

console.log("\n=== 중복(같은 PK 다중) 체크 ===");
const dupes = db.prepare(`
  SELECT index_type, periodic, region_name, date, COUNT(*) c
  FROM kb_index GROUP BY index_type, periodic, region_name, date HAVING c > 1
`).all();
console.log(dupes.length === 0 ? "  ✓ 중복 0건" : `  ✗ ${dupes.length}건 발견`);

db.close();
