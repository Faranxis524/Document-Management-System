/**
 * Utility script to delete all records from the database
 * Usage: node scripts/deleteAllRecords.js
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const sqlitePath = path.resolve(__dirname, '..', process.env.SQLITE_PATH || './data/dms.sqlite');

if (!fs.existsSync(sqlitePath)) {
  console.error('❌ Database file not found:', sqlitePath);
  process.exit(1);
}

const db = new sqlite3.Database(sqlitePath);

console.log('📂 Connected to database:', sqlitePath);
console.log('');

// First, show current record count
db.get('SELECT COUNT(*) as count FROM records', (err, row) => {
  if (err) {
    console.error('❌ Error counting records:', err.message);
    db.close();
    process.exit(1);
  }

  console.log(`📊 Current records in database: ${row.count}`);
  console.log('');
  
  if (row.count === 0) {
    console.log('✅ No records to delete.');
  } else {
    console.log('⚠️  DELETING ALL RECORDS...');
    console.log('');

    // Delete all records
    db.run('DELETE FROM records', function(deleteErr) {
      if (deleteErr) {
        console.error('❌ Error deleting records:', deleteErr.message);
        db.close();
        process.exit(1);
      }

      console.log(`✅ Successfully deleted ${this.changes} record(s)`);
      console.log('');
    });
  }

  // Always reset counters to 0 for clean state
  setTimeout(() => {
    console.log('🔄 Resetting counters...');
    db.run('UPDATE counters SET currentNumber = 0', function(counterErr) {
      if (counterErr) {
        console.error('⚠️  Warning: Could not reset counters:', counterErr.message);
      } else {
        console.log(`✅ Reset ${this.changes} counter(s) to 0`);
      }

      console.log('');
      console.log('✨ Database cleanup complete!');
      console.log('');
      
      db.close((closeErr) => {
        if (closeErr) {
          console.error('❌ Error closing database:', closeErr.message);
        }
        process.exit(0);
      });
    });
  }, 100);
});
