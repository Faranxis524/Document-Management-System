'use strict';
const http = require('http');

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

const post = (url, body) => new Promise((res, rej) => {
  const b = JSON.stringify(body);
  const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, r => {
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

  // Fresh fetch of ALL records
  const resp = await get('http://10.163.253.16:5000/records?limit=9999', token);
  const remoteRecs = resp.body.records || [];
  console.log('Remote total:', remoteRecs.length);
  console.log('Pagination:', resp.body.pagination);

  const remoteSet = new Set(remoteRecs.map(r => r.mcCtrlNo));

  // Section counts
  const counts = {};
  remoteRecs.forEach(r => { counts[r.section] = (counts[r.section]||0)+1; });
  console.log('\nSection counts:');
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([s,c]) => console.log('  ' + String(c).padStart(5) + '  ' + s));

  // Check which of the 33 are now present
  console.log('\nStatus of the 33 records:');
  const stillMissing = MISSING.filter(mc => !remoteSet.has(mc));
  const found = MISSING.filter(mc => remoteSet.has(mc));
  console.log('  Found   :', found.length);
  console.log('  Missing :', stillMissing.length);
  if (stillMissing.length) {
    stillMissing.forEach(mc => console.log('    - ' + mc));
  }
})();
