# Database Migration & Deployment Checklist

## 🔄 Automatic Migration

The database will **automatically migrate** when you start the server. No manual intervention needed!

### What Happens Automatically:

#### 1. New Columns Added:
```sql
-- If not exists:
ALTER TABLE records ADD COLUMN status TEXT DEFAULT 'Pending';
ALTER TABLE records ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}';
```

#### 2. New Table Created:
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recordId INTEGER,
  action TEXT NOT NULL,
  fieldName TEXT,
  oldValue TEXT,
  newValue TEXT,
  performedBy TEXT NOT NULL,
  performedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT
);
```

#### 3. New Indexes Created:
```sql
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_mcCtrlNo ON records(mcCtrlNo);
CREATE INDEX IF NOT EXISTS idx_records_targetDate ON records(targetDate);
CREATE INDEX IF NOT EXISTS idx_audit_logs_recordId ON audit_logs(recordId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performedBy ON audit_logs(performedBy);
```

---

## 📋 Pre-Deployment Checklist

### Before Starting the Server:

- [ ] **Backup your database** (copy `server/data/dms.sqlite`)
- [ ] Verify Node.js version (16+ recommended)
- [ ] Install any missing dependencies:
  ```bash
  cd server
  npm install
  
  cd ..
  npm install
  ```

### Server Dependencies to Verify:
- [ ] express
- [ ] socket.io
- [ ] jsonwebtoken
- [ ] bcryptjs
- [ ] multer
- [ ] exceljs *(newly used)*
- [ ] sqlite3 OR pg (depending on DB_MODE)

---

## 🚀 Starting the Enhanced System

### Step 1: Start the Server
```bash
cd DMS-Transfer
node server/index.js
```

**Expected Output:**
```
🔄 Initializing database...
✅ Database initialized successfully
🚀 Server listening on port 5000
🔌 Socket.IO ready for real-time updates
```

### Step 2: Watch for Migration Messages
The console should show:
```
Creating missing columns...
Creating audit_logs table...
Creating indexes...
Migration complete
```

### Step 3: Start the Frontend (if using dev server)
```bash
npm start
```

---

## ✅ Post-Deployment Verification

### 1. Check Database Schema
**SQLite:**
```bash
sqlite3 server/data/dms.sqlite
.schema records
.schema audit_logs
```

**Expected:**
- `records` table has `status` column
- `audit_logs` table exists
- Indexes are created

### 2. Test Server Endpoints

**Dashboard Summary:**
```bash
curl http://localhost:5000/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Audit Logs:**
```bash
curl http://localhost:5000/audit-logs?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Verify Frontend Features
- [ ] Dashboard summary bar displays
- [ ] Status column appears in table
- [ ] Status badges are color-coded
- [ ] Filter dropdown includes "All Status"
- [ ] Export buttons (PDF/CSV/Excel) work
- [ ] "View History" button appears in edit modal

---

## 🔧 Troubleshooting

### Issue: Server won't start

**Possible causes:**
1. Port 5000 already in use
2. Database file locked
3. Missing dependencies

**Solutions:**
```bash
# Check if port is in use (Windows)
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <process_id> /F

# Reinstall dependencies
npm install
```

---

### Issue: Database columns not added

**Check:**
```javascript
// In server console, look for errors like:
"duplicate column name: status"  ← This is OK! Column already exists
```

**Fix:**
- The migration is designed to handle this
- Try/catch blocks prevent errors on existing columns
- If database is corrupted, restore from backup and retry

---

### Issue: Audit logs not appearing

**Verify:**
1. Check if `audit_logs` table exists
2. Try creating a new record
3. Check server console for errors
4. Verify `/records/:id/audit-logs` endpoint works

**Debug:**
```bash
# Check audit_logs table
sqlite3 server/data/dms.sqlite
SELECT * FROM audit_logs LIMIT 5;
```

---

### Issue: Status not calculating

**Check:**
1. Browser console for JavaScript errors
2. Network tab for failed API requests
3. Records returned from `/records` endpoint include `status` field

**Fix:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check if `calculateStatus` function exists in both client and server

---

### Issue: Export fails

**Verify ExcelJS:**
```bash
npm list exceljs
```

**If not installed:**
```bash
cd server
npm install exceljs
```

---

## 📊 Database Backup Strategy

### Before Migration:
```bash
# Backup current database
copy server\data\dms.sqlite server\data\dms.sqlite.backup
```

### After Successful Migration:
```bash
# Create timestamped backup
copy server\data\dms.sqlite server\data\dms_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sqlite
```

### Restore from Backup (if needed):
```bash
# Stop server first!
copy server\data\dms.sqlite.backup server\data\dms.sqlite
# Restart server
```

---

## 🎯 Success Indicators

Your migration is successful if:

1. ✅ Server starts without errors
2. ✅ Database schema updated (status, audit_logs)
3. ✅ Indexes created successfully
4. ✅ Frontend loads without console errors
5. ✅ Dashboard summary displays data
6. ✅ Status badges appear in table
7. ✅ Audit trail records actions
8. ✅ All exports work (PDF/CSV/Excel)
9. ✅ Existing features still work
10. ✅ Real-time updates functional

---

## 📝 Rollback Plan (Emergency)

If something goes wrong:

### Quick Rollback:
```bash
# 1. Stop the server (Ctrl+C)

# 2. Restore database backup
copy server\data\dms.sqlite.backup server\data\dms.sqlite

# 3. Restore previous code (if using git)
git checkout HEAD~1

# 4. Restart server with old code
node server/index.js
```

### Gradual Rollback:
- Keep backup files for at least 7 days
- Monitor for 24 hours after deployment
- Document any issues encountered

---

## 🔒 Security Post-Migration

### Verify:
- [ ] Audit logs capturing all actions
- [ ] IP addresses being logged
- [ ] User permissions enforced
- [ ] Role-based access working
- [ ] JWT tokens still valid

### Test Security:
1. Try accessing records from another section (should fail)
2. Try viewing audit logs as non-admin (should fail)
3. Verify SQL injection protection still works
4. Test file upload restrictions

---

## 📈 Performance Monitoring

### After Migration:
- [ ] Query response times acceptable
- [ ] Dashboard loads < 2 seconds
- [ ] Table filtering instant
- [ ] Export completes < 5 seconds
- [ ] Audit log queries fast

### If Performance Issues:
```sql
-- Verify indexes exist
.indexes records
.indexes audit_logs

-- Check index usage
EXPLAIN QUERY PLAN 
SELECT * FROM records WHERE status = 'Overdue';
```

---

## 📞 Support Contacts

### If You Need Help:
1. Check server logs for errors
2. Check browser console
3. Review this checklist
4. Test with backup database
5. Restore from backup if needed

---

## 🎉 Final Steps

After successful deployment:

1. ✅ Test all features from TESTING_NEW_FEATURES.md
2. ✅ Notify users of new features
3. ✅ Schedule database backup routine
4. ✅ Monitor audit logs weekly
5. ✅ Review dashboard metrics daily
6. ✅ Document any custom configurations
7. ✅ Plan user training if needed

---

## 📚 Documentation

Created documents:
- `DMS_ENHANCEMENTS_SUMMARY.md` - Complete feature overview
- `TESTING_NEW_FEATURES.md` - Testing guide
- `DEPLOYMENT_CHECKLIST.md` - This file

Keep these for reference and onboarding new users!

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Database Backup Location:** _________________  
**Rollback Tested:** [ ] Yes [ ] No

---

**Status: Ready for Production** ✅
