const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { db, initDb, isSqlite } = require('./lib/db');
const { seedUsers } = require('./lib/seedUsers');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Async Error Handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

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

function validateInput(schema) {
  return (req, res, next) => {
    const data = { ...req.body, ...req.query, ...req.params };
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value && rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }
      
      if (value && rules.type === 'number' && typeof value !== 'number') {
        errors.push(`${field} must be a number`);
      }
      
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
      
      if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }
      
      if (value && rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }
    
    next();
  };
}

function sanitizeInput(data) {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function validateDates(payload) {
  const errors = [];
  const { dateReceived, targetDate, dateSent } = payload;
  
  if (dateReceived && !/^\d{4}-\d{2}-\d{2}$/.test(dateReceived)) {
    errors.push('Date received must be in YYYY-MM-DD format');
  }
  
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) && targetDate !== '') {
    // Allow empty or valid date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(targetDate)) {
      errors.push('Target date must be in YYYY-MM-DD format or a text description');
    }
  }
  
  if (dateSent && !/^\d{4}-\d{2}-\d{2}$/.test(dateSent) && dateSent !== '') {
    errors.push('Date sent must be in YYYY-MM-DD format');
  }
  
  // Validate date logic only if dates are in proper format
  if (dateReceived && targetDate && /^\d{4}-\d{2}-\d{2}$/.test(dateReceived) && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const received = new Date(dateReceived);
    const target = new Date(targetDate);
    
    if (target < received) {
      errors.push('Target date cannot be earlier than date received');
    }
  }
  
  if (dateReceived && dateSent && /^\d{4}-\d{2}-\d{2}$/.test(dateReceived) && /^\d{4}-\d{2}-\d{2}$/.test(dateSent)) {
    const received = new Date(dateReceived);
    const sent = new Date(dateSent);
    
    if (sent < received) {
      errors.push('Date sent cannot be earlier than date received');
    }
  }
  
  return errors;
}

function normalizeRemarks(payload) {
  const selected = [];
  if (payload.remarksEmail) selected.push('email');
  if (payload.remarksViber) selected.push('viber');
  if (payload.remarksHardCopy) selected.push('hardcopy');

  if (selected.length === 0) return '';
  return `sent through ${selected.join('/ ')}`;
}

function coerceRemarksText(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // Already in the desired format.
  if (raw.toLowerCase().startsWith('sent through')) return raw;

  // Strip brackets from previously formatted values.
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (inner.toLowerCase().startsWith('sent through')) return inner;
  }

  // Backward-compat: older records were stored like: "Email / Viber" or "Hard Copy".
  const tokens = raw
    .split('/')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => {
      if (part === 'hard copy' || part === 'hardcopy') return 'hardcopy';
      if (part === 'email') return 'email';
      if (part === 'viber') return 'viber';
      return '';
    })
    .filter(Boolean);

  if (tokens.length === 0) return '';
  const order = { email: 1, viber: 2, hardcopy: 3 };
  const uniqueSorted = Array.from(new Set(tokens)).sort((a, b) => order[a] - order[b]);
  return `sent through ${uniqueSorted.join('/ ')}`;
}

function formatCtrlNo(prefix, section, dateStr, seq) {
  const date = dateStr.replace(/-/g, '').slice(2);
  const padded = String(seq).padStart(2, '0');
  const suffix = section ? `-${section}` : '-MC';
  return `${prefix}${suffix}-${date}-${padded}`;
}

app.post('/auth/login', loginLimiter, validateInput({
  username: { required: true, type: 'string' },
  password: { required: true, type: 'string' }
}), asyncHandler(async (req, res) => {
  try {
    const { username, password } = sanitizeInput(req.body);
    const user = await db.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    const tokenData = { username: user.username, role: user.role, section: user.section };
    return res.json({ 
      token: signToken(tokenData), 
      user: { username: user.username, role: user.role, section: user.section } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}));

app.get('/auth/verify', authMiddleware, (req, res) => {
  res.json({ user: req.user });
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
  const payload = sanitizeInput(req.body);
  
  if (req.user.role === 'SECTION' && payload.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  if (!payload.section || !payload.dateReceived) {
    return res.status(400).json({ error: 'Section and date received are required' });
  }
  
  const dateErrors = validateDates(payload);
  if (dateErrors.length > 0) {
    return res.status(400).json({ error: dateErrors.join('. ') });
  }
  
  const { mcCtrlNo, sectionCtrlNo } = await getNextControlNumbers(payload.section, payload.dateReceived, false);
  const remarksText = normalizeRemarks(payload);
  const record = await db.createRecord({ ...payload, mcCtrlNo, sectionCtrlNo, remarks: remarksText });
  res.json({ ...record, remarksText });
});

app.get('/records', authMiddleware, async (req, res) => {
  const { section, page = '1', limit = '1000' } = req.query;
  const filters = {};
  if (req.user.role === 'SECTION') {
    filters.section = req.user.section;
  } else if (section) {
    filters.section = section;
  }
  const allRecords = await db.listRecords(filters);
  
  // Pagination support (currently returns all, but infrastructure is ready)
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 1000;
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedRecords = allRecords.slice(startIndex, endIndex);
  
  res.json({
    records: paginatedRecords.map((row) => ({
      ...row,
      remarksText: coerceRemarksText(row.remarks),
    })),
    pagination: {
      total: allRecords.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(allRecords.length / limitNum)
    }
  });
});

// Validate control numbers for missing or duplicate entries
app.get('/records/validate-control-numbers', authMiddleware, asyncHandler(async (req, res) => {
  const { section, dateReceived } = req.query;
  
  if (!section) {
    return res.status(400).json({ error: 'Section parameter is required' });
  }
  
  if (!dateReceived) {
    return res.status(400).json({ error: 'dateReceived parameter is required' });
  }
  
  // Check permissions
  if (req.user.role === 'SECTION' && req.user.section !== section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const validation = await db.validateControlNumbers(section, dateReceived);
  
  return res.json({
    section,
    dateReceived,
    ...validation,
    status: validation.hasProblems ? 'issues_found' : 'ok'
  });
}));

// Reset counters for a specific section/date (admin only)
app.post('/records/reset-counters', authMiddleware, requireRole(['MC']), asyncHandler(async (req, res) => {
  const { section, dateReceived } = req.body;
  
  if (!section) {
    return res.status(400).json({ error: 'Section is required' });
  }
  
  if (!dateReceived) {
    return res.status(400).json({ error: 'dateReceived is required' });
  }
  
  const result = await db.resetCountersForSection(section, dateReceived);
  const validation = await db.validateControlNumbers(section, dateReceived);
  
  return res.json({
    ok: true,
    section,
    dateReceived,
    resetResult: result,
    validation
  });
}));

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
  
  const payload = sanitizeInput(req.body);
  const dateErrors = validateDates(payload);
  if (dateErrors.length > 0) {
    return res.status(400).json({ error: dateErrors.join('. ') });
  }
  
  const remarksText = normalizeRemarks(payload);
  const updated = await db.updateRecord(req.params.id, { ...payload, remarks: remarksText });
  res.json({ ...updated, remarksText });
});

app.delete('/records/:id', authMiddleware, asyncHandler(async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && record.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Store section and date before deleting
  const { section, dateReceived } = record;
  
  await db.deleteRecord(req.params.id);
  
  // Reset counters for this section/date to avoid gaps
  try {
    const resetResult = await db.resetCountersForSection(section, dateReceived);
    console.log(`Counters reset for ${section} on ${dateReceived}:`, resetResult);
    
    // Validate for any issues
    const validation = await db.validateControlNumbers(section, dateReceived);
    if (validation.hasProblems) {
      console.warn('Control number issues detected:', validation);
    }
    
    return res.json({ 
      ok: true, 
      countersReset: resetResult,
      validation: validation.hasProblems ? validation : undefined
    });
  } catch (resetError) {
    console.error('Error resetting counters:', resetError);
    // Still return success for deletion even if reset fails
    return res.json({ ok: true, warning: 'Record deleted but counter reset failed' });
  }
}));

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

app.delete('/records/:id/file', authMiddleware, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && record.section !== req.user.section) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!record.subjectFileUrl) return res.status(404).json({ error: 'No file to remove' });

  const filePath = resolveStoredFilePath(record.subjectFileUrl);
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }
  
  const updated = await db.updateRecordFile(req.params.id, { subjectFileUrl: null, updatedBy: req.user.username });
  res.json(updated);
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
    sheet.addRow({ ...row, subjectText: subject, remarks: coerceRemarksText(row.remarks) });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.get('/config/defaults', authMiddleware, (_req, res) => {
  res.json({ from: DEFAULT_FROM, receivedBy: DEFAULT_RECEIVED_BY });
});

app.get('/users/list', (_req, res) => {
  // Public endpoint for login dropdown
  const users = [
    { label: 'NUP Tala (MC)', username: 'NUP Tala', role: 'MC', section: null },
    { label: 'PMSG Foncardas (MC)', username: 'PMSG Foncardas', role: 'MC', section: null },
    { label: 'NUP Tala (INVES)', username: 'NUP Tala - INVES', role: 'SECTION', section: 'INVES' },
    { label: 'NUP San Pedro (ADM)', username: 'NUP San Pedro', role: 'SECTION', section: 'ADM' },
    { label: 'PMSG Foncardas (ADM)', username: 'PMSG Foncardas - ADM', role: 'SECTION', section: 'ADM' },
    { label: 'NUP Aldrin (OPN)', username: 'NUP Aldrin', role: 'SECTION', section: 'OPN' },
    { label: 'PCPL Bueno (OPN)', username: 'PCPL Bueno', role: 'SECTION', section: 'OPN' },
    { label: 'PAT Duyag (OPN)', username: 'PAT Duyag', role: 'SECTION', section: 'OPN' },
    { label: 'NUP Joyce (INTEL)', username: 'NUP Joyce', role: 'SECTION', section: 'INTEL' },
    { label: 'PCPL Jose (INTEL)', username: 'PCPL Jose', role: 'SECTION', section: 'INTEL' },
  ];
  res.json({ users });
});

app.use('/uploads', express.static(uploadDir));

// Apply rate limiting to all authenticated API routes
app.use(authMiddleware, apiLimiter);

// Global Error Handler (must be last) 
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: `File too large. Maximum size is ${maxFileSizeMb}MB` });
  }
  
  // Multer file type error
  if (err.message?.includes('Only PDF and DOCX files are allowed')) {
    return res.status(400).json({ error: err.message });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Something went wrong';
  
  res.status(statusCode).json({ error: message });
});

// Initialize database and start server
let server;

async function startServer() {
  await initDb();
  await seedUsers();
  const port = Number(process.env.PORT || 5000);
  server = app.listen(port, () => {
    console.log(`API listening on ${port} using ${isSqlite ? 'SQLite' : 'Postgres'}`);
  });
  return server;
}

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export for testing
module.exports = { app, server, startServer };
