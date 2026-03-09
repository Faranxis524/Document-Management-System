const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/dms.sqlite');
db.all("SELECT mcCtrlNo, sectionCtrlNo, dateReceived FROM records WHERE section='INVES' ORDER BY mcCtrlNo", [], (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('Total INVES in DB:', rows.length);
  rows.forEach(r => console.log((r.mcCtrlNo||'') + ' | ' + (r.sectionCtrlNo||'') + ' | ' + (r.dateReceived||'')));
  db.close();
});
