// Script to reset all counters to the highest control number in records table for each section/date
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, '../data/dms.sqlite');
const db = new sqlite3.Database(dbPath);

function pad(num) {
  return String(num).padStart(2, '0');
}

function extractSeq(ctrlNo) {
  if (!ctrlNo) return 0;
  const match = ctrlNo.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

async function resetCounters() {
  return new Promise((resolve, reject) => {
    db.all('SELECT section, dateReceived FROM records GROUP BY section, dateReceived', [], (err, rows) => {
      if (err) return reject(err);
      let pending = rows.length;
      if (pending === 0) return resolve();
      rows.forEach(({ section, dateReceived }) => {
        db.all('SELECT mcCtrlNo, sectionCtrlNo FROM records WHERE section = ? AND dateReceived = ?', [section, dateReceived], (err2, recs) => {
          if (err2) return reject(err2);
          let maxMc = 0, maxSection = 0;
          recs.forEach(r => {
            maxMc = Math.max(maxMc, extractSeq(r.mcCtrlNo));
            maxSection = Math.max(maxSection, extractSeq(r.sectionCtrlNo));
          });
          // Update MC counter
          db.run('UPDATE counters SET currentNumber = ? WHERE scope = ? AND section IS NULL', [maxMc, 'MC'], (err3) => {
            if (err3) console.error('MC counter update error:', err3.message);
            // Update Section counter
            db.run('UPDATE counters SET currentNumber = ? WHERE scope = ? AND section = ?', [maxSection, 'SECTION', section], (err4) => {
              if (err4) console.error('Section counter update error:', err4.message);
              if (--pending === 0) resolve();
            });
          });
        });
      });
    });
  });
}

resetCounters().then(() => {
  console.log('All counters reset to match highest control numbers in records.');
  db.close();
}).catch(err => {
  console.error('Error resetting counters:', err);
  db.close();
});
