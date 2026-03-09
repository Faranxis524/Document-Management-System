'use strict';
const path    = require('path');
const fs      = require('fs');
const sqlite3 = require('sqlite3').verbose();

const CSV_PATH    = path.resolve(__dirname, '..', 'Copy of 1. NEW COMMO MASTER LIST - December 2025.csv');
const DB_PATH     = path.resolve(__dirname, 'data', 'dms.sqlite');
const IMPORTED_BY = 'CSV Import';

const MONTHS_MAP = {
  jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12',
};

function normalizeDate(value) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value;
  const m = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!m) return value;
  const day = m[1].padStart(2, '0');
  const mon = MONTHS_MAP[m[2].toLowerCase()];
  if (!mon) return value;
  const rawY = parseInt(m[3], 10);
  const year = rawY < 100 ? 2000 + rawY : rawY;
  return `${year}-${mon}-${day}`;
}

function calculateStatus(dateSent, targetDate) {
  if (dateSent && dateSent.trim()) return 'Completed';
  if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today > new Date(targetDate + 'T00:00:00')) return 'Overdue';
  }
  return 'Pending';
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

(async () => {
  if (!fs.existsSync(CSV_PATH)) { console.error('CSV not found:', CSV_PATH); process.exit(1); }
  if (!fs.existsSync(DB_PATH))  { console.error('DB not found:', DB_PATH);   process.exit(1); }

  const lines = fs.readFileSync(CSV_PATH, 'utf-8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(l => l.trim());

  const inves = lines
    .map(l => parseCSVLine(l))
    .filter(cols => cols[2] && cols[2].trim().toUpperCase() === 'INVES');

  console.log(`Found ${inves.length} INVES rows in CSV`);

  const db  = new sqlite3.Database(DB_PATH);
  const run = (sql, params = []) => new Promise((res, rej) =>
    db.run(sql, params, function (err) { err ? rej(err) : res(this); }));
  const all = (sql, params = []) => new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

  const existing = await all('SELECT mcCtrlNo FROM records WHERE section = ?', ['INVES']);
  const existingSet = new Set(existing.map(r => r.mcCtrlNo).filter(Boolean));
  console.log(`Existing INVES in DB: ${existingSet.size}`);

  const now = new Date().toISOString();
  let inserted = 0, skipped = 0;

  for (const cols of inves) {
    const mcCtrlNo       = cols[0]  || '';
    const sectionCtrlNo  = cols[1]  || '';
    const section        = cols[2]  || 'INVES';
    const dateReceived   = normalizeDate(cols[3]  || '');
    const subjectText    = cols[4]  || '';
    const fromValue      = cols[5]  || '';
    const targetDate     = normalizeDate(cols[6]  || '');
    const receivedBy     = cols[7]  || '';
    const actionTaken    = cols[8]  || '';
    const remarks        = cols[9]  || '';
    const concernedUnits = cols[10] || '';
    const dateSent       = normalizeDate(cols[11] || '');

    if (!mcCtrlNo)            { skipped++; continue; }
    if (existingSet.has(mcCtrlNo)) { skipped++; console.log(`  SKIP ${mcCtrlNo} (duplicate)`); continue; }

    const status = calculateStatus(dateSent, targetDate);

    try {
      await run(`
        INSERT INTO records (
          mcCtrlNo, sectionCtrlNo, section,
          dateReceived, subjectText, subjectFileUrl,
          fromValue, fromType,
          targetDate, receivedBy, actionTaken,
          remarks, concernedUnits, dateSent,
          status, version,
          createdBy, updatedBy, createdAt, updatedAt
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        mcCtrlNo, sectionCtrlNo, section,
        dateReceived, subjectText, null,
        fromValue, 'USER',
        targetDate, receivedBy, actionTaken,
        remarks, concernedUnits, dateSent,
        status, 1,
        IMPORTED_BY, IMPORTED_BY, now, now,
      ]);
      console.log(`  OK  ${mcCtrlNo}  [${status}]  dateReceived: ${dateReceived}`);
      existingSet.add(mcCtrlNo);
      inserted++;
    } catch (err) {
      console.error(`  ERR ${mcCtrlNo}: ${err.message}`);
      skipped++;
    }
  }

  db.close();
  console.log('\n─────────────────────────────────────────');
  console.log(`Inserted : ${inserted}`);
  console.log(`Skipped  : ${skipped}`);
  console.log('─────────────────────────────────────────');
  console.log('Done.');
})();
