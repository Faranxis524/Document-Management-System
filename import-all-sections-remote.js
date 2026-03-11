'use strict';
/**
 * Sends all CSV-imported records from local SQLite to the remote DMS server.
 *
 * Strategy:
 *  1. Read ALL records with createdBy='CSV Import' from local SQLite.
 *  2. Fetch existing mcCtrlNos from remote (to detect duplicates up-front).
 *  3. Group new records by section.
 *  4. For each section, build a synthetic single-line CSV and POST to /import/csv.
 *
 * Usage:
 *   node import-all-sections-remote.js <serverUrl> <username> <password>
 *
 * Example:
 *   node import-all-sections-remote.js http://10.163.253.16:5000 admin admin123
 */

const path    = require('path');
const fs      = require('fs');
const http    = require('http');
const https   = require('https');
// sqlite3 lives in server/node_modules (not root)
const sqlite3 = require(path.resolve(__dirname, 'server', 'node_modules', 'sqlite3')).verbose();

const DB_PATH = path.resolve(__dirname, 'server', 'data', 'dms.sqlite');

const [,, SERVER_URL = 'http://10.163.253.16:5000', USERNAME = 'admin', PASSWORD = 'admin123'] = process.argv;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function post(url, token, payload) {
  const body   = JSON.stringify(payload);
  const headers = {
    'Content-Type'  : 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return request(url, { method: 'POST', headers }, body);
}

function get(url, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return request(url, { method: 'GET', headers });
}

// ─── CSV field encoder ────────────────────────────────────────────────────────
// Wraps a value in double-quotes if it contains comma, quote, or newline.
function csvField(v) {
  const s = (v == null ? '' : String(v));
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildCSVRow(r) {
  // Column order expected by the server's /import/csv endpoint:
  // mcCtrlNo, sectionCtrlNo, section, dateReceived, subjectText,
  // fromValue, targetDate, receivedBy, actionTaken, remarks, concernedUnits, dateSent
  return [
    r.mcCtrlNo, r.sectionCtrlNo, r.section,
    r.dateReceived, r.subjectText, r.fromValue,
    r.targetDate, r.receivedBy, r.actionTaken,
    r.remarks, r.concernedUnits, r.dateSent,
  ].map(csvField).join(',');
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  if (!fs.existsSync(DB_PATH)) { console.error('DB not found:', DB_PATH); process.exit(1); }

  // 1. Read local records
  const db  = new sqlite3.Database(DB_PATH);
  const all = (sql, p = []) => new Promise((res, rej) =>
    db.all(sql, p, (err, rows) => err ? rej(err) : res(rows)));

  const localRecords = await all(
    `SELECT mcCtrlNo, sectionCtrlNo, section, dateReceived, subjectText,
            fromValue, targetDate, receivedBy, actionTaken, remarks,
            concernedUnits, dateSent
     FROM records
     WHERE createdBy = 'CSV Import'
     ORDER BY section, dateReceived, mcCtrlNo`
  );
  db.close();
  console.log(`Local CSV-imported records: ${localRecords.length}`);

  // 2. Login to remote
  console.log(`\nLogging in to ${SERVER_URL} as "${USERNAME}"...`);
  const loginRes = await post(`${SERVER_URL}/auth/login`, null, { username: USERNAME, password: PASSWORD });
  if (loginRes.status !== 200 || !loginRes.body.token) {
    console.error('Login failed:', loginRes.body?.error || loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('Login successful');

  // 3. Fetch existing mcCtrlNos from remote
  console.log('Fetching existing records from remote...');
  const remoteRes = await get(`${SERVER_URL}/records?limit=9999`, token);
  if (remoteRes.status !== 200) {
    console.error('Failed to fetch remote records:', remoteRes.body);
    process.exit(1);
  }
  const remoteRecords = remoteRes.body.records || [];
  const remoteSet = new Set(remoteRecords.map(r => r.mcCtrlNo).filter(Boolean));
  console.log(`Remote has ${remoteSet.size} records`);

  // 4. Filter to only new records
  const newRecords = localRecords.filter(r => !remoteSet.has(r.mcCtrlNo));
  console.log(`Records to send: ${newRecords.length}  (skipping ${localRecords.length - newRecords.length} already on remote)\n`);

  if (newRecords.length === 0) {
    console.log('Nothing to do — remote is already up to date.');
    process.exit(0);
  }

  // 5. Group by section
  const bySection = {};
  for (const r of newRecords) {
    if (!bySection[r.section]) bySection[r.section] = [];
    bySection[r.section].push(r);
  }

  // 6. Send each section in chunks (max 100 records per request to avoid 413)
  const CHUNK_SIZE = 100;
  const totals = { inserted: 0, skipped: 0, errors: 0 };

  for (const [section, records] of Object.entries(bySection)) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(` Section: ${section}  (${records.length} records)`);
    console.log(`──────────────────────────────────────────`);

    let secInserted = 0, secSkipped = 0, secErrors = 0;
    const chunks = Math.ceil(records.length / CHUNK_SIZE);

    for (let ci = 0; ci < chunks; ci++) {
      const batch = records.slice(ci * CHUNK_SIZE, (ci + 1) * CHUNK_SIZE);
      const csvContent = batch.map(buildCSVRow).join('\n');

      if (chunks > 1) process.stdout.write(`  Chunk ${ci + 1}/${chunks} (${batch.length} rows)... `);

      const importRes = await post(`${SERVER_URL}/import/csv`, token, { csvContent, section });

      if (importRes.status !== 200) {
        console.error(`\n  ERROR [${section}] chunk ${ci + 1}: HTTP ${importRes.status}`, importRes.body?.error || importRes.body);
        secErrors += batch.length;
        continue;
      }

      const r = importRes.body;
      if (chunks > 1) console.log(`inserted=${r.inserted} skipped=${r.skipped}`);
      if (r.skippedList?.length) r.skippedList.forEach(s => console.log(`    SKIP: ${s}`));

      secInserted += r.inserted || 0;
      secSkipped  += r.skipped  || 0;
      secErrors   += r.errors   || 0;
    }

    if (chunks === 1 && secErrors === 0) {
      console.log(`  Inserted : ${secInserted}`);
      console.log(`  Skipped  : ${secSkipped}`);
    } else if (chunks > 1) {
      console.log(`  Total → Inserted: ${secInserted}  Skipped: ${secSkipped}  Errors: ${secErrors}`);
    }

    totals.inserted += secInserted;
    totals.skipped  += secSkipped;
    totals.errors   += secErrors;
  }

  // 7. Summary
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         REMOTE IMPORT SUMMARY           ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`  Inserted : ${totals.inserted}`);
  console.log(`  Skipped  : ${totals.skipped}`);
  console.log(`  Errors   : ${totals.errors}`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('Done.');
})();
