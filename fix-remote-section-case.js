'use strict';
const https = require('https');
const http = require('http');

const SERVER = 'http://10.163.253.16:5000';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER + path);
    const lib = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // Login
  console.log('Logging in...');
  const loginRes = await request('POST', '/auth/login', { username: USERNAME, password: PASSWORD });
  if (!loginRes.body.token) { console.error('Login failed:', loginRes.body); process.exit(1); }
  const token = loginRes.body.token;
  console.log('Login successful');

  // Fetch all records (high limit) and filter for "Inves"
  console.log('Fetching records...');
  const recRes = await request('GET', '/records?limit=5000', null, token);
  const allRecords = recRes.body.records || [];
  const toFix = allRecords.filter(r => r.section === 'Inves');
  console.log(`Found ${toFix.length} records with section="Inves" on remote`);

  if (toFix.length === 0) {
    console.log('Nothing to fix.');
    process.exit(0);
  }

  let fixed = 0, failed = 0;
  for (const rec of toFix) {
    const res = await request('PUT', `/records/${rec.id}`, { ...rec, section: 'INVES', version: rec.version }, token);
    if (res.status === 200) {
      fixed++;
    } else {
      console.error(`  FAIL id=${rec.id}: ${JSON.stringify(res.body)}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Fixed  : ${fixed}`);
  console.log(`Failed : ${failed}`);
  console.log(`─────────────────────────────────`);
})();
