// check-sep2025.js — analyze September 2025 CSV vs local DB (no external deps)
const fs      = require('fs');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const CSV_PATH = path.join(__dirname, '..', 'Copy of 1. NEW COMMO MASTER LIST - September 2025.csv');
const DB_PATH  = path.join(__dirname, 'data', 'dms.sqlite');

// ── Simple CSV line parser (handles quoted fields with commas) ──────────────
function parseCsvLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"')                  { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; }
    else                             { cur += ch; }
  }
  fields.push(cur.trim());
  return fields;
}

// ── Read & parse CSV ────────────────────────────────────────────────────────
const raw      = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
const lines    = raw.split(/\r?\n/).filter(l => l.trim());
const header   = parseCsvLine(lines[0]);
const dataRows = lines.slice(1).map(l => parseCsvLine(l));

console.log('\n── CSV Header Columns ──────────────────────────────────────');
header.forEach((h, i) => console.log(`  [${i}] "${h}"`));

// Filter INVES only (col 2 = Section)
const inves = dataRows.filter(r => {
  const sec = (r[2] || '').trim().toUpperCase();
  return sec === 'INVES' || sec === 'INVESTIGATION';
});

console.log(`\n── CSV Summary ─────────────────────────────────────────────`);
console.log(`  Total data rows (all sections): ${dataRows.length}`);
console.log(`  INVES rows only:                ${inves.length}`);

// ── Date format check ────────────────────────────────────────────────────────
const DATE_COL    = 3;
const isoFormat   = /^\d{4}-\d{2}-\d{2}$/;
const shortFormat = /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/;

let isoCount = 0, shortCount = 0, otherCount = 0, otherSamples = [];
inves.forEach(r => {
  const d = (r[DATE_COL] || '').trim();
  if      (isoFormat.test(d))   isoCount++;
  else if (shortFormat.test(d)) shortCount++;
  else { otherCount++; if (otherSamples.length < 4) otherSamples.push(`"${d}"`); }
});

console.log(`\n── Date Format (dateReceived, col ${DATE_COL}) ──────────────`);
console.log(`  ISO  YYYY-MM-DD : ${isoCount}`);
console.log(`  Short D-Mon-YY  : ${shortCount}${shortCount ? '  ⚠️  needs normalizeDate()' : ''}`);
console.log(`  Other / blank   : ${otherCount}${otherSamples.length ? '  e.g. ' + otherSamples.join(', ') : ''}`);
console.log(`\n  Sample dates (first 6):`);
inves.slice(0, 6).forEach(r => console.log(`    "${(r[DATE_COL] || '').trim()}"`));

// ── Compare vs DB ────────────────────────────────────────────────────────────
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error('DB open error:', err.message); process.exit(1); }
});

db.all("SELECT mcCtrlNo, dateReceived FROM records WHERE section='INVES'", [], (err, dbAll) => {
  if (err) { console.error('DB query error:', err.message); process.exit(1); }
  db.close();

  const dbSet      = new Set(dbAll.map(r => (r.mcCtrlNo || '').trim()));
  const csvCtrlNos = inves.map(r => (r[0] || '').trim()).filter(Boolean);
  const duplicates = csvCtrlNos.filter(c => dbSet.has(c));
  const newRecords = csvCtrlNos.filter(c => !dbSet.has(c));

  console.log(`\n── DB Summary ──────────────────────────────────────────────`);
  console.log(`  Investigations already in DB: ${dbAll.length}`);
  console.log(`\n── INVES CSV vs DB ─────────────────────────────────────────`);
  console.log(`  CSV INVES records:            ${csvCtrlNos.length}`);
  console.log(`  Already in DB (will skip):    ${duplicates.length}`);
  console.log(`  NEW (would be imported):      ${newRecords.length}`);

  if (duplicates.length) {
    console.log(`\n  Duplicate ctrl nos (first 5):`);
    duplicates.slice(0, 5).forEach(c => console.log(`    ${c}`));
  }
  if (newRecords.length) {
    console.log(`\n  New ctrl nos (first 5):`);
    newRecords.slice(0, 5).forEach(c => console.log(`    ${c}`));
  }

  console.log('\n══════════════════════════════════════════════════════════');
  if (shortCount > 0) {
    console.log(`⚠️  DATE FIX NEEDED: ${shortCount} records use "D-Mon-YY" format.`);
    console.log(`   normalizeDate() will convert them automatically on import.`);
  } else {
    console.log(`✅ Dates are already in ISO format — no conversion needed.`);
  }
  console.log(`ℹ️  ${newRecords.length} new INVES records ready to import`);
  console.log(`   (${duplicates.length} will be skipped as duplicates).`);
  console.log('══════════════════════════════════════════════════════════\n');
});
