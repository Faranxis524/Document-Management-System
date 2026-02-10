const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
require('dotenv').config();

const { db, initDb, isSqlite } = require('./lib/db');

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function getMonthFolder(dateString) {
  const sourceDate = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
  const safeDate = Number.isNaN(sourceDate.getTime()) ? new Date() : sourceDate;
  return safeDate.toLocaleString('en-US', { month: 'long' }).toLowerCase();
}

function sanitizeFolderName(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  return normalized || fallback;
}

function resolveStoredFilePath(subjectFileUrl) {
  const relativeUrl = String(subjectFileUrl || '')
    .replace(/^\/uploads\/?/, '')
    .replace(/^\/+/, '');
  const normalizedRelative = path.normalize(relativeUrl).replace(/^([.]{2}[\\/])+/, '');
  const resolvedPath = path.resolve(uploadDir, normalizedRelative);
  if (!resolvedPath.startsWith(uploadDir)) {
    return null;
  }
  return resolvedPath;
}

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 50);
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowed.includes(ext)) {
      cb(new Error('Only PDF and DOCX files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const jwtSecret = process.env.JWT_SECRET || 'change-me';

const USERS = [
  { username: 'NUP Tala', password: 'password', role: 'MC', section: null },
  { username: 'PMSG Foncardas', password: 'password', role: 'MC', section: null },
  { username: 'NUP Tala - INVES', password: 'password', role: 'SECTION', section: 'INVES' },
  { username: 'NUP San Pedro', password: 'password', role: 'SECTION', section: 'ADM' },
  { username: 'PMSG Foncardas - ADM', password: 'password', role: 'SECTION', section: 'ADM' },
  { username: 'NUP Aldrin', password: 'password', role: 'SECTION', section: 'OPN' },
  { username: 'PCPL Bueno', password: 'password', role: 'SECTION', section: 'OPN' },
  { username: 'PAT Duyag', password: 'password', role: 'SECTION', section: 'OPN' },
  { username: 'NUP Joyce', password: 'password', role: 'SECTION', section: 'INTEL' },
  { username: 'PCPL Jose', password: 'password', role: 'SECTION', section: 'INTEL' },
];

const DEFAULT_FROM = {
  INVES: 'IND',
  OPN: 'OMD',
  INTEL: 'ID',
  ADM: 'ARMD',
};

const DEFAULT_RECEIVED_BY = {
  INVES: ['NUP TALA'],
  OPN: ['NUP Aldrin', 'PCPL Bueno', 'PAT Duyag'],
  INTEL: ['NUP Joyce', 'PCPL Jose'],
  ADM: ['NUP San Pedro', 'PMSG Foncardas'],
};

function signToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role, section: user.section },
    jwtSecret,
    { expiresIn: '8h' }
  );
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const bearerToken = auth.replace('Bearer ', '');
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  const token = bearerToken || queryToken;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

function normalizeRemarks(payload) {
  const selected = [];
  if (payload.remarksEmail) selected.push('Email');
  if (payload.remarksViber) selected.push('Viber');
  if (payload.remarksHardCopy) selected.push('Hard Copy');
  return selected.join(' / ');
}

function formatCtrlNo(prefix, section, dateStr, seq) {
  const date = dateStr.replace(/-/g, '').slice(2);
  const padded = String(seq).padStart(2, '0');
  const suffix = section ? `-${section}` : '-MC';
  return `${prefix}${suffix}-${date}-${padded}`;
}

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const hash = await bcrypt.hash(user.password, 8);
  const ok = await bcrypt.compare(password || '', hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json({ token: signToken(user), user: { username: user.username, role: user.role, section: user.section } });
});

app.get('/users/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/sections', (_req, res) => {
  res.json({ sections: ['INVES', 'INTEL', 'ADM', 'OPN'] });
});

async function getNextControlNumbers(section, dateReceived, preview = false) {
  const getCounter = preview ? db.getNextCounterPreview : db.getNextCounter;
  const mcSeq = await getCounter({ scope: 'MC', section: null, dateReceived });
  const sectionSeq = await getCounter({ scope: 'SECTION', section, dateReceived });
  const mcCtrlNo = formatCtrlNo('RFU4A', null, dateReceived, mcSeq);
  const sectionCtrlNo = formatCtrlNo('RFU4A', section, dateReceived, sectionSeq);
  return { mcCtrlNo, sectionCtrlNo };
}

app.post('/control-numbers/next', authMiddleware, requireRole(['MC']), async (req, res) => {
  const { section, dateReceived } = req.body;
  if (!section) return res.status(400).json({ error: 'Section is required' });
  if (!dateReceived) return res.status(400).json({ error: 'Date received is required' });
  const result = await getNextControlNumbers(section, dateReceived, false);
  res.json(result);
});

app.post('/control-numbers/preview', authMiddleware, async (req, res) => {
  const { section, dateReceived } = req.body;
  if (!section) return res.status(400).json({ error: 'Section is required' });
  if (!dateReceived) return res.status(400).json({ error: 'Date received is required' });
  if (req.user.role === 'SECTION' && req.user.section !== section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const result = await getNextControlNumbers(section, dateReceived, true);
  res.json(result);
});

app.post('/records', authMiddleware, async (req, res) => {
  const payload = req.body;
  if (req.user.role === 'SECTION' && payload.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!payload.section || !payload.dateReceived) {
    return res.status(400).json({ error: 'Section and date received are required' });
  }
  const { mcCtrlNo, sectionCtrlNo } = await getNextControlNumbers(payload.section, payload.dateReceived, false);
  const remarks = normalizeRemarks(payload);
  const record = await db.createRecord({ ...payload, mcCtrlNo, sectionCtrlNo, remarks });
  res.json(record);
});

app.get('/records', authMiddleware, async (req, res) => {
  const { section } = req.query;
  const filters = {};
  if (req.user.role === 'SECTION') {
    filters.section = req.user.section;
  } else if (section) {
    filters.section = section;
  }
  const records = await db.listRecords(filters);
  res.json({ records });
});

app.get('/records/:id', authMiddleware, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && record.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(record);
});

app.put('/records/:id', authMiddleware, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && record.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const remarks = normalizeRemarks(req.body);
  const updated = await db.updateRecord(req.params.id, { ...req.body, remarks });
  res.json(updated);
});

app.delete('/records/:id', authMiddleware, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && record.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await db.deleteRecord(req.params.id);
  res.json({ ok: true });
});

app.post('/records/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && record.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const monthFolder = sanitizeFolderName(getMonthFolder(record.dateReceived), 'unknown-month');
  const sectionFolder = sanitizeFolderName(record.section, 'general');
  const targetDir = path.join(uploadDir, monthFolder, sectionFolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = path.extname(req.file.originalname || '').toLowerCase();
  const storedName = `${req.file.filename}${ext}`;
  const tempPath = path.join(uploadDir, req.file.filename);
  const finalPath = path.join(targetDir, storedName);
  if (tempPath !== finalPath && fs.existsSync(tempPath)) {
    fs.renameSync(tempPath, finalPath);
  }
  const fileUrl = `/uploads/${monthFolder}/${sectionFolder}/${storedName}`;
  const updated = await db.updateRecordFile(req.params.id, { subjectFileUrl: fileUrl, updatedBy: req.user.username });
  res.json(updated);
});

app.get('/records/:id/file', authMiddleware, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && record.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!record.subjectFileUrl) return res.status(404).json({ error: 'No file' });

  const filePath = resolveStoredFilePath(record.subjectFileUrl);
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const ext = path.extname(filePath).toLowerCase();
  const contentTypeByExt = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const contentType = contentTypeByExt[ext] || 'application/octet-stream';
  const fileName = path.basename(filePath);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.sendFile(filePath);
});

app.post('/export', authMiddleware, async (req, res) => {
  const { section } = req.body;
  let filterSection = section;
  if (req.user.role === 'SECTION') filterSection = req.user.section;
  const records = await db.listRecords(filterSection ? { section: filterSection } : {});

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Records');
  sheet.columns = [
    { header: 'MC Ctrl No.', key: 'mcCtrlNo', width: 18 },
    { header: 'Section Ctrl No.', key: 'sectionCtrlNo', width: 22 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Date Received', key: 'dateReceived', width: 16 },
    { header: 'Subject', key: 'subjectText', width: 30 },
    { header: 'From', key: 'fromValue', width: 12 },
    { header: 'Target Date', key: 'targetDate', width: 16 },
    { header: 'Received By', key: 'receivedBy', width: 18 },
    { header: 'Action Taken', key: 'actionTaken', width: 14 },
    { header: 'Remarks', key: 'remarks', width: 20 },
    { header: 'Concerned Units', key: 'concernedUnits', width: 20 },
    { header: 'Date Sent', key: 'dateSent', width: 16 },
  ];

  records.forEach((row) => {
    const subject = row.subjectFileUrl
      ? { text: row.subjectText || 'File', hyperlink: row.subjectFileUrl }
      : row.subjectText;
    sheet.addRow({ ...row, subjectText: subject });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.get('/config/defaults', authMiddleware, (_req, res) => {
  res.json({ from: DEFAULT_FROM, receivedBy: DEFAULT_RECEIVED_BY });
});

app.use('/uploads', express.static(uploadDir));

initDb().then(() => {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    console.log(`API listening on ${port} using ${isSqlite ? 'SQLite' : 'Postgres'}`);
  });
});
