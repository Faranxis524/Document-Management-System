# PostgreSQL Setup Guide

This guide will help you set up PostgreSQL for collaborative multi-user access to the DMS application.

## Why PostgreSQL?

SQLite only allows **one write operation at a time**, causing locks when multiple users try to create/edit records simultaneously. PostgreSQL supports **true concurrent access** with multiple users reading and writing at the same time.

## Installation Steps

### 1. Download PostgreSQL

Visit: https://www.postgresql.org/download/windows/

- Download the Windows installer (recommended version: PostgreSQL 15 or later)
- File size: ~250-300 MB
- **Cost: FREE**

### 2. Install PostgreSQL

1. Run the installer
2. Choose installation directory (default: `C:\Program Files\PostgreSQL\15`)
3. Select components:
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (GUI tool)
   - ✅ Command Line Tools
4. Set password for superuser `postgres` (remember this!)
5. Set port: **5432** (default)
6. Complete installation

### 3. Create Database

**Option A: Using pgAdmin (GUI)**

1. Open pgAdmin 4 from Start Menu
2. Connect to server (enter superuser password)
3. Right-click "Databases" → "Create" → "Database"
4. Database name: `dms`
5. Owner: `postgres`
6. Click "Save"

**Option B: Using Command Line**

```bash
psql -U postgres
CREATE DATABASE dms;
\q
```

### 4. Configure DMS Server

Create or update `server/.env` file:

```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dms

# Replace YOUR_PASSWORD with the password you set during installation
# Example: postgresql://postgres:mypassword123@localhost:5432/dms

# Other existing settings
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000
PORT=5000
```

### 5. Initialize Database Schema

The tables will be created automatically when you start the server:

```bash
cd server
npm start
```

The server will:
- Detect PostgreSQL connection
- Create tables: `records`, `counters`, `users`
- Seed default users
- Start listening on port 5000

### 6. Verify Connection

You should see:
```
API listening on 5000 using Postgres
```

If you see `using SQLite`, check your `.env` file.

## Migration from SQLite

### Option 1: Manual Migration (Recommended for small datasets)

1. Export data from SQLite using existing UI
2. Start fresh with PostgreSQL
3. Re-import records manually

### Option 2: Automated Migration Script

Create `server/scripts/migrateToPostgres.js`:

```javascript
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const sqliteDb = new sqlite3.Database('./data/dms.sqlite');
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  console.log('Starting migration from SQLite to PostgreSQL...');
  
  // Get all records from SQLite
  const records = await new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM records', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  console.log(`Found ${records.length} records to migrate`);
  
  // Insert into PostgreSQL
  for (const record of records) {
    await pgPool.query(
      `INSERT INTO records (
        id, mcCtrlNo, sectionCtrlNo, section, dateReceived,
        subjectText, subjectFile, fromValue, fromType, targetDateMode,
        targetDate, receivedBy, actionTaken, remarks, concernedUnits,
        dateSent, encodedBy, createdAt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        record.id, record.mcCtrlNo, record.sectionCtrlNo, record.section,
        record.dateReceived, record.subjectText, record.subjectFile,
        record.fromValue, record.fromType, record.targetDateMode,
        record.targetDate, record.receivedBy, record.actionTaken,
        record.remarks, record.concernedUnits, record.dateSent,
        record.encodedBy, record.createdAt
      ]
    );
  }
  
  console.log('✅ Migration complete!');
  await pgPool.end();
  sqliteDb.close();
}

migrate().catch(console.error);
```

Run migration:
```bash
node server/scripts/migrateToPostgres.js
```

## Testing Real-Time Features

### Test Scenario 1: Multiple Windows

1. Open browser window 1: `http://localhost:3000`
2. Open browser window 2 (incognito): `http://localhost:3000`
3. Login as different users in each window
4. Create a record in window 1
5. ✅ Watch it appear instantly in window 2!

### Test Scenario 2: Update Detection

1. Window 1: Edit a record
2. Window 2: See the record update in real-time
3. Console shows: `✏️ Record updated: RFU4A-MC-...`

### Test Scenario 3: Delete Sync

1. Window 1: Delete a record
2. Window 2: Record disappears immediately
3. Console shows: `🗑️ Record deleted: 123`

## Troubleshooting

### Connection Refused

**Error:** `ECONNREFUSED ::1:5432`

**Solution:**
1. Check PostgreSQL is running: Search "Services" → Find "postgresql-x64-15"
2. Start service if stopped
3. Verify port 5432 in PostgreSQL config

### Authentication Failed

**Error:** `password authentication failed for user "postgres"`

**Solution:**
1. Reset password using pgAdmin
2. Or reinstall PostgreSQL
3. Update `.env` with correct password

### Tables Not Created

**Error:** `relation "records" does not exist`

**Solution:**
1. Check `DATABASE_URL` format in `.env`
2. Restart server: `npm start`
3. Tables auto-create on first connection

### Port Already in Use

**Error:** `Port 5432 is already in use`

**Solution:**
1. Check other PostgreSQL instances
2. Change port in both PostgreSQL config and `.env`

## Network/LAN Access (Optional)

To allow other computers on your network to access the system:

### 1. Configure PostgreSQL for Network Access

Edit `postgresql.conf`:
```conf
listen_addresses = '*'  # Accept connections from any IP
```

Edit `pg_hba.conf`, add:
```conf
host    dms    postgres    192.168.1.0/24    md5
```

Restart PostgreSQL service.

### 2. Update Server Configuration

In `server/.env`:
```env
DATABASE_URL=postgresql://postgres:password@YOUR_IP:5432/dms
ALLOWED_ORIGINS=http://192.168.1.100:3000,http://192.168.1.101:3000
```

### 3. Start React Dev Server with Network Access

```bash
# Frontend
set HOST=0.0.0.0
npm start

# Or use your IP
set REACT_APP_API_BASE=http://192.168.1.100:5000
npm start
```

**Security Note:** For production, use proper firewall rules and SSL/TLS certificates.

## Cost Breakdown

| Component | Cost |
|-----------|------|
| PostgreSQL | FREE |
| Socket.IO | FREE |
| Local Network Hosting | FREE |
| **Total** | **$0** |

Only pay for cloud hosting if you need internet access from outside your network.

## Performance Benchmarks

| Metric | SQLite | PostgreSQL |
|--------|---------|------------|
| Concurrent Writes | 1 (locked) | 100+ |
| Concurrent Reads | Unlimited | Unlimited |
| Write Speed | Fast | Very Fast |
| Network Support | No | Yes |
| Multi-User | ❌ Limited | ✅ Excellent |

## Next Steps

Once PostgreSQL is running:

1. ✅ Multiple users can work simultaneously
2. ✅ Real-time updates appear instantly
3. ✅ No more "database is locked" errors
4. ✅ Better performance under load

## Support

If you encounter issues:
1. Check server console for errors
2. Check browser console (F12) for Socket.IO logs
3. Verify PostgreSQL service is running
4. Confirm `.env` settings are correct

---

**Ready to switch?** Just start PostgreSQL, update `.env`, and restart your server! 🚀
