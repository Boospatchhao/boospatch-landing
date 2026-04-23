/**
 * MotherDuck → public/data/leading-danji.json
 * Run: node scripts/export_leading_danji.js
 */
const duckdb = require('../node_modules/duckdb');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.MOTHERDUCK_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFvdTg5MDhAZ21haWwuY29tIiwibWRSZWdpb24iOiJhd3MtdXMtZWFzdC0xIiwic2Vzc2lvbiI6ImFvdTg5MDguZ21haWwuY29tIiwicGF0IjoiQWVCNk53X3lrNVpHRkJxay1rNEJmTVp6T2Vlb1Q2T0EwVkp1STNWYVllbyIsInVzZXJJZCI6ImEwMDE3MGM0LTJmZTUtNGExZC04ODJhLTBhODgxNDQ4N2FlMyIsImlzcyI6Im1kX3BhdCIsInJlYWRPbmx5IjpmYWxzZSwidG9rZW5UeXBlIjoicmVhZF93cml0ZSIsImlhdCI6MTc3NjA1NTg3Nn0.dbUQBfJMQPfWTgnbCLGHcgJdDpDKMPn8FRTpXbtCzW8';

const SQL = `
WITH base_week AS (SELECT MAX(base_week) AS bw FROM my_db.main.fi_hoga_maemul_weekly),
weekly AS (
  SELECT w.naver_id,
         w.supply_pyeong AS rep_pyeong,
         ROUND(w.avg_hoga/10000, 1) AS rep_hoga_eok,
         w.hoga_chg_pct, w.maemul_chg_pct, w.hoga_score, w.maemul_score
  FROM my_db.main.fi_hoga_maemul_weekly w
  JOIN base_week ON w.base_week = base_week.bw
)
SELECT m.sido, m.sigungu, m.emd_name,
  COALESCE(m.emd_confirmed_turn_ym, '') AS dong_turn_ym,
  m.is_leading, m.emd_rank, m.danji_name AS name, m.naver_id, m.hh AS units,
  w.rep_pyeong, w.rep_hoga_eok, m.max_ppp AS ppp, m.sgg_avg_price, m.mktcap_eok,
  m.liq_monthly, m.leading_score, m.mktcap_pct, m.ppp_pct, m.liq_pct,
  w.hoga_chg_pct, w.maemul_chg_pct, w.hoga_score, w.maemul_score, m.turn_status,
  COALESCE(m.first_turn_ym, '') AS first_turn_ym, m.max_rise_pct,
  COALESCE(m.cohort, '') AS cohort, m.wave_group
FROM my_db.main.leading_danji_master m
LEFT JOIN weekly w ON m.naver_id = w.naver_id
ORDER BY m.leading_score DESC, m.mktcap_eok DESC
`;

console.log('MotherDuck 연결 중...');
const db = new duckdb.Database(`md:my_db?motherduck_token=${TOKEN}`);
const con = db.connect();

con.all(SQL, (err, rows) => {
  if (err) {
    console.error('쿼리 오류:', err);
    process.exit(1);
  }
  console.log(`  ${rows.length}행 수신`);

  const now = new Date().toISOString().slice(0, 19);
  const output = {
    updatedAt: now,
    baseWeek: '2026-04-06',
    total: rows.length,
    items: rows,
  };

  const dest = path.join(__dirname, '..', 'public', 'data', 'leading-danji.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(output, null, 0), 'utf-8');
  console.log(`Done: ${rows.length}행 → ${dest}`);
  db.close();
});
