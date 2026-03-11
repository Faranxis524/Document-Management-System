'use strict';
/**
 * Diagnose why 33 records fail to insert on remote.
 * - Checks if the mcCtrlNo already exists on remote (possibly different section)
 * - Then tries a direct insert via POST /records to see the actual error
 */
const http = require('http');
const sqlite3 = require('./server/node_modules/sqlite3').verbose();

const MISSING = [
  'RFU4A-MC-2025-0917-01','RFU4A-MC-2025-0919-06','RFU4A-MC-2025-0925-05',
  'RFU4A-MC-2025-0925-06','RFU4A-MC-2025-1006-11','RFU4A-MC-2025-1010-21',
  'RFU4A-MC-2025-1011-04','RFU4A-MC-2025-1013-01','RFU4A-MC-2025-1013-15',
  'RFU4A-MC-2025-1014-07','RFU4A-MC-2025-1015-16','RFU4A-MC-2025-1016-11',
  'RFU4A-MC-2025-1020-18','RFU4A-MC-2025-1021-12','RFU4A-MC-2025-1022-23',
  'RFU4A-MC-2025-1023-13','RFU4A-MC-2025-1023-14','RFU4A-MC-2025-1023-15',
  'RFU4A-MC-2025-1023-16','RFU4A-MC-2025-1024-01','RFU4A-MC-2025-1024-12',
  'RFU4A-MC-2025-1025-04','RFU4A-MC-2025-1026-01','RFU4A-MC-2025-1027-06',
  'RFU4A-MC-2025-1028-14','RFU4A-MC-2025-1103-09','RFU4A-MC-2025-1103-10',
  'RFU4A-MC-2025-1104-19','RFU4A-MC-2025-1105-07','RFU4A-MC-2025-1106-08',
  'RFU4A-MC-2025-1106-09','RFU4A-MC-2025-1107-05','RFU4A-MC-2025-1109-01',
];

const post = (url, body, token) => new Promise((res, rej) => {
  const b = JSON.stringify(body);
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) };
  if (token) headers.Authorization = 'Bearer ' + token;
  const req = http.request(url, { method: 'POST', headers }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => {
      try { res({ status: r.statusCode, body: JSON.parse(d) }); }
      catch { res({ status: r.statusCode, body: d }); }
    });
  });
  req.on('error', rej); req.write(b); req.end();
});

const get = (url, token) => new Promise((res, rej) => {
  const req = http.request(url, { headers: { Authorization: 'Bearer ' + token } }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => {
      try { res({ status: r.statusCode, body: JSON.parse(d) }); }
      catch { res({ status: r.statusCode, body: d }); }
    });
  });
  req.on('error', rej); req.end();
});

(async () => {
  const { token } = (await post('http://10.163.253.16:5000/auth/login', { username: 'admin', password: 'admin123' })).body;
  const { records: remoteRecs } = (await get('http://10.163.253.16:5000/records?limit=9999', token)).body;
  const remoteMap = new Map(remoteRecs.map(r => [r.mcCtrlNo, r.section]));

  // Check if any of the 33 are on remote under a different key
  console.log('Checking remote for mcCtrlNo conflicts:');
  const missingOnRemote = [];
  for (const mc of MISSING) {
    if (remoteMap.has(mc)) {
      console.log(`  FOUND on remote: ${mc} → section "${remoteMap.get(mc)}"`);
    } else {
      missingOnRemote.push(mc);
    }
  }
  console.log(`  ${missingOnRemote.length} genuinely absent from remote\n`);

  // Get local records for these mcCtrlNos
  const db = new sqlite3.Database('./server/data/dms.sqlite');
  const rows = await new Promise((res, rej) =>
    db.all(
      `SELECT * FROM records WHERE mcCtrlNo IN (${MISSING.map(() => '?').join(',')})`,
      MISSING, (e, r) => e ? rej(e) : res(r)
    )
  );
  db.close();

  // Try sending each one via /import/csv (one at a time) and capture the full response
  console.log('Testing single-record /import/csv for each missing record:');
  for (const row of rows) {
    const csvField = v => {
      const s = v == null ? '' : String(v);
      return (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csvLine = [
      row.mcCtrlNo, row.sectionCtrlNo, row.section, row.dateReceived, row.subjectText,
      row.fromValue, row.targetDate, row.receivedBy, row.actionTaken,
      row.remarks, row.concernedUnits, row.dateSent,
    ].map(csvField).join(',');

    const resp = await post('http://10.163.253.16:5000/import/csv', { csvContent: csvLine, section: row.section }, token);
    const r = resp.body;
    const outcome = r.errors > 0 ? `ERR: ${JSON.stringify(r.errorsList || r)}` :
                    r.inserted > 0 ? `OK (inserted=1)` : `inserted=0 skipped=${r.skipped}`;
    console.log(`  ${row.mcCtrlNo} [${row.section}]  → ${outcome}`);
    if (r.skippedList?.length) console.log(`    skipped: ${JSON.stringify(r.skippedList)}`);
  }
})();
