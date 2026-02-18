# System Improvements Needed

## Priority 1: CRITICAL (Implement Immediately)

### 1. Add Global Error Handler for Async Routes
```javascript
// server/index.js - Add this middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Then wrap all async routes:
app.post('/records', authMiddleware, asyncHandler(async (req, res) => {
  // ... existing code
}));

// Add global error handler at the end
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});
```

### 2. Fix CORS Configuration
```javascript
// server/index.js
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

Add to `.env`:
```
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 3. Add Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
// server/index.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/auth/login', loginLimiter, validateInput(...), async (req, res) => {
  // ...
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', apiLimiter);
```

### 4. Add Database Indexes
```javascript
// server/lib/db.js - Add to initDb()
await runSqlite(`CREATE INDEX IF NOT EXISTS idx_records_section ON records(section);`);
await runSqlite(`CREATE INDEX IF NOT EXISTS idx_records_dateReceived ON records(dateReceived);`);
await runSqlite(`CREATE INDEX IF NOT EXISTS idx_records_createdBy ON records(createdBy);`);
await runSqlite(`CREATE INDEX IF NOT EXISTS idx_counters_scope_section ON counters(scope, section);`);
```

### 5. Fix ErrorBoundary State Mutation
```javascript
// src/ErrorBoundary.js
componentDidCatch(error, errorInfo) {
  console.error('Error caught by boundary:', error, errorInfo);
  this.setState({ hasError: true, error, errorInfo }); // Use setState
}
```

## Priority 2: HIGH (Implement This Week)

### 6. Add Request Logging
```bash
npm install morgan
```

```javascript
// server/index.js
const morgan = require('morgan');

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
```

### 7. Add Environment Variable Validation
```bash
npm install dotenv-safe
```

Create `.env.example`:
```
PORT=5000
JWT_SECRET=your_secret_here
DB_MODE=sqlite
SQLITE_PATH=./data/dms.sqlite
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
```

### 8. Fetch Users from API
```javascript
// src/App.js - Add useEffect to fetch users
const [users, setUsers] = useState(USERS); // Keep USERS as fallback

useEffect(() => {
  fetch(`${API_BASE}/users/list`)
    .then(res => res.json())
    .then(data => setUsers(data.users || USERS))
    .catch(() => console.warn('Using fallback users'));
}, []);
```

### 9. Consolidate localStorage useEffects
```javascript
// src/App.js - Replace 7 useEffects with one
useEffect(() => {
  const filters = {
    search, filterSection, filterAction,
    filterMonth, filterYear, dateFrom, dateTo
  };
  Object.entries(filters).forEach(([key, value]) => {
    localStorage.setItem(`dms_${key}`, value);
  });
}, [search, filterSection, filterAction, filterMonth, filterYear, dateFrom, dateTo]);
```

### 10. Add Graceful Shutdown
```javascript
// server/index.js - Replace initDb().then with:
let server;

initDb().then(async () => {
  await seedUsers();
  const port = Number(process.env.PORT || 5000);
  server = app.listen(port, () => {
    console.log(`API listening on ${port} using ${isSqlite ? 'SQLite' : 'Postgres'}`);
  });
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    if (isSqlite && sqliteDb) {
      sqliteDb.close(() => {
        console.log('Database closed');
        process.exit(0);
      });
    } else if (pgPool) {
      pgPool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}
```

### 11. Add Request Timeouts
```javascript
// src/App.js - Update apiFetch
const apiFetch = async (path, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const headers = { ...(options.headers || {}) };
    const isFormData = options.body instanceof FormData;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE}${path}`, { 
      ...options, 
      headers,
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
};
```

### 12. Add Database Transactions
```javascript
// server/index.js - Wrap record creation in transaction
app.post('/records', authMiddleware, asyncHandler(async (req, res) => {
  // Start transaction logic here
  // For SQLite, would need to use BEGIN/COMMIT
  // For now, add TODO comment
  
  const payload = sanitizeInput(req.body);
  // ... rest of code
}));
```

## Priority 3: MEDIUM (Implement This Month)

### 13. Add API Versioning
```javascript
// server/index.js
const apiV1 = express.Router();

// Move all routes to apiV1
apiV1.post('/auth/login', ...);
apiV1.get('/records', ...);
// etc.

app.use('/api/v1', apiV1);
```

Update frontend:
```javascript
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api/v1';
```

### 14. Add Input Length Validation
```javascript
// server/index.js - Update validateDates or create validateRecordInput
function validateRecordInput(payload) {
  const errors = [];
  
  if (payload.subjectText && payload.subjectText.length > 500) {
    errors.push('Subject text must be at most 500 characters');
  }
  
  if (payload.fromValue && payload.fromValue.length > 100) {
    errors.push('From field must be at most 100 characters');
  }
  
  if (payload.remarks && payload.remarks.length > 500) {
    errors.push('Remarks must be at most 500 characters');
  }
  
  return errors;
}
```

### 15. Split Large Components
```javascript
// Create new files:
// src/components/LoginForm.js
// src/components/RecordTable.js
// src/components/RecordForm.js
// src/components/EditModal.js
// src/hooks/useRecords.js
// src/hooks/useAuth.js
```

### 16. Add File Content Validation
```bash
npm install file-type
```

```javascript
// server/index.js
const FileType = require('file-type');

app.post('/records/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  // Validate file content
  const buffer = fs.readFileSync(req.file.path);
  const fileType = await FileType.fromBuffer(buffer);
  
  const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!fileType || !allowedMimes.includes(fileType.mime)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  // Continue with existing code...
});
```

### 17. Add Constants File
```javascript
// server/constants.js
module.exports = {
  JWT_EXPIRATION: '8h',
  BCRYPT_ROUNDS: 10,
  PAGINATION_DEFAULT_LIMIT: 1000,
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_FILE_TYPES: ['.pdf', '.docx'],
  DATE_FORMAT: 'YYYY-MM-DD',
  SECTIONS: ['INVES', 'INTEL', 'ADM', 'OPN']
};

// src/constants.js
export const SECTIONS = ['INVES', 'INTEL', 'ADM', 'OPN'];
export const SECTION_LABELS = {
  INVES: 'Investigation Section',
  INTEL: 'Intelligence Section',
  ADM: 'Admin Section',
  OPN: 'Operation Section',
};
// ... etc
```

### 18. Remove Unused Code
```javascript
// src/App.js - Remove this function (lines 346-350)
const getNextCounter = (counter, dateReceived) => {
  // ... UNUSED
};
```

### 19. Standardize Error Responses
```javascript
// server/lib/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const errorResponse = (res, error) => {
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message
    });
  }
  
  // Programming or unknown error
  console.error('ERROR:', error);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  });
};

module.exports = { AppError, errorResponse };
```

### 20. Add Health Check Endpoint
```javascript
// server/index.js
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isSqlite ? 'sqlite' : 'postgres'
  });
});
```

## Priority 4: LOW (Nice to Have)

### 21. Add Database Connection Pooling Limits
```javascript
// server/lib/db.js - For PostgreSQL
pgPool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  max: 20, // maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 22. Add Helmet for Security Headers
```bash
npm install helmet
```

```javascript
// server/index.js
const helmet = require('helmet');
app.use(helmet());
```

### 23. Add Compression
```bash
npm install compression
```

```javascript
// server/index.js
const compression = require('compression');
app.use(compression());
```

### 24. Add Database Backup Utility
```javascript
// server/lib/backup.js
const path = require('path');
const fs = require('fs');

function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupDir = path.resolve(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const dbPath = path.resolve(__dirname, '../data/dms.sqlite');
  const backupPath = path.join(backupDir, `dms-${timestamp}.sqlite`);
  
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Database backed up to ${backupPath}`);
  
  // Clean up old backups (keep last 7 days)
  const files = fs.readdirSync(backupDir);
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    if (stats.mtime.getTime() < sevenDaysAgo) {
      fs.unlinkSync(filePath);
    }
  });
}

module.exports = { backupDatabase };
```

### 25. Add Performance Monitoring
```bash
npm install prom-client
```

```javascript
// server/index.js
const promClient = require('prom-client');

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

## Summary

**Estimate to implement all Priority 1-2 items: 2-3 days**
**Estimate for Priority 3: 3-5 days**
**Estimate for Priority 4: 2-3 days**

**Total technical debt: ~8-11 days of work**

## Quick Wins (Can be done in 1 hour)

1. Fix ErrorBoundary state mutation
2. Add CORS configuration
3. Remove unused getNextCounter function
4. Add .env.example file
5. Add health check endpoint
6. Move magic numbers to constants
7. Consolidate localStorage useEffects

## Testing After Implementation

- [ ] Test rate limiting with multiple failed logins
- [ ] Test CORS with different origins
- [ ] Test error handling by disconnecting database
- [ ] Test graceful shutdown
- [ ] Test request timeout
- [ ] Test file upload validation
- [ ] Load test with many records (pagination)
- [ ] Test database indexes improve query speed
