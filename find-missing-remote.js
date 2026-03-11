'use strict';
const http    = require('http');
const sqlite3 = require('./server/node_modules/sqlite3').verbose();

const post = (url, body) => new Promise((res, rej) => {
  const b = JSON.stringify(body);
  const req = http.request(url, { method: 'POST', headers: {'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)} }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  });
  req.on('error', rej); req.write(b); req.end();
});
const get = (url, token) => new Promise((res, rej) => {
  const req = http.request(url, { headers: { Authorization: 'Bearer ' + token } }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  });
  req.on('error', rej); req.end();
});

(async () => {
  const { token } = await post('http://10.163.253.16:5000/auth/login', { username: 'admin', password: 'admin123' });
  const { records: remoteRecs } = await get('http://10.163.253.16:5000/records?limit=9999', token);
  const remoteSet = new Set(remoteRecs.map(r => r.mcCtrlNo));

  const db = new sqlite3.Database('./server/data/dms.sqlite');
  const localRecs = await new Promise((res, rej) =>
    db.all("SELECT mcCtrlNo, section, dateReceived, dateSent FROM records WHERE createdBy='CSV Import'", [], (e, r) => e ? rej(e) : res(r)));
  db.close();

  const missing = localRecs.filter(r => !remoteSet.has(r.mcCtrlNo));
  console.log('Missing from remote (' + missing.length + '):');
  missing.forEach(r => console.log('  ' + r.mcCtrlNo + '  [' + r.section + ']  dr=' + r.dateReceived + '  ds=' + r.dateSent));
})();
