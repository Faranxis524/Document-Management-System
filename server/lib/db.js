const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const isSqlite = (process.env.DB_MODE || 'sqlite') === 'sqlite';
const sqlitePath = path.resolve(__dirname, '..', process.env.SQLITE_PATH || './data/dms.sqlite');

let sqliteDb;
let pgPool;

function ensureDir() {
  const dir = path.dirname(sqlitePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function initDb() {
  if (isSqlite) {
    ensureDir();
    sqliteDb = new sqlite3.Database(sqlitePath);
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mcCtrlNo TEXT,
        sectionCtrlNo TEXT,
        section TEXT,
        dateReceived TEXT,
        subjectText TEXT,
        subjectFileUrl TEXT,
        fromValue TEXT,
        fromType TEXT,
        targetDate TEXT,
        targetDateMode TEXT,
        receivedBy TEXT,
        actionTaken TEXT,
        remarks TEXT,
        concernedUnits TEXT,
        dateSent TEXT,
        createdBy TEXT,
        updatedBy TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS counters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT,
        section TEXT,
        currentNumber INTEGER DEFAULT 0,
        lastDateUsed TEXT
      );
    `);
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        section TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);
    
    // Create indexes for better query performance
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_records_section ON records(section);`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_records_dateReceived ON records(dateReceived);`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_records_createdBy ON records(createdBy);`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_records_actionTaken ON records(actionTaken);`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_counters_scope_section ON counters(scope, section);`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
  } else {
    pgPool = new Pool({
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
    });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        mcCtrlNo TEXT,
        sectionCtrlNo TEXT,
        section TEXT,
        dateReceived TEXT,
        subjectText TEXT,
        subjectFileUrl TEXT,
        fromValue TEXT,
        fromType TEXT,
        targetDate TEXT,
        targetDateMode TEXT,
        receivedBy TEXT,
        actionTaken TEXT,
        remarks TEXT,
        concernedUnits TEXT,
        dateSent TEXT,
        createdBy TEXT,
        updatedBy TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS counters (
        id SERIAL PRIMARY KEY,
        scope TEXT,
        section TEXT,
        currentNumber INTEGER DEFAULT 0,
        lastDateUsed TEXT
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        section TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);
    
    // Create indexes for better query performance
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_records_section ON records(section);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_records_dateReceived ON records(dateReceived);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_records_createdBy ON records(createdBy);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_records_actionTaken ON records(actionTaken);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_counters_scope_section ON counters(scope, section);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
  }
}

function runSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function peekNextCounter(existing, dateReceived) {
  if (!existing) return 1;
  const lastUsed = isSqlite ? existing.lastDateUsed : existing.lastdateused;
  const current = isSqlite ? existing.currentNumber : existing.currentnumber;
  const dateChanged = dateReceived && lastUsed !== dateReceived;
  const base = dateChanged ? 0 : (current || 0);
  return base + 1;
}

async function getNextCounterPreview({ scope, section, dateReceived }) {
  if (isSqlite) {
    const existing = await getSqlite('SELECT * FROM counters WHERE scope = ? AND section IS ?;', [scope, section]);
    return peekNextCounter(existing, dateReceived);
  }
  const result = await pgPool.query('SELECT * FROM counters WHERE scope = $1 AND section IS NOT DISTINCT FROM $2 LIMIT 1;', [
    scope,
    section,
  ]);
  return peekNextCounter(result.rows[0], dateReceived);
}

async function getNextCounter({ scope, section, dateReceived }) {
  if (isSqlite) {
    const existing = await getSqlite('SELECT * FROM counters WHERE scope = ? AND section IS ?;', [scope, section]);
    const dateChanged = dateReceived && existing && existing.lastDateUsed !== dateReceived;
    
    // Verify counter accuracy by checking actual records
    if (existing && !dateChanged && section && dateReceived) {
      const records = await allSqlite(
        'SELECT mcCtrlNo, sectionCtrlNo FROM records WHERE section = ? AND dateReceived = ?;',
        [section, dateReceived]
      );
      
      // Find the highest actual sequence number
      let highestActual = 0;
      records.forEach(record => {
        const ctrlNo = scope === 'MC' ? record.mcCtrlNo : record.sectionCtrlNo;
        if (ctrlNo) {
          const match = ctrlNo.match(/-(\d+)$/);
          if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > highestActual) highestActual = seq;
          }
        }
      });
      
      // If counter is higher than actual records, reset it
      if (existing.currentNumber > highestActual) {
        await runSqlite('UPDATE counters SET currentNumber = ? WHERE id = ?;', [highestActual, existing.id]);
        return highestActual + 1;
      }
    }
    
    if (!existing) {
      await runSqlite('INSERT INTO counters (scope, section, currentNumber, lastDateUsed) VALUES (?, ?, 1, ?);', [
        scope,
        section,
        dateReceived || null,
      ]);
      return 1;
    }
    const baseNumber = dateChanged ? 0 : existing.currentNumber || 0;
    const next = baseNumber + 1;
    await runSqlite('UPDATE counters SET currentNumber = ?, lastDateUsed = ? WHERE id = ?;', [
      next,
      dateReceived || existing.lastDateUsed,
      existing.id,
    ]);
    return next;
  }
  const result = await pgPool.query('SELECT * FROM counters WHERE scope = $1 AND section IS NOT DISTINCT FROM $2 LIMIT 1;', [
    scope,
    section,
  ]);
  const existing = result.rows[0];
  const dateChanged = dateReceived && existing && existing.lastdateused !== dateReceived;
  
  // Verify counter accuracy by checking actual records
  if (existing && !dateChanged && section && dateReceived) {
    const recordsResult = await pgPool.query(
      'SELECT "mcCtrlNo", "sectionCtrlNo" FROM records WHERE section = $1 AND "dateReceived" = $2;',
      [section, dateReceived]
    );
    
    // Find the highest actual sequence number
    let highestActual = 0;
    recordsResult.rows.forEach(record => {
      const ctrlNo = scope === 'MC' ? record.mcCtrlNo : record.sectionCtrlNo;
      if (ctrlNo) {
        const match = ctrlNo.match(/-(\d+)$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > highestActual) highestActual = seq;
        }
      }
    });
    
    // If counter is higher than actual records, reset it
    if (existing.currentnumber > highestActual) {
      await pgPool.query('UPDATE counters SET "currentNumber" = $1 WHERE id = $2;', [highestActual, existing.id]);
      const next = highestActual + 1;
      await pgPool.query('UPDATE counters SET "currentNumber" = $1, "lastDateUsed" = $2 WHERE id = $3;', [
        next,
        dateReceived || existing.lastdateused,
        existing.id,
      ]);
      return next;
    }
  }
  
  if (!existing) {
    const insert = await pgPool.query(
      'INSERT INTO counters (scope, section, currentNumber, lastDateUsed) VALUES ($1, $2, 1, $3) RETURNING currentNumber;',
      [scope, section, dateReceived || null]
    );
    return insert.rows[0].currentnumber || 1;
  }
  const baseNumber = dateChanged ? 0 : existing.currentnumber || 0;
  const next = baseNumber + 1;
  await pgPool.query('UPDATE counters SET currentNumber = $1, lastDateUsed = $2 WHERE id = $3;', [
    next,
    dateReceived || existing.lastdateused,
    existing.id,
  ]);
  return next;
}

async function createRecord(payload) {
  const now = new Date().toISOString();
  const record = {
    mcCtrlNo: payload.mcCtrlNo,
    sectionCtrlNo: payload.sectionCtrlNo,
    section: payload.section,
    dateReceived: payload.dateReceived,
    subjectText: payload.subjectText,
    subjectFileUrl: payload.subjectFileUrl || null,
    fromValue: payload.fromValue,
    fromType: payload.fromType,
    targetDate: payload.targetDate,
    targetDateMode: payload.targetDateMode,
    receivedBy: payload.receivedBy,
    actionTaken: payload.actionTaken,
    remarks: payload.remarks,
    concernedUnits: payload.concernedUnits,
    dateSent: payload.dateSent,
    createdBy: payload.createdBy || payload.username,
    updatedBy: payload.updatedBy || payload.username,
    createdAt: now,
    updatedAt: now,
  };

  if (isSqlite) {
    const result = await runSqlite(
      `INSERT INTO records (
        mcCtrlNo, sectionCtrlNo, section, dateReceived, subjectText, subjectFileUrl,
        fromValue, fromType, targetDate, targetDateMode, receivedBy, actionTaken,
        remarks, concernedUnits, dateSent, createdBy, updatedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.mcCtrlNo,
        record.sectionCtrlNo,
        record.section,
        record.dateReceived,
        record.subjectText,
        record.subjectFileUrl,
        record.fromValue,
        record.fromType,
        record.targetDate,
        record.targetDateMode,
        record.receivedBy,
        record.actionTaken,
        record.remarks,
        record.concernedUnits,
        record.dateSent,
        record.createdBy,
        record.updatedBy,
        record.createdAt,
        record.updatedAt,
      ]
    );
    return { id: result.lastID, ...record };
  }

  const insert = await pgPool.query(
    `INSERT INTO records (
      mcCtrlNo, sectionCtrlNo, section, dateReceived, subjectText, subjectFileUrl,
      fromValue, fromType, targetDate, targetDateMode, receivedBy, actionTaken,
      remarks, concernedUnits, dateSent, createdBy, updatedBy, createdAt, updatedAt
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *;`,
    [
      record.mcCtrlNo,
      record.sectionCtrlNo,
      record.section,
      record.dateReceived,
      record.subjectText,
      record.subjectFileUrl,
      record.fromValue,
      record.fromType,
      record.targetDate,
      record.targetDateMode,
      record.receivedBy,
      record.actionTaken,
      record.remarks,
      record.concernedUnits,
      record.dateSent,
      record.createdBy,
      record.updatedBy,
      record.createdAt,
      record.updatedAt,
    ]
  );
  return insert.rows[0];
}

async function listRecords(filters = {}) {
  const { section } = filters;
  if (isSqlite) {
    if (section) return await allSqlite('SELECT * FROM records WHERE section = ? ORDER BY dateReceived ASC;', [section]);
    return await allSqlite('SELECT * FROM records ORDER BY dateReceived ASC;');
  }
  if (section) {
    const result = await pgPool.query('SELECT * FROM records WHERE section = $1 ORDER BY dateReceived ASC;', [section]);
    return result.rows;
  }
  const result = await pgPool.query('SELECT * FROM records ORDER BY dateReceived ASC;');
  return result.rows;
}

async function getRecord(id) {
  if (isSqlite) return await getSqlite('SELECT * FROM records WHERE id = ?;', [id]);
  const result = await pgPool.query('SELECT * FROM records WHERE id = $1;', [id]);
  return result.rows[0];
}

async function updateRecord(id, payload) {
  const current = await getRecord(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const fields = {
    mcCtrlNo: payload.mcCtrlNo ?? current.mcCtrlNo,
    sectionCtrlNo: payload.sectionCtrlNo ?? current.sectionCtrlNo,
    section: payload.section ?? current.section,
    dateReceived: payload.dateReceived ?? current.dateReceived,
    subjectText: payload.subjectText ?? current.subjectText,
    subjectFileUrl: payload.subjectFileUrl ?? current.subjectFileUrl,
    fromValue: payload.fromValue ?? current.fromValue,
    fromType: payload.fromType ?? current.fromType,
    targetDate: payload.targetDate ?? current.targetDate,
    targetDateMode: payload.targetDateMode ?? current.targetDateMode,
    receivedBy: payload.receivedBy ?? current.receivedBy,
    actionTaken: payload.actionTaken ?? current.actionTaken,
    remarks: payload.remarks ?? current.remarks,
    concernedUnits: payload.concernedUnits ?? current.concernedUnits,
    dateSent: payload.dateSent ?? current.dateSent,
    updatedBy: payload.updatedBy || payload.username || current.updatedBy,
    updatedAt: now,
  };

  if (isSqlite) {
    await runSqlite(
      `UPDATE records SET
        mcCtrlNo = ?,
        sectionCtrlNo = ?,
        section = ?,
        dateReceived = ?,
        subjectText = ?,
        subjectFileUrl = ?,
        fromValue = ?,
        fromType = ?,
        targetDate = ?,
        targetDateMode = ?,
        receivedBy = ?,
        actionTaken = ?,
        remarks = ?,
        concernedUnits = ?,
        dateSent = ?,
        updatedBy = ?,
        updatedAt = ?
      WHERE id = ?;`,
      [
        fields.mcCtrlNo,
        fields.sectionCtrlNo,
        fields.section,
        fields.dateReceived,
        fields.subjectText,
        fields.subjectFileUrl,
        fields.fromValue,
        fields.fromType,
        fields.targetDate,
        fields.targetDateMode,
        fields.receivedBy,
        fields.actionTaken,
        fields.remarks,
        fields.concernedUnits,
        fields.dateSent,
        fields.updatedBy,
        fields.updatedAt,
        id,
      ]
    );
    return await getRecord(id);
  }

  const update = await pgPool.query(
    `UPDATE records SET
      mcCtrlNo = $1,
      sectionCtrlNo = $2,
      section = $3,
      dateReceived = $4,
      subjectText = $5,
      subjectFileUrl = $6,
      fromValue = $7,
      fromType = $8,
      targetDate = $9,
      targetDateMode = $10,
      receivedBy = $11,
      actionTaken = $12,
      remarks = $13,
      concernedUnits = $14,
      dateSent = $15,
      updatedBy = $16,
      updatedAt = $17
    WHERE id = $18 RETURNING *;`,
    [
      fields.mcCtrlNo,
      fields.sectionCtrlNo,
      fields.section,
      fields.dateReceived,
      fields.subjectText,
      fields.subjectFileUrl,
      fields.fromValue,
      fields.fromType,
      fields.targetDate,
      fields.targetDateMode,
      fields.receivedBy,
      fields.actionTaken,
      fields.remarks,
      fields.concernedUnits,
      fields.dateSent,
      fields.updatedBy,
      fields.updatedAt,
      id,
    ]
  );
  return update.rows[0];
}

async function updateRecordFile(id, { subjectFileUrl, updatedBy }) {
  const now = new Date().toISOString();
  if (isSqlite) {
    await runSqlite(
      `UPDATE records SET
        subjectFileUrl = ?,
        updatedBy = ?,
        updatedAt = ?
      WHERE id = ?;`,
      [subjectFileUrl, updatedBy || null, now, id]
    );
    return await getRecord(id);
  }

  const update = await pgPool.query(
    `UPDATE records SET
      subjectFileUrl = $1,
      updatedBy = $2,
      updatedAt = $3
    WHERE id = $4 RETURNING *;`,
    [subjectFileUrl, updatedBy || null, now, id]
  );
  return update.rows[0];
}

async function deleteRecord(id) {
  if (isSqlite) {
    await runSqlite('DELETE FROM records WHERE id = ?;', [id]);
    return;
  }
  await pgPool.query('DELETE FROM records WHERE id = $1;', [id]);
}

async function resetCountersForSection(section, dateReceived) {
  // Get all records for this section and date to find the highest control number
  let records;
  if (isSqlite) {
    records = await allSqlite(
      'SELECT mcCtrlNo, sectionCtrlNo FROM records WHERE section = ? AND dateReceived = ? ORDER BY id DESC;',
      [section, dateReceived]
    );
  } else {
    const result = await pgPool.query(
      'SELECT "mcCtrlNo", "sectionCtrlNo" FROM records WHERE section = $1 AND "dateReceived" = $2 ORDER BY id DESC;',
      [section, dateReceived]
    );
    records = result.rows;
  }

  // Extract the highest sequence numbers from control numbers
  let highestMC = 0;
  let highestSection = 0;

  records.forEach(record => {
    const mcCtrlNo = isSqlite ? record.mcCtrlNo : record.mcCtrlNo;
    const sectionCtrlNo = isSqlite ? record.sectionCtrlNo : record.sectionCtrlNo;

    if (mcCtrlNo) {
      const match = mcCtrlNo.match(/-MC-(\d+)-(\d+)$/);
      if (match) {
        const seq = parseInt(match[2], 10);
        if (seq > highestMC) highestMC = seq;
      }
    }

    if (sectionCtrlNo) {
      const match = sectionCtrlNo.match(/-(\d+)-(\d+)$/);
      if (match) {
        const seq = parseInt(match[2], 10);
        if (seq > highestSection) highestSection = seq;
      }
    }
  });

  // Reset counters to the highest found (or 0 if no records)
  if (isSqlite) {
    await runSqlite(
      'UPDATE counters SET currentNumber = ? WHERE scope = ? AND section IS ?;',
      [highestMC, 'MC', null]
    );
    await runSqlite(
      'UPDATE counters SET currentNumber = ? WHERE scope = ? AND section = ?;',
      [highestSection, 'SECTION', section]
    );
  } else {
    await pgPool.query(
      'UPDATE counters SET "currentNumber" = $1 WHERE scope = $2 AND section IS NULL;',
      [highestMC, 'MC']
    );
    await pgPool.query(
      'UPDATE counters SET "currentNumber" = $1 WHERE scope = $2 AND section = $3;',
      [highestSection, 'SECTION', section]
    );
  }

  return { highestMC, highestSection };
}

async function validateControlNumbers(section, dateReceived) {
  let records;
  if (isSqlite) {
    records = await allSqlite(
      'SELECT id, mcCtrlNo, sectionCtrlNo FROM records WHERE section = ? AND dateReceived = ? ORDER BY id;',
      [section, dateReceived]
    );
  } else {
    const result = await pgPool.query(
      'SELECT id, "mcCtrlNo", "sectionCtrlNo" FROM records WHERE section = $1 AND "dateReceived" = $2 ORDER BY id;',
      [section, dateReceived]
    );
    records = result.rows;
  }

  const mcNumbers = new Set();
  const sectionNumbers = new Set();
  const duplicates = [];
  const issues = [];

  records.forEach(record => {
    const mcCtrlNo = isSqlite ? record.mcCtrlNo : record.mcCtrlNo;
    const sectionCtrlNo = isSqlite ? record.sectionCtrlNo : record.sectionCtrlNo;

    // Check for duplicates
    if (mcCtrlNo) {
      if (mcNumbers.has(mcCtrlNo)) {
        duplicates.push({ type: 'MC', controlNumber: mcCtrlNo, recordId: record.id });
      }
      mcNumbers.add(mcCtrlNo);
    }

    if (sectionCtrlNo) {
      if (sectionNumbers.has(sectionCtrlNo)) {
        duplicates.push({ type: 'SECTION', controlNumber: sectionCtrlNo, recordId: record.id });
      }
      sectionNumbers.add(sectionCtrlNo);
    }
  });

  // Check for missing numbers (gaps in sequence)
  const extractSequence = (controlNumber, pattern) => {
    const match = controlNumber.match(pattern);
    return match ? parseInt(match[2], 10) : null;
  };

  const mcSequences = Array.from(mcNumbers)
    .map(cn => extractSequence(cn, /-MC-(\d+)-(\d+)$/))
    .filter(n => n !== null)
    .sort((a, b) => a - b);

  const sectionSequences = Array.from(sectionNumbers)
    .map(cn => extractSequence(cn, /-(\d+)-(\d+)$/))
    .filter(n => n !== null)
    .sort((a, b) => a - b);

  // Find gaps in MC sequences
  for (let i = 0; i < mcSequences.length - 1; i++) {
    if (mcSequences[i + 1] - mcSequences[i] > 1) {
      for (let missing = mcSequences[i] + 1; missing < mcSequences[i + 1]; missing++) {
        issues.push({ type: 'MC', message: `Missing control number sequence: ${missing}` });
      }
    }
  }

  // Find gaps in Section sequences
  for (let i = 0; i < sectionSequences.length - 1; i++) {
    if (sectionSequences[i + 1] - sectionSequences[i] > 1) {
      for (let missing = sectionSequences[i] + 1; missing < sectionSequences[i + 1]; missing++) {
        issues.push({ type: 'SECTION', message: `Missing control number sequence: ${missing}` });
      }
    }
  }

  return {
    duplicates,
    issues,
    hasProblems: duplicates.length > 0 || issues.length > 0
  };
}

async function createUser({ username, password, role, section }) {
  const now = new Date().toISOString();
  if (isSqlite) {
    const insert = await runSqlite(
      'INSERT INTO users (username, password, role, section, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?);',
      [username, password, role, section, now, now]
    );
    return await getUserById(insert.lastID);
  }
  const insert = await pgPool.query(
    'INSERT INTO users (username, password, role, section, isActive, createdAt, updatedAt) VALUES ($1, $2, $3, $4, TRUE, $5, $6) RETURNING *;',
    [username, password, role, section, now, now]
  );
  return insert.rows[0];
}

async function getUserByUsername(username) {
  if (isSqlite) {
    return await getSqlite('SELECT * FROM users WHERE username = ? AND isActive = 1;', [username]);
  }
  const result = await pgPool.query('SELECT * FROM users WHERE username = $1 AND isActive = TRUE;', [username]);
  return result.rows[0];
}

async function getUserById(id) {
  if (isSqlite) {
    return await getSqlite('SELECT * FROM users WHERE id = ?;', [id]);
  }
  const result = await pgPool.query('SELECT * FROM users WHERE id = $1;', [id]);
  return result.rows[0];
}

async function listUsers() {
  if (isSqlite) {
    return await allSqlite('SELECT id, username, role, section, isActive FROM users ORDER BY username ASC;');
  }
  const result = await pgPool.query('SELECT id, username, role, section, isActive FROM users ORDER BY username ASC;');
  return result.rows;
}

async function updateUser(id, { password, role, section, isActive }) {
  const now = new Date().toISOString();
  const updates = [];
  const params = [];
  
  if (password !== undefined) {
    updates.push(isSqlite ? 'password = ?' : `password = $${params.length + 1}`);
    params.push(password);
  }
  if (role !== undefined) {
    updates.push(isSqlite ? 'role = ?' : `role = $${params.length + 1}`);
    params.push(role);
  }
  if (section !== undefined) {
    updates.push(isSqlite ? 'section = ?' : `section = $${params.length + 1}`);
    params.push(section);
  }
  if (isActive !== undefined) {
    updates.push(isSqlite ? 'isActive = ?' : `isActive = $${params.length + 1}`);
    params.push(isActive);
  }
  
  if (updates.length === 0) return await getUserById(id);
  
  updates.push(isSqlite ? 'updatedAt = ?' : `updatedAt = $${params.length + 1}`);
  params.push(now);
  params.push(id);
  
  if (isSqlite) {
    await runSqlite(`UPDATE users SET ${updates.join(', ')} WHERE id = ?;`, params);
    return await getUserById(id);
  }
  
  const result = await pgPool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *;`,
    params
  );
  return result.rows[0];
}

module.exports = {
  db: {
    createRecord,
    listRecords,
    getRecord,
    updateRecord,
    updateRecordFile,
    deleteRecord,
    resetCountersForSection,
    validateControlNumbers,
    getNextCounter,
    getNextCounterPreview,
    createUser,
    getUserByUsername,
    getUserById,
    listUsers,
    updateUser,
  },
  initDb,
  isSqlite,
};
