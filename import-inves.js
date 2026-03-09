/**
 * One-time import script for INVES records from the cleaned CSV.
 * Run from the DMS root folder:
 *   node import-inves.js
 *
 * What it does:
 *   - Reads only INVES rows from the CSV
 *   - Skips rows whose mcCtrlNo already exists in the database
 *   - Inserts each row directly into the SQLite database
 *   - Calculates status the same way the server does
 *   - Prints a summary at the end
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const sqlite3 = require('sqlite3').verbose();

// ── Config ──────────────────────────────────────────────────────────────────
const CSV_PATH = path.resolve(__dirname, 'Copy of 1. NEW COMMO MASTER LIST - January 2026.csv');
const DB_PATH  = path.resolve(__dirname, 'server', 'data', 'dms.sqlite');
const IMPORTED_BY = 'CSV Import';

// ── Helpers ─────────────────────────────────────────────────────────────────

// Convert D-Mon-YY / DD-Mon-YY / DD-Mon-YYYY → YYYY-MM-DD; leaves ISO dates untouched
const MONTHS_MAP = {
  jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12',
};
function normalizeDate(value) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value; // already ISO or blank
  const m = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!m) return value; // unknown format — keep as-is
  const day  = m[1].padStart(2, '0');
  const mon  = MONTHS_MAP[m[2].toLowerCase()];
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
    const td = new Date(targetDate + 'T00:00:00');
    if (today > td) return 'Overdue';
  }
  return 'Pending';
}

// Parse a CSV line respecting quoted fields
function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  // Verify files exist
  if (!fs.existsSync(CSV_PATH)) {
    console.error('❌  CSV not found:', CSV_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌  Database not found:', DB_PATH);
    console.error('    Make sure the DMS server has been started at least once to create the DB.');
    process.exit(1);
  }

  // Read CSV — handle BOM and Windows line endings
  const raw = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  // Filter INVES rows: col 2 === 'INVES'
  const inves = [];
  for (const line of lines) {
    const cols = parseCSVLine(line);
    if (cols.length > 2 && cols[2].trim().toUpperCase() === 'INVES') {
      inves.push(cols);
    }
  }
  console.log(`📄  Found ${inves.length} INVES rows in CSV`);

  // Open database
  const db = new sqlite3.Database(DB_PATH);
  const run = (sql, params = []) => new Promise((res, rej) =>
    db.run(sql, params, function(err) { err ? rej(err) : res(this); })
  );
  const all = (sql, params = []) => new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => err ? rej(err) : res(rows))
  );

  // Get existing mcCtrlNos to skip duplicates
  const existing = await all('SELECT mcCtrlNo FROM records WHERE section = ?', ['INVES']);
  const existingSet = new Set(existing.map(r => r.mcCtrlNo).filter(Boolean));
  console.log(`🗄️   Existing INVES records in DB: ${existingSet.size}`);

  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;
  const skippedList = [];

  for (const cols of inves) {
    // CSV columns (0-based):
    // 0=mcCtrlNo, 1=sectionCtrlNo, 2=section, 3=dateReceived, 4=subjectText,
    // 5=fromValue, 6=targetDate, 7=receivedBy, 8=actionTaken,
    // 9=remarks, 10=concernedUnits, 11=dateSent
    const mcCtrlNo      = cols[0]  || '';
    const sectionCtrlNo = cols[1]  || '';
    const section       = cols[2]  || 'INVES';
    const dateReceived  = normalizeDate(cols[3]  || '');
    const subjectText   = cols[4]  || '';
    const fromValue     = cols[5]  || '';
    const targetDate    = normalizeDate(cols[6]  || '');
    const receivedBy    = cols[7]  || '';
    const actionTaken   = cols[8]  || '';
    const remarks       = cols[9]  || '';
    const concernedUnits = cols[10] || '';
    const dateSent      = normalizeDate(cols[11] || '');

    // Skip if mcCtrlNo is blank
    if (!mcCtrlNo) {
      skipped++;
      skippedList.push(`(blank mcCtrlNo) — subject: ${subjectText.slice(0, 60)}`);
      continue;
    }

    // Skip if already in DB
    if (existingSet.has(mcCtrlNo)) {
      skipped++;
      skippedList.push(`${mcCtrlNo} (already exists)`);
      continue;
    }

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
      console.log(`  ✅  ${mcCtrlNo} — ${status}`);
      inserted++;
      existingSet.add(mcCtrlNo); // prevent dup within same CSV run
    } catch (err) {
      console.error(`  ❌  ${mcCtrlNo} — ${err.message}`);
      skipped++;
      skippedList.push(`${mcCtrlNo} (insert error: ${err.message})`);
    }
  }

  db.close();

  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Inserted : ${inserted}`);
  console.log(`⏭️   Skipped  : ${skipped}`);
  if (skippedList.length) {
    console.log('\nSkipped details:');
    skippedList.forEach(s => console.log('  •', s));
  }
  console.log('─────────────────────────────────────────');
  console.log('Done.');
})();
