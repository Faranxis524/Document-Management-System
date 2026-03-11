const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { Server } = require('socket.io');
require('dotenv').config();

const { db, initDb, isSqlite } = require('./lib/db');
const { seedUsers } = require('./lib/seedUsers');

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,   // disable — requires HTTPS on non-localhost
  strictTransportSecurity: false,   // disable HSTS — app runs on plain HTTP
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      // upgrade-insecure-requests intentionally omitted — app runs on HTTP
    },
  },
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Silence Chrome DevTools auto-probe (harmless browser request)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));

// Async Error Handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.LOGIN_RATE_LIMIT || 10), // env-overridable; set LOGIN_RATE_LIMIT=50 in .env for testing
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.API_RATE_LIMIT || 500), // env-overridable; generous default for single-office use
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply API rate limiter globally — skip the login endpoint (has its own stricter limiter)
app.use((req, res, next) => {
  if (req.path === '/auth/login') return next();
  return apiLimiter(req, res, next);
});

const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Convert D-Mon-YY / DD-Mon-YY / DD-Mon-YYYY → YYYY-MM-DD; leaves ISO dates and blanks untouched
const MONTH_NUM = {
  jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12',
};
function normalizeDate(value) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value;
  const m = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!m) return value;
  const day  = m[1].padStart(2, '0');
  const mon  = MONTH_NUM[m[2].toLowerCase()];
  if (!mon) return value;
  const rawY = parseInt(m[3], 10);
  const year = rawY < 100 ? 2000 + rawY : rawY;
  return `${year}-${mon}-${day}`;
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

// Safety guard: refuse to start with the default insecure secret in production
if (process.env.NODE_ENV === 'production' && jwtSecret === 'change-me') {
  console.error('FATAL: JWT_SECRET is not set. Set a strong secret in your .env file before running in production.');
  process.exit(1);
}
if (jwtSecret === 'change-me') {
  console.warn('WARNING: JWT_SECRET is using the default insecure value. Set JWT_SECRET in your .env file.');
}

const DEFAULT_FROM = {
  INVES: 'IND',
  OPN: 'OMD',
  INTEL: 'ID',
  ADM: 'ARMD',
  'OPN/PCR': 'PCRS',
};

const DEFAULT_RECEIVED_BY = {
  INVES: ['NUP Tala'],
  OPN: ['NUP Aldrin', 'PCPL Bueno', 'PAT Duyag'],
  INTEL: ['NUP Joyce', 'PCPL Jose'],
  ADM: ['NUP San Pedro', 'PMSG Foncardas'],
  'OPN/PCR': [],
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
    req.user.sections = parseSections(req.user.section);
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

/** Block VIEWER role from any write operation */
function denyViewer(req, res, next) {
  if (req.user?.role === 'VIEWER') {
    return res.status(403).json({ error: 'Viewers cannot modify records' });
  }
  return next();
}

// Parse the section field from the DB/JWT — may be a plain string or a JSON array string
function parseSections(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const t = String(value).trim();
  if (t.startsWith('[')) {
    try { return JSON.parse(t); } catch { return [t]; }
  }
  return t ? [t] : [];
}

// Serialize sections: single section stays as plain string; multiple become JSON array
function serializeSections(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.length === 1 ? arr[0] : JSON.stringify(arr);
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
  
  // Non-date strings (e.g. 'daily', 'N/A', 'after 3 days') are allowed as text descriptions — no validation needed
  
  // Non-date strings for dateSent (e.g. 'weekly', 'N/A') are allowed as text descriptions — no validation needed
  
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
  // If "Others" is selected, store only the raw custom text (no "sent through" prefix)
  if (payload.remarksCustom && payload.remarksCustomText && String(payload.remarksCustomText).trim()) {
    return String(payload.remarksCustomText).trim();
  }

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

// ── Field-length validation ──────────────────────────────────────────────────
const FIELD_MAX_LENGTHS = {
  subjectText: 500,
  fromValue: 100,
  receivedBy: 100,
  concernedUnits: 200,
  actionTaken: 50,
};

function validateFieldLengths(payload) {
  const errors = [];
  for (const [field, max] of Object.entries(FIELD_MAX_LENGTHS)) {
    const val = payload[field];
    if (val && typeof val === 'string' && val.length > max) {
      errors.push(`${field} must be at most ${max} characters`);
    }
  }
  return errors;
}

// Section control number keeps the legacy date format: YYMMDD
function formatSectionCtrlNo(prefix, section, dateStr, seq) {
  const date = dateStr.replace(/-/g, '').slice(2); // YYMMDD
  const padded = String(seq).padStart(2, '0');
  const suffix = section ? `-${section}` : '-MC';
  return `${prefix}${suffix}-${date}-${padded}`;
}

// MC control number uses the requested format: RFU4A-MC-YYYY-MMDD-NN
function formatMcCtrlNo(prefix, dateStr, seq) {
  const [yyyy, mm, dd] = String(dateStr || '').split('-');
  const date = yyyy && mm && dd ? `${yyyy}-${mm}${dd}` : String(dateStr || '');
  const padded = String(seq).padStart(2, '0');
  return `${prefix}-MC-${date}-${padded}`;
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

// Refresh token — issues a new 8-hour token if the existing one is still valid
app.post('/auth/refresh', authMiddleware, (req, res) => {
  const freshToken = signToken({
    username: req.user.username,
    role: req.user.role,
    section: req.user.section,
  });
  res.json({ token: freshToken });
});

app.get('/users/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/sections', (_req, res) => {
  res.json({ sections: ['INVES', 'INTEL', 'ADM', 'OPN', 'OPN/PCR'] });
});

async function getNextControlNumbers(section, dateReceived, preview = false) {
  const getCounter = preview ? db.getNextCounterPreview : db.getNextCounter;
  const mcSeq = await getCounter({ scope: 'MC', section: null, dateReceived });
  const sectionSeq = await getCounter({ scope: 'SECTION', section, dateReceived });
  const mcCtrlNo = formatMcCtrlNo('RFU4A', dateReceived, mcSeq);
  const sectionCtrlNo = formatSectionCtrlNo('RFU4A', section, dateReceived, sectionSeq);
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
  if (req.user.role === 'SECTION' && !req.user.sections.includes(section)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const result = await getNextControlNumbers(section, dateReceived, true);
  res.json(result);
});

app.post('/records', authMiddleware, denyViewer, async (req, res) => {
  const payload = sanitizeInput(req.body);
  
  if (req.user.role === 'SECTION' && !req.user.sections.includes(payload.section)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  if (!payload.section || !payload.dateReceived) {
    return res.status(400).json({ error: 'Section and date received are required' });
  }

  const lengthErrors = validateFieldLengths(payload);
  if (lengthErrors.length > 0) {
    return res.status(400).json({ error: lengthErrors.join('. ') });
  }

  const dateErrors = validateDates(payload);
  if (dateErrors.length > 0) {
    return res.status(400).json({ error: dateErrors.join('. ') });
  }
  
  const { mcCtrlNo, sectionCtrlNo } = await getNextControlNumbers(payload.section, payload.dateReceived, false);
  const remarksText = normalizeRemarks(payload);
  
  // Calculate initial status
  const initialStatus = db.calculateStatus({ ...payload, dateSent: payload.dateSent });
  
  const record = await db.createRecord({ 
    ...payload, 
    mcCtrlNo, 
    sectionCtrlNo, 
    remarks: remarksText,
    status: initialStatus
  });
  
  // Create audit log for record creation
  await db.createAuditLog({
    recordId: record.id,
    action: 'CREATE',
    fieldName: null,
    oldValue: null,
    newValue: JSON.stringify(record),
    section: record.section,
    sectionCtrlNo: record.sectionCtrlNo,
    mcCtrlNo: record.mcCtrlNo,
    performedBy: req.user.username,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  
  const recordWithRemarks = { ...record, remarksText };
  
  // Emit real-time event (includes creator username so clients can ignore their own actions)
  if (io) {
    io.emit('record_created', { ...recordWithRemarks, _actionBy: req.user.username });
  }
  
  res.json(recordWithRemarks);
});

app.get('/records', authMiddleware, async (req, res) => {
  const { section, page = '1', limit = '1000' } = req.query;
  const filters = {};
  if (req.user.role === 'SECTION') {
    const userSections = req.user.sections;
    if (userSections.length === 1) filters.section = userSections[0];
    else if (userSections.length > 1) filters.sections = userSections;
  } else if (section && section !== 'ALL') {
    filters.section = section;
  }
  const allRecords = await db.listRecords(filters);
  
  // Return all records without pagination limit
  res.json({
    records: allRecords.map((row) => ({
      ...row,
      remarksText: coerceRemarksText(row.remarks)
    })),
    pagination: {
      total: allRecords.length,
      page: 1,
      limit: allRecords.length,
      totalPages: 1
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
  if (req.user.role === 'SECTION' && !req.user.sections.includes(section)) {
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

// Check for duplicate records before saving (same subject text within ±30 days)
app.get('/records/check-duplicate', authMiddleware, asyncHandler(async (req, res) => {
  const { subjectText, fromValue, dateReceived, section, excludeId } = req.query;

  if (!subjectText || !subjectText.trim()) {
    return res.json({ hasDuplicates: false, matches: [] });
  }

  // Section users can only check their own section(s)
  const resolvedSection = req.user.role === 'SECTION' ? (req.user.sections[0] || req.user.section) : (section || null);

  const matches = await db.findDuplicates({
    subjectText: subjectText.trim(),
    fromValue,
    dateReceived,
    section: resolvedSection,
    excludeId: excludeId ? Number(excludeId) : undefined,
  });

  return res.json({ hasDuplicates: matches.length > 0, matches });
}));

app.get('/records/:id', authMiddleware, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && !req.user.sections.includes(record.section)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(record);
});

app.put('/records/:id', authMiddleware, denyViewer, async (req, res) => {
  try {
    const record = await db.getRecord(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'SECTION' && !req.user.sections.includes(record.section)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const payload = sanitizeInput(req.body);
    const lengthErrors = validateFieldLengths(payload);
    if (lengthErrors.length > 0) {
      return res.status(400).json({ error: lengthErrors.join('. ') });
    }
    const dateErrors = validateDates(payload);
    if (dateErrors.length > 0) {
      return res.status(400).json({ error: dateErrors.join('. ') });
    }
    
    const remarksText = normalizeRemarks(payload);
    
    // Calculate new status based on updates
    const newStatus = db.calculateStatus({ 
      ...record, 
      ...payload,
    });
    
    // Track field changes for audit log
    const fieldsToTrack = [
      'section', 'dateReceived', 'subjectText', 'fromValue', 'targetDate', 
      'receivedBy', 'actionTaken', 'remarks', 'concernedUnits', 'dateSent', 'status'
    ];
    
    const changes = [];
    fieldsToTrack.forEach(field => {
      let oldValue = record[field];
      let newValue = field === 'remarks' ? remarksText : 
                     field === 'status' ? newStatus : 
                     payload[field];
      
      if (newValue !== undefined && oldValue !== newValue) {
        changes.push({
          fieldName: field,
          oldValue: String(oldValue || ''),
          newValue: String(newValue || '')
        });
      }
    });
    
    const updated = await db.updateRecord(req.params.id, { 
      ...payload, 
      remarks: remarksText, 
      status: newStatus 
    });
    
    // Create audit logs for each changed field
    for (const change of changes) {
      await db.createAuditLog({
        recordId: record.id,
        action: 'UPDATE',
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        section: record.section,
        sectionCtrlNo: record.sectionCtrlNo,
        mcCtrlNo: record.mcCtrlNo,
        performedBy: req.user.username,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }
    
    const updatedWithRemarks = { ...updated, remarksText };
    
    // Emit real-time event (includes updater username so clients can ignore their own actions)
    if (io) {
      io.emit('record_updated', { ...updatedWithRemarks, _actionBy: req.user.username });
    }
    
    res.json(updatedWithRemarks);
  } catch (error) {
    // Handle version conflict specifically
    if (error.code === 'VERSION_CONFLICT') {
      return res.status(409).json({ 
        error: error.message,
        code: 'VERSION_CONFLICT',
        currentVersion: error.currentVersion,
        clientVersion: error.clientVersion
      });
    }
    // Re-throw other errors to be caught by global error handler
    throw error;
  }
});

app.delete('/records/:id', authMiddleware, denyViewer, asyncHandler(async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && !req.user.sections.includes(record.section)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Create audit log for deletion
  await db.createAuditLog({
    recordId: record.id,
    action: 'DELETE',
    fieldName: null,
    oldValue: JSON.stringify(record),
    newValue: null,
    section: record.section,
    sectionCtrlNo: record.sectionCtrlNo,
    mcCtrlNo: record.mcCtrlNo,
    performedBy: req.user.username,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  
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
    
    // Emit real-time event (includes deleter username so clients can ignore their own actions)
    if (io) {
      io.emit('record_deleted', { id: req.params.id, section, dateReceived, _actionBy: req.user.username });
    }
    
    return res.json({ 
      ok: true, 
      countersReset: resetResult,
      validation: validation.hasProblems ? validation : undefined
    });
  } catch (resetError) {
    console.error('Error resetting counters:', resetError);
    // 207 Multi-Status: the deletion succeeded but counter reset failed
    return res.status(207).json({
      ok: true,
      warning: 'Record deleted but counter reset failed',
      resetError: resetError.message,
    });
  }
}));

app.post('/records/:id/upload', authMiddleware, denyViewer, upload.single('file'), async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && !req.user.sections.includes(record.section)) {
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
    await fs.promises.rename(tempPath, finalPath);
  }
  const fileUrl = `/uploads/${monthFolder}/${sectionFolder}/${storedName}`;
  const updated = await db.updateRecordFile(req.params.id, { subjectFileUrl: fileUrl, updatedBy: req.user.username });
  res.json(updated);
});

app.get('/records/:id/file', authMiddleware, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && !req.user.sections.includes(record.section)) {
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

app.delete('/records/:id/file', authMiddleware, denyViewer, async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && !req.user.sections.includes(record.section)) {
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
  let recordFilter = {};
  if (req.user.role === 'SECTION') {
    const us = req.user.sections;
    if (us.length === 1) recordFilter = { section: us[0] };
    else if (us.length > 1) recordFilter = { sections: us };
  } else if (section) {
    recordFilter = { section };
  }
  const records = await db.listRecords(recordFilter);

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

// Get audit logs for a specific record
app.get('/records/:id/audit-logs', authMiddleware, asyncHandler(async (req, res) => {
  const record = await db.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'SECTION' && !req.user.sections.includes(record.section)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const logs = await db.getAuditLogsForRecord(req.params.id);
  res.json({ logs });
}));

// Get all audit logs — MC sees all; SECTION users see only their section(s)
app.get('/audit-logs', authMiddleware, asyncHandler(async (req, res) => {
  const { limit = '500', offset = '0' } = req.query;
  const logs = await db.getAllAuditLogs(parseInt(limit, 10), parseInt(offset, 10));
  if (req.user.role === 'SECTION') {
    const userSections = req.user.sections;
    return res.json({ logs: logs.filter(l => userSections.includes(l.section)) });
  }
  res.json({ logs });
}));

// Clear all audit logs (MC only)
app.post('/audit-logs/clear', authMiddleware, requireRole(['MC']), asyncHandler(async (req, res) => {
  const confirm = req.body?.confirm;
  if (confirm !== true) {
    return res.status(400).json({ error: 'Confirmation required. Send {"confirm": true}.' });
  }
  const result = await db.clearAuditLogs();
  res.json({ ok: true, ...result });
}));

// ── CSV Import ───────────────────────────────────────────────────────────────
// POST /import/csv  { csvContent: "<raw CSV text>", section: "INVES" }
// MC role only. Skips rows whose mcCtrlNo already exists.
app.post('/import/csv', authMiddleware, requireRole(['MC']), asyncHandler(async (req, res) => {
  const { csvContent, section } = req.body || {};
  if (!csvContent) return res.status(400).json({ error: 'csvContent is required' });
  if (!section)    return res.status(400).json({ error: 'section is required' });

  // Parse CSV helpers (same logic as import-inves.js)
  function parseCSVLine(line) {
    const result = []; let cur = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    result.push(cur.trim());
    return result;
  }

  const raw = csvContent.replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const sectionUpper = section.toUpperCase();

  // Collect rows matching the requested section
  const rows = lines
    .map(l => parseCSVLine(l))
    .filter(cols => cols.length > 2 && cols[2].trim().toUpperCase() === sectionUpper);

  // Get existing ctrl nos to skip duplicates
  const existing = await db.listRecords({ section });
  const existingSet = new Set(existing.map(r => r.mcCtrlNo).filter(Boolean));

  const inserted = []; const skipped = []; const errors = [];

  for (const cols of rows) {
    const mcCtrlNo       = cols[0]  || '';
    const sectionCtrlNo  = cols[1]  || '';
    const sec            = cols[2]  || section;
    const dateReceived   = normalizeDate(cols[3]  || '');
    const subjectText    = cols[4]  || '';
    const fromValue      = cols[5]  || '';
    const targetDate     = normalizeDate(cols[6]  || '');
    const receivedBy     = cols[7]  || '';
    const actionTaken    = cols[8]  || '';
    const remarks        = cols[9]  || '';
    const concernedUnits = cols[10] || '';
    const dateSent       = normalizeDate(cols[11] || '');

    if (!mcCtrlNo) { skipped.push(`(blank mcCtrlNo) ${subjectText.slice(0, 60)}`); continue; }
    if (existingSet.has(mcCtrlNo)) { skipped.push(`${mcCtrlNo} (already exists)`); continue; }

    try {
      const record = await db.createRecord({
        mcCtrlNo, sectionCtrlNo, section: sec,
        dateReceived, subjectText, subjectFileUrl: null,
        fromValue, fromType: 'USER',
        targetDate, targetDateMode: 'DATE',
        receivedBy, actionTaken,
        remarks, concernedUnits, dateSent,
        createdBy: req.user.username, updatedBy: req.user.username,
      });
      await db.createAuditLog({
        recordId: record.id, action: 'CREATE', fieldName: null,
        oldValue: null, newValue: JSON.stringify(record),
        section: record.section, sectionCtrlNo: record.sectionCtrlNo, mcCtrlNo: record.mcCtrlNo,
        performedBy: req.user.username, ipAddress: req.ip, userAgent: req.get('user-agent'),
      });
      existingSet.add(mcCtrlNo);
      inserted.push(mcCtrlNo);
    } catch (err) {
      errors.push(`${mcCtrlNo}: ${err.message}`);
    }
  }

  res.json({
    ok: true,
    total: rows.length,
    inserted: inserted.length,
    skipped: skipped.length,
    errors: errors.length,
    insertedList: inserted,
    skippedList: skipped,
    errorList: errors,
  });
}));

// Export to CSV
app.post('/export/csv', authMiddleware, asyncHandler(async (req, res) => {
  const { section } = req.body;
  let recordFilter = {};
  if (req.user.role === 'SECTION') {
    const us = req.user.sections;
    if (us.length === 1) recordFilter = { section: us[0] };
    else if (us.length > 1) recordFilter = { sections: us };
  } else if (section) {
    recordFilter = { section };
  }
  const records = await db.listRecords(recordFilter);

  const headers = [
    'MC Ctrl No.', 'Section Ctrl No.', 'Section', 'Date Received', 'Subject',
    'From', 'Target Date', 'Received By', 'Action Taken', 'Remarks',
    'Concerned Units', 'Date Sent'
  ];

  const csvRows = [];
  csvRows.push(headers.join(','));

  records.forEach((row) => {
    const values = [
      row.mcCtrlNo || '',
      row.sectionCtrlNo || '',
      row.section || '',
      row.dateReceived || '',
      `"${(row.subjectText || '').replace(/"/g, '""')}"`,
      row.fromValue || '',
      row.targetDate || '',
      row.receivedBy || '',
      row.actionTaken || '',
      `"${(coerceRemarksText(row.remarks) || '').replace(/"/g, '""')}"`,
      row.concernedUnits || '',
      row.dateSent || '',
    ];
    csvRows.push(values.join(','));
  });

  const csvContent = csvRows.join('\n');
  res.setHeader('Content-Disposition', 'attachment; filename=records.csv');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csvContent);
}));

app.get('/config/defaults', authMiddleware, (_req, res) => {
  res.json({ from: DEFAULT_FROM, receivedBy: DEFAULT_RECEIVED_BY });
});

// ── User Management (MC-only CRUD) ────────────────────────────────────────────

// GET /users/list — for login dropdowns (authenticated, no passwords exposed)
app.get('/users/list', authMiddleware, asyncHandler(async (_req, res) => {
  const rows = await db.listUsers();
  const users = rows
    .filter((u) => u.isActive === 1 || u.isActive === true)
    .map((u) => ({
      id: u.id,
      label: u.section ? `${u.username} (${u.section})` : `${u.username} (${u.role})`,
      username: u.username,
      role: u.role,
      section: u.section || null,
    }));
  res.json({ users });
}));

// GET /users — full list for admin panel (MC only)
app.get('/users', authMiddleware, requireRole(['MC']), asyncHandler(async (_req, res) => {
  const users = await db.listUsers();
  res.json({ users });
}));

// POST /users — create new user (MC only)
app.post('/users', authMiddleware, requireRole(['MC']), asyncHandler(async (req, res) => {
  const { username, password, role, section } = sanitizeInput(req.body);
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, and role are required' });
  }
  if (!['MC', 'SECTION'].includes(role)) {
    return res.status(400).json({ error: 'role must be MC or SECTION' });
  }
  if (role === 'SECTION' && !section) {
    return res.status(400).json({ error: 'section is required for SECTION role' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  const existing = await db.getUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const created = await db.createUser({ username, password: hashed, role, section: section || null });
  res.status(201).json({
    user: { id: created.id, username: created.username, role: created.role, section: created.section, isActive: created.isActive },
  });
}));

// PUT /users/:id — update user fields (MC only)
app.put('/users/:id', authMiddleware, requireRole(['MC']), asyncHandler(async (req, res) => {
  const { password, role, section, isActive, username } = sanitizeInput(req.body);
  const target = await db.getUserById(Number(req.params.id));
  if (!target) return res.status(404).json({ error: 'User not found' });
  // Prevent self-deactivation
  if (target.username === req.user.username && (isActive === 0 || isActive === false)) {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }
  const fields = {};
  if (password !== undefined && password !== '') {
    if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
    fields.password = await bcrypt.hash(password, 10);
  }
  if (role !== undefined) fields.role = role;
  if (section !== undefined) fields.section = section || null;
  if (isActive !== undefined) fields.isActive = isActive;
  if (username !== undefined && username !== '') fields.username = username;

  const updated = await db.updateUser(Number(req.params.id), fields);
  res.json({
    user: { id: updated.id, username: updated.username, role: updated.role, section: updated.section, isActive: updated.isActive },
  });
}));

// DELETE /users/:id — permanently remove user (MC only)
app.delete('/users/:id', authMiddleware, requireRole(['MC']), asyncHandler(async (req, res) => {
  const target = await db.getUserById(Number(req.params.id));
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.username === req.user.username) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  await db.deleteUser(Number(req.params.id));
  res.json({ ok: true });
}));

// Serve uploaded files — authentication required to prevent unauthorised file access
app.use('/uploads', authMiddleware, express.static(uploadDir));

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
let io;

async function startServer() {
  await initDb();
  await seedUsers();
  const port = Number(process.env.PORT || 5000);
  const host = '0.0.0.0'; // Listen on all network interfaces
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5000'];
  const networkOrigin = allowedOrigins.find((origin) => !origin.includes('localhost')) || `http://localhost:${port}`;
  
  // Serve React build files in production (after all API routes)
  const buildPath = path.join(__dirname, '..', 'build');
  if (fs.existsSync(buildPath)) {
    app.use(
      express.static(buildPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
          }
        },
      })
    );

    // Send all non-API requests to React app
    // NOTE: Express 5 (path-to-regexp) does not accept the legacy "*" route.
    // Use a regex catch-all instead.
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith('/uploads/')) return next();
      if (req.path.startsWith('/auth/') || req.path.startsWith('/records') || req.path.startsWith('/users') || req.path.startsWith('/audit-logs') || req.path.startsWith('/control-numbers') || req.path.startsWith('/export') || req.path.startsWith('/config')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
  
  server = app.listen(port, host, () => {
    console.log(`API listening on ${host}:${port} using ${isSqlite ? 'SQLite' : 'Postgres'}`);
    console.log(`Local:   http://localhost:${port}`);
    console.log(`Network: ${networkOrigin}`);
  });
  
  // Initialize Socket.IO
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });
  
  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user.role})`);
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });
  
  return server;
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully…`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await db.closeDb();
        console.log('Database connection closed.');
      } catch (err) {
        console.error('Error closing database:', err);
      }
      process.exit(0);
    });
    // Force exit after 10 s if the server takes too long to drain
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export for testing
module.exports = { app, server, io, startServer };
