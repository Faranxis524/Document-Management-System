'use strict';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'data', 'dms.sqlite');
const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) => new Promise((res, rej) =>
  db.run(sql, params, function (err) { err ? rej(err) : res(this); }));
const all = (sql, params = []) => new Promise((res, rej) =>
  db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

(async () => {
  // Show current section values
  const sections = await all("SELECT section, COUNT(*) as cnt FROM records GROUP BY section ORDER BY section");
  console.log('Current section values:');
  sections.forEach(r => console.log(`  "${r.section}" : ${r.cnt} records`));

  // Fix "Inves" -> "INVES"
  const result = await run("UPDATE records SET section = 'INVES' WHERE section = 'Inves'");
  console.log(`\nFixed: ${result.changes} records updated ("Inves" -> "INVES")`);

  // Show after
  const after = await all("SELECT section, COUNT(*) as cnt FROM records GROUP BY section ORDER BY section");
  console.log('\nSection values after fix:');
  after.forEach(r => console.log(`  "${r.section}" : ${r.cnt} records`));

  db.close();
})();
