/**
 * Remote CSV importer — sends a CSV file to the running DMS server.
 * No external packages needed (uses built-in http/https).
 *
 * Usage:
 *   node import-csv-remote.js <serverUrl> <username> <password> <csvFile> <section>
 *
 * Example (server on same network):
 *   node import-csv-remote.js http://192.168.1.100:3001 admin yourpassword "commo.csv" INVES
 *
 * Example (localhost):
 *   node import-csv-remote.js http://localhost:3001 admin yourpassword "commo.csv" INVES
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const https = require('https');

// ── Args ─────────────────────────────────────────────────────────────────────
const [,, serverUrl, username, password, csvFile, section] = process.argv;

if (!serverUrl || !username || !password || !csvFile || !section) {
  console.error('Usage: node import-csv-remote.js <serverUrl> <username> <password> <csvFile> <section>');
  console.error('Example: node import-csv-remote.js http://192.168.1.100:3001 admin pass123 "commo.csv" INVES');
  process.exit(1);
}

const csvPath = path.resolve(csvFile);
if (!fs.existsSync(csvPath)) {
  console.error('❌  CSV file not found:', csvPath);
  process.exit(1);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  return request(url, { method: 'POST', headers }, body);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  // 1. Login
  console.log(`\n🔐  Logging in as "${username}" on ${serverUrl}…`);
  const loginRes = await post(`${serverUrl}/auth/login`, null, { username, password });
  if (loginRes.status !== 200 || !loginRes.body.token) {
    console.error('❌  Login failed:', loginRes.body?.error || loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('✅  Login successful');

  // 2. Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  console.log(`📄  Read CSV: ${csvPath}`);
  console.log(`📦  Sending to server (section: ${section})…\n`);

  // 3. POST to /import/csv
  const importRes = await post(`${serverUrl}/import/csv`, token, { csvContent, section });

  if (importRes.status !== 200) {
    console.error('❌  Import failed:', importRes.body?.error || importRes.body);
    process.exit(1);
  }

  const r = importRes.body;
  console.log('─────────────────────────────────────────');
  console.log(`Total rows matched  : ${r.total}`);
  console.log(`✅  Inserted        : ${r.inserted}`);
  console.log(`⏭️   Skipped         : ${r.skipped}`);
  console.log(`❌  Errors          : ${r.errors}`);

  if (r.skippedList?.length) {
    console.log('\nSkipped:');
    r.skippedList.forEach(s => console.log('  • ' + s));
  }
  if (r.errorList?.length) {
    console.log('\nErrors:');
    r.errorList.forEach(e => console.log('  • ' + e));
  }
  console.log('─────────────────────────────────────────');
  console.log('Done.');
})();
