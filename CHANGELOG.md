# DMS - Document Management System

## Recent Updates & Improvements (v2.0)

### 🔒 Security Enhancements

#### 1. **Strong JWT Secret**
- Changed JWT secret from weak `'change-me'` to cryptographically secure random 64-character hex string
- Location: `server/.env`

#### 2. **Database-Backed Authentication**
- Moved from hardcoded user arrays to database-stored users
- Passwords are now properly hashed using bcrypt (10 rounds)
- New `users` table with columns: id, username, password, role, section, isActive, createdAt, updatedAt
- Automatic user seeding on first startup

#### 3. **Input Validation & Sanitization**
- Added `validateInput()` middleware for request validation
- Added `sanitizeInput()` function to trim and clean user inputs
- Prevents SQL injection and XSS attacks

#### 4. **Date Validation Logic**
- Validates date formats (YYYY-MM-DD)
- Ensures logical date relationships:
  - Target date cannot be before date received
  - Date sent cannot be before date received
- Prevents invalid date entries

### ✨ New Features

#### 5. **Pagination Support**
- Backend infrastructure ready for pagination
- API returns pagination metadata: total records, page, limit, totalPages
- Currently returns first 1000 records (configurable via query params)

#### 6. **Enhanced Search**
- Search now covers multiple fields:
  - MC Control Number
  - Section Control Number
  - Subject Text
  - From Value
  - Received By
  - Concerned Units
  - Action Taken

#### 7. **File Removal Feature**
- New "Remove File" button in edit modal
- Confirms before deletion
- Removes file from filesystem and database reference
- API endpoint: `DELETE /records/:id/file`

#### 8. **Error Boundaries**
- React error boundary wraps entire app
- Prevents white screen crashes
- Shows user-friendly error message with refresh option
- Displays error details for debugging

#### 9. **Filter Persistence**
- All filters now persist across page refreshes
- Uses localStorage to save:
  - Search query
  - Section filter
  - Action filter
  - Month/Year filters
  - Date range filters

### 🐛 Bug Fixes

#### 10. **Date Sorting**
- Fixed table sorting to show earliest dates first (ascending order)
- Changed from `ORDER BY id DESC` to `ORDER BY dateReceived ASC`

### 📊 API Changes

#### New Endpoints

```
GET /users/list
- Public endpoint for login dropdown
- Returns list of available users (without sensitive data)

DELETE /records/:id/file
- Removes uploaded file from a record
- Requires authentication
- Respects section-level permissions
```

#### Modified Endpoints

```
POST /auth/login
- Now uses database authentication
- Includes input validation
- Returns proper error messages

GET /records
- Added pagination support (?page=1&limit=1000)
- Returns pagination metadata

POST /records
- Added input sanitization
- Added date validation
- Better error messages

PUT /records/:id
- Added input sanitization
- Added date validation
- Better error messages
```

### 🗄️ Database Changes

#### New Table: `users`

```sql
CREATE TABLE users (
  id INTEGER/SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,          -- bcrypt hashed
  role TEXT NOT NULL,              -- 'MC' or 'SECTION'
  section TEXT,                    -- INVES, INTEL, ADM, OPN
  isActive INTEGER/BOOLEAN DEFAULT 1/TRUE,
  createdAt TEXT,
  updatedAt TEXT
);
```

### 📁 New Files

- `server/lib/seedUsers.js` - User seeding utility
- `src/ErrorBoundary.js` - React error boundary component

### 🔄 Migration Steps

1. **Backup your current database** before updating

2. **Update environment variables:**
   ```bash
   cd server
   # The JWT_SECRET has been auto-generated in .env
   ```

3. **Start the server** (users will be seeded automatically):
   ```bash
   cd server
   npm start
   ```

4. **Start the frontend:**
   ```bash
   cd ..
   npm start
   ```

5. **Default login credentials remain the same:**
   - Username: Any user from the dropdown
   - Password: `password`
   
   ⚠️ **IMPORTANT**: Change default passwords in production!

### 🚀 Performance Improvements

- Input sanitization reduces payload size
- Pagination infrastructure ready for large datasets
- LocalStorage reduces unnecessary filter resets

### 🔐 Security Recommendations

1. **Change all user passwords immediately after deployment**
2. **Use environment-specific JWT secrets**
3. **Enable HTTPS in production**
4. **Implement rate limiting on login endpoint**
5. **Add CORS whitelist for production domains**
6. **Regular database backups**
7. **Monitor file upload sizes and types**

### 📝 Breaking Changes

⚠️ **Database schema updated** - new `users` table required
⚠️ **Login now uses database** - hardcoded users removed from code

### 🧪 Testing Checklist

- [ ] Login with all user types
- [ ] Create new record
- [ ] Edit existing record
- [ ] Upload file to record
- [ ] Remove file from record
- [ ] Delete record
- [ ] Test all filters
- [ ] Test search functionality
- [ ] Test date validation errors
- [ ] Verify filters persist after refresh
- [ ] Test error boundary (trigger error)
- [ ] Export PDF
- [ ] Export Excel
- [ ] Test pagination (with many records)

### 📞 Support

For issues or questions:
- Check error logs in browser console (F12)
- Check server logs in terminal
- Verify database file exists at `server/data/dms.sqlite`

### 🎯 Future Enhancements (Suggested)

- [ ] Password change functionality
- [ ] User management UI (add/edit/disable users)
- [ ] Email notifications for approaching deadlines
- [ ] Audit trail / change history
- [ ] Bulk operations
- [ ] Advanced reporting
- [ ] Mobile-responsive design improvements
- [ ] Dark mode theme
- [ ] Export to multiple formats
- [ ] Automated backups

---

**Version:** 2.0  
**Updated:** February 18, 2026  
**Database:** SQLite / PostgreSQL  
**Framework:** React + Node.js + Express
