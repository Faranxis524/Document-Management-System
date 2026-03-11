'use strict';
const path    = require('path');
const fs      = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Usage: node import-all-sections.js [month-name]
//   e.g.  node import-all-sections.js September
// Without argument: runs all 4 months.
const ARG_MONTH = process.argv[2] || null;
const MONTHS    = ARG_MONTH
  ? [ARG_MONTH]
  : ['September', 'October', 'November', 'December'];

// ─── Section Mapping: CSV value (uppercase) → system canonical value ─────────
const SECTION_MAP = {
  'OPNS' : 'OPN',
  'INTEL': 'INTEL',
  'INVES': 'INVES',
  'ADMIN': 'ADM',
  'PCRS' : 'OPN/PCR',
};

function mapSection(raw) {
  const upper = (raw || '').trim().toUpperCase();
  return SECTION_MAP[upper] || upper;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const MONTHS_MAP = {
  jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
  jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
};

function normalizeDate(value) {
  if (!value) return '';
  const v = value.trim();
  if (!v) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // D-Mon-YY or D-Mon-YYYY  (e.g. "1-Sep-25")
  const m1 = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m1) {
    const mon = MONTHS_MAP[m1[2].toLowerCase()];
    if (mon) {
      const day  = m1[1].padStart(2, '0');
      const rawY = parseInt(m1[3], 10);
      const year = rawY < 100 ? 2000 + rawY : rawY;
      return `${year}-${mon}-${day}`;
    }
  }

  // "Month D, YYYY"  (e.g. "September 17, 2025")
  const m2 = v.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m2) {
    const mon = MONTHS_MAP[m2[1].toLowerCase().substring(0, 3)];
    if (mon) {
      const day = m2[2].padStart(2, '0');
      return `${m2[3]}-${mon}-${day}`;
    }
  }

  // Non-date text (N/A, Every Thursday, Every Wednesday, etc.) — return as-is
  return v;
}

function isValidDate(v) {
  return !!(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
}

// ─── Action Taken Normalizer ──────────────────────────────────────────────────
function normalizeActionTaken(raw) {
  if (!raw) return '';
  const v = raw.trim();
  if (/^drafted$/i.test(v))   return 'DRAFTED';
  if (/^diss?emina/i.test(v)) return 'DISSEMINATED';
  return v;
}

// ─── Status Calculator ────────────────────────────────────────────────────────
function calculateStatus(dateSent, targetDate) {
  if (dateSent && dateSent.trim()) return 'Completed';
  if (isValidDate(targetDate)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today > new Date(targetDate + 'T00:00:00')) return 'Overdue';
  }
  return 'Pending';
}

// ─── Full CSV Parser (handles multiline quoted fields) ────────────────────────
// Reads the raw file content character-by-character.
// Newlines INSIDE a quoted field are collapsed to a single space so that
// multi-line subjects / targetDates become one-line strings.
function parseCSV(content) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  let i = 0;

  const flushField = () => { row.push(field.trim()); field = ''; };
  const flushRow   = () => {
    flushField();
    if (row.some(f => f !== '')) rows.push(row);
    row = [];
  };

  while (i < content.length) {
    const ch   = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i += 2; continue; } // escaped ""
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      flushField();
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++; // CRLF
      flushRow();
    } else if ((ch === '\r' || ch === '\n') && inQuotes) {
      // Newline inside quoted field → collapse to space
      if (ch === '\r' && next === '\n') i++;
      field += ' ';
    } else {
      field += ch;
    }
    i++;
  }
  if (field || row.length) flushRow(); // last row (no trailing newline)
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const DB_PATH     = path.resolve(__dirname, 'data', 'dms.sqlite');
  const IMPORTED_BY = 'CSV Import';

  if (!fs.existsSync(DB_PATH)) { console.error('DB not found:', DB_PATH); process.exit(1); }

  const db  = new sqlite3.Database(DB_PATH);
  const run = (sql, p = []) => new Promise((res, rej) =>
    db.run(sql, p, function (err) { err ? rej(err) : res(this); }));
  const all = (sql, p = []) => new Promise((res, rej) =>
    db.all(sql, p, (err, rows) => err ? rej(err) : res(rows)));

  // Pre-load all existing mcCtrlNo values to detect duplicates
  const existingRows = await all('SELECT mcCtrlNo FROM records', []);
  const existingSet  = new Set(existingRows.map(r => r.mcCtrlNo).filter(Boolean));
  console.log(`Existing records in DB: ${existingSet.size}\n`);

  const now    = new Date().toISOString();
  const totals = { inserted: 0, skipped: 0, swapped: 0, errors: 0 };

  for (const month of MONTHS) {
    const csvPath = path.resolve(__dirname, '..', `Copy of 1. NEW COMMO MASTER LIST - ${month} 2025.csv`);
    if (!fs.existsSync(csvPath)) {
      console.log(`SKIP month "${month}": file not found at ${csvPath}`);
      continue;
    }

    console.log(`\n${'═'.repeat(58)}`);
    console.log(` ${month} 2025`);
    console.log(`${'═'.repeat(58)}`);

    const content  = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
    const allRows  = parseCSV(content);

    // Keep only data rows (mcCtrlNo starts with RFU4A-MC-)
    const dataRows = allRows.filter(cols => cols[0] && /^RFU4A-MC-/i.test(cols[0]));

    // Report section breakdown for this month
    const csvSec = {};
    for (const cols of dataRows) {
      const r = (cols[2] || '').trim();
      csvSec[r] = (csvSec[r] || 0) + 1;
    }
    console.log(`  CSV sections (${dataRows.length} rows):`);
    for (const [s, c] of Object.entries(csvSec)) {
      console.log(`    "${s || '(blank)'}" × ${c}  →  system "${mapSection(s)}"`);
    }

    const monthResults = {};

    for (const cols of dataRows) {
      const mcCtrlNo  = (cols[0] || '').trim();
      if (!mcCtrlNo) continue;

      const rawSection = (cols[2] || '').trim();
      const section    = mapSection(rawSection);

      if (!monthResults[section]) monthResults[section] = { inserted: 0, skipped: 0, swapped: 0 };

      if (existingSet.has(mcCtrlNo)) {
        monthResults[section].skipped++;
        console.log(`  SKIP  ${mcCtrlNo}  (already in DB)`);
        continue;
      }

      const sectionCtrlNo  = (cols[1]  || '').trim();
      let   dateReceived   = normalizeDate(cols[3]  || '');
      const subjectText    = (cols[4]  || '').trim();
      const fromValue      = (cols[5]  || '').trim();
      let   targetDate     = normalizeDate(cols[6]  || '');
      const receivedBy     = (cols[7]  || '').trim();
      const actionTaken    = normalizeActionTaken(cols[8] || '');
      const remarks        = (cols[9]  || '').trim();
      const concernedUnits = (cols[10] || '').trim();
      let   dateSent       = normalizeDate(cols[11] || '');

      // Treat "n/a" dateSent as blank
      if (dateSent && /^n\/?a$/i.test(dateSent)) dateSent = '';

      // ── Swap if dateSent comes before dateReceived ────────────────────
      if (isValidDate(dateSent) && isValidDate(dateReceived) && dateSent < dateReceived) {
        console.log(`  SWAP  ${mcCtrlNo}  (${dateReceived} ↔ ${dateSent})`);
        [dateReceived, dateSent] = [dateSent, dateReceived];
        monthResults[section].swapped++;
        totals.swapped++;
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
        console.log(`  OK    ${mcCtrlNo}  [${section}]  [${status}]`);
        existingSet.add(mcCtrlNo);
        monthResults[section].inserted++;
        totals.inserted++;
      } catch (err) {
        console.error(`  ERR   ${mcCtrlNo}: ${err.message}`);
        monthResults[section].skipped++;
        totals.errors++;
      }
    }

    // Per-month summary
    console.log(`\n  ${month} results:`);
    console.log(`  ${'Section'.padEnd(12)} ${'Inserted'.padStart(8)}  ${'Skipped'.padStart(7)}  ${'Swapped'.padStart(7)}`);
    console.log('  ' + '─'.repeat(40));
    for (const [sec, { inserted, skipped, swapped }] of Object.entries(monthResults)) {
      console.log(`  ${sec.padEnd(12)} ${String(inserted).padStart(8)}  ${String(skipped).padStart(7)}  ${String(swapped).padStart(7)}`);
      totals.skipped += skipped;
    }
  }

  db.close();

  // ── Grand total ────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║           GRAND TOTAL (all months)              ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`  Inserted : ${totals.inserted}`);
  console.log(`  Skipped  : ${totals.skipped}`);
  console.log(`  Swapped  : ${totals.swapped}`);
  console.log(`  Errors   : ${totals.errors}`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('Done.');
})();
