'use strict';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'data', 'dms.sqlite'));
db.all("SELECT section, COUNT(*) as cnt FROM records GROUP BY section ORDER BY section", (err, rows) => {
  console.log('Current sections in DB:');
  rows.forEach(r => console.log(`  "${r.section}": ${r.cnt}`));
  db.close();
});
