const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const argPath = process.argv[2];
const dbPath = argPath
  ? path.resolve(process.cwd(), argPath)
  : path.resolve(__dirname, '..', process.env.SQLITE_PATH || './data/dms.sqlite');

if (!fs.existsSync(dbPath)) {
  console.error(`DB not found: ${dbPath}`);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

db.get('SELECT COUNT(*) AS count FROM audit_logs;', (countErr, row) => {
  if (countErr) {
    console.error(countErr.message);
    process.exit(1);
  }

  const before = Number(row?.count || 0);
  console.log(`audit_logs before: ${before}`);

  db.serialize(() => {
    db.run('DELETE FROM audit_logs;', (deleteErr) => {
      if (deleteErr) {
        console.error(deleteErr.message);
      }

      db.run("DELETE FROM sqlite_sequence WHERE name = 'audit_logs';", () => {
        db.get('SELECT COUNT(*) AS count FROM audit_logs;', (afterErr, row2) => {
          if (afterErr) {
            console.error(afterErr.message);
          } else {
            const after = Number(row2?.count || 0);
            console.log(`audit_logs after: ${after}`);
          }

          db.close();
        });
      });
    });
  });
});
