// import-sept-dec-2025.js
// Script to import September to December 2025 records from CSVs, skipping duplicates

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parse } = require('csv-parse/sync');

const dbPath = path.resolve(__dirname, 'server/data/dms.sqlite');
const db = new sqlite3.Database(dbPath);

const csvFiles = [
  'Copy of 1. NEW COMMO MASTER LIST - September 2025.csv',
  'Copy of 1. NEW COMMO MASTER LIST - October 2025.csv',
  'Copy of 1. NEW COMMO MASTER LIST - November 2025.csv',
  'Copy of 1. NEW COMMO MASTER LIST - December 2025.csv',
];

function normalizeCtrlNo(val) {
  return (val || '').trim().toUpperCase();
}

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find the header row
  const lines = content.split(/\r?\n/);
  let headerIdx = lines.findIndex(l => l.includes('MC CTRL NUMBER'));
  if (headerIdx === -1) throw new Error('Header not found in ' + filePath);
  const csvData = lines.slice(headerIdx).join('\n');
  return parse(csvData, { columns: true, skip_empty_lines: true });
}

function getAllCsvRecords() {
  let all = [];
  for (const file of csvFiles) {
    const filePath = path.resolve(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn('File not found:', filePath);
      continue;
    }
    const records = parseCsv(filePath);
    all = all.concat(records);
  }
  return all;
}

function getUniqueCtrlNos(records) {
  return records.map(r => normalizeCtrlNo(r['MC CTRL NUMBER'])).filter(Boolean);
}

function getExistingCtrlNos(callback) {
  db.all(
    "SELECT mcCtrlNo FROM records WHERE mcCtrlNo IS NOT NULL AND mcCtrlNo != ''",
    (err, rows) => {
      if (err) throw err;
      const existing = new Set(rows.map(r => normalizeCtrlNo(r.mcCtrlNo)));
      callback(existing);
    }
  );
}

function insertRecord(record, callback) {
  // Minimal insert, adjust fields as needed
  const stmt = db.prepare(`INSERT INTO records (
    mcCtrlNo, sectionCtrlNo, section, dateReceived, subjectText, fromValue, targetDate, receivedBy, actionTaken, remarks, concernedUnits, dateSent
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run([
    record['MC CTRL NUMBER'],
    record['SECTIONS CNTRL NUMBER'],
    record['SECTION'],
    record['DATE RECEIVED'],
    record['SUBJECT'],
    record['FROM'],
    record['TARGET DATE'],
    record['RECEIVED BY'],
    record['ACTION TAKEN'],
    record['REMARKS'],
    record['CONCERNED UNIT/ OFFICE (FOR / TO)'],
    record['DATE SENT'],
  ], callback);
  stmt.finalize();
}

function main() {
  const allRecords = getAllCsvRecords();
  getExistingCtrlNos(existingSet => {
    const toInsert = allRecords.filter(r => !existingSet.has(normalizeCtrlNo(r['MC CTRL NUMBER'])));
    console.log('Records to insert:', toInsert.length);
    let inserted = 0;
    function next() {
      if (toInsert.length === 0) {
        console.log('Done. Inserted:', inserted);
        db.close();
        return;
      }
      const rec = toInsert.shift();
      insertRecord(rec, err => {
        if (err) {
          console.error('Insert error:', err.message);
        } else {
          inserted++;
        }
        next();
      });
    }
    next();
  });
}

main();
