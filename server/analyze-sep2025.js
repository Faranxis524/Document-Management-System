'use strict';
const fs = require('fs'), path = require('path');

const csv = fs.readFileSync(
  path.resolve(__dirname, '..', 'Copy of 1. NEW COMMO MASTER LIST - September 2025.csv'), 'utf8'
);
const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());

function parseCSVLine(line) {
  const r = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (c === ',' && !inQ) { r.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  r.push(cur.trim()); return r;
}

console.log('=== FIRST 6 LINES (RAW) ===');
for (let i = 0; i < 6; i++) console.log(`Line ${i}: ${lines[i].substring(0, 130)}`);

const dataRows = lines.map(parseCSVLine).filter(p => p[0] && p[0].startsWith('RFU4A-MC'));

console.log('\n=== ALL COLUMN HEADERS (from row with MC CTRL) ===');
const headerRow = lines.map(parseCSVLine).find(p => p[0] === 'MC CTRL NUMBER');
if (headerRow) headerRow.forEach((h, i) => console.log(`  col[${i}]: "${h}"`));

console.log('\n=== SECTION BREAKDOWN ===');
const secMap = {};
dataRows.forEach(p => {
  const sec = (p[2] || '(blank)').trim();
  secMap[sec] = (secMap[sec] || 0) + 1;
});
let total = 0;
Object.entries(secMap).sort((a,b) => b[1]-a[1]).forEach(([s,c]) => { console.log(`  "${s}": ${c}`); total += c; });
console.log(`  TOTAL data rows: ${total}`);

console.log('\n=== COLUMN COUNT ===');
const colCounts = {};
dataRows.forEach(p => { colCounts[p.length] = (colCounts[p.length]||0)+1; });
Object.entries(colCounts).forEach(([n,c]) => console.log(`  ${n} columns: ${c} rows`));

console.log('\n=== SAMPLE ROWS (3 non-INVES) ===');
dataRows.filter(p => (p[2]||'').toUpperCase() !== 'INVES').slice(0, 3).forEach(p => {
  console.log(`  mcCtrl: ${p[0]}`);
  console.log(`  secCtrl: ${p[1]}`);
  console.log(`  section: ${p[2]}`);
  console.log(`  date: ${p[3]}`);
  console.log(`  subject: ${(p[4]||'').substring(0,60)}`);
  console.log(`  target: ${p[6]}`);
  console.log(`  dateSent(col11): ${p[11]}`);
  console.log('  ---');
});

console.log('\n=== MALFORMED ROWS (< 12 columns) ===');
const malformed = dataRows.filter(p => p.length < 12);
if (!malformed.length) { console.log('  None.'); }
else {
  malformed.forEach((p, i) => {
    console.log(`  [${i+1}] cols:${p.length} | mcCtrl:"${p[0]}" secCtrl:"${p[1]||''}" sec:"${p[2]||''}" date:"${p[3]||''}" subject:"${(p[4]||'').substring(0,50)}" from:"${p[5]||''}" target:"${p[6]||''}" recvBy:"${p[7]||''}" action:"${p[8]||''}" remarks:"${(p[9]||'').substring(0,30)}" units:"${p[10]||''}" dateSent:"${p[11]||''}"`);
  });
}

console.log('\n=== UNIQUE VALUES: SECTION (col[2]) ===');
const uniqSec = [...new Set(dataRows.map(p=>(p[2]||'').trim()))].sort();
uniqSec.forEach(v => console.log(`  "${v}"`));

console.log('\n=== UNIQUE VALUES: FROM (col[5]) ===');
const uniqFrom = [...new Set(dataRows.map(p=>(p[5]||'').trim()))].filter(v=>v).sort();
uniqFrom.forEach(v => console.log(`  "${v}"`));

console.log('\n=== UNIQUE VALUES: TARGET DATE (col[6]) ===');
const uniqTarget = [...new Set(dataRows.map(p=>(p[6]||'').trim()))].sort();
uniqTarget.slice(0,30).forEach(v => console.log(`  "${v}"`));
if (uniqTarget.length > 30) console.log(`  ... and ${uniqTarget.length - 30} more`);

console.log('\n=== UNIQUE VALUES: RECEIVED BY (col[7]) ===');
const uniqRecvBy = [...new Set(dataRows.map(p=>(p[7]||'').trim()))].filter(v=>v).sort();
uniqRecvBy.forEach(v => console.log(`  "${v}"`));

console.log('\n=== UNIQUE VALUES: ACTION TAKEN (col[8]) ===');
const uniqAction = [...new Set(dataRows.map(p=>(p[8]||'').trim()))].filter(v=>v).sort();
uniqAction.forEach(v => console.log(`  "${v}"`));

console.log('\n=== UNIQUE VALUES: CONCERNED UNIT (col[10]) ===');
const uniqUnits = [...new Set(dataRows.map(p=>(p[10]||'').trim()))].filter(v=>v).sort();
uniqUnits.forEach(v => console.log(`  "${v}"`));

console.log('\n=== UNIQUE VALUES: DATE SENT (col[11]) — non-date patterns ===');
const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function nd(v) {
  if (!v) return null;
  const m = v.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!m) return null;
  const y = parseInt(m[3]) < 100 ? 2000+parseInt(m[3]) : parseInt(m[3]);
  return new Date(`${y}-${String(MONTHS[m[2].toLowerCase()]).padStart(2,'0')}-${m[1].padStart(2,'0')}`);
}
const uniqSent = [...new Set(dataRows.map(p=>(p[11]||'').trim()))].filter(v=>v).sort();
const nonDateSent = uniqSent.filter(v => !nd(v));
if (!nonDateSent.length) console.log('  All are valid date formats or blank.');
else nonDateSent.forEach(v => console.log(`  "${v}"`));

console.log('\n=== CHECK: dateSent BEFORE dateReceived ===');
let flagged = 0;
dataRows.forEach(p => {
  const dr = nd(p[3]), ds = nd(p[11]);
  if (ds && dr && ds < dr) {
    flagged++;
    console.log(`  ${p[0]} | recv:${p[3]} sent:${p[11]}`);
  }
});
if (!flagged) console.log('  None found.');

console.log('\n=== SECTION CONVERSION MAP (CSV → System) ===');
console.log('  "OPNS"  → "OPN"');
console.log('  "Intel" → "INTEL"');
console.log('  "Inves" / "INVES" → "INVES"');
console.log('  "Admin" → "ADM"');
console.log('  "PCRS"  → "OPN/PCR"  (assumed — please confirm)');
console.log('\nSystem knownActions: ["DRAFTED", "DISSEMINATED", "FILED"]');
console.log('Status: computed (Pending/Completed/Overdue) — NOT stored from CSV');
