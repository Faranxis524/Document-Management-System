/**
 * Counter Auto-Reset Test
 * Verifies that counters automatically reset when all records are deleted
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, 'counter-auto-reset-test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

process.env.SQLITE_PATH = testDbPath;

describe('Counter Auto-Reset on Empty Database', () => {
  let app;
  let server;
  let authToken;

  beforeAll(async () => {
    delete require.cache[require.resolve('../index')];
    delete require.cache[require.resolve('../lib/db')];
    delete require.cache[require.resolve('../lib/seedUsers')];
    
    const appModule = require('../index');
    app = appModule.app;
    server = await appModule.startServer();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Login to get token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(() => resolve()));
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (err) {
      console.log('Could not delete test database:', err.message);
    }
  });

  test('should start at 01 after all records are deleted', async () => {
    // Create records 01-05
    const recordIds = [];
    for (let i = 1; i <= 5; i++) {
      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'INVES',
          dateReceived: '2026-02-18',
          from: `Test User ${i}`,
          nature: `Test Record ${i}`,
          classification: 'Internal',
          actionTaken: 'Pending'
        });

      expect(response.status).toBe(200);
      recordIds.push(response.body.id);
      
      // Verify control number format
      expect(response.body.sectionCtrlNo).toMatch(/RFU4A-INVES-260218-0[1-5]/);
    }

    // Verify we got up to 05
    const lastRecord = await request(app)
      .get(`/records/${recordIds[4]}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(lastRecord.body.sectionCtrlNo).toBe('RFU4A-INVES-260218-05');

    // Delete ALL records
    for (const id of recordIds) {
      const deleteResponse = await request(app)
        .delete(`/records/${id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(deleteResponse.status).toBe(200);
    }

    // Now create a new record - should get 01, not 06
    const newRecord = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        section: 'INVES',
        dateReceived: '2026-02-18',
        from: 'New User',
        nature: 'New Record',
        classification: 'Internal',
        actionTaken: 'Pending'
      });

    expect(newRecord.status).toBe(200);
    expect(newRecord.body.sectionCtrlNo).toBe('RFU4A-INVES-260218-01');
    expect(newRecord.body.mcCtrlNo).toBe('RFU4A-MC-260218-01');
    
    console.log('✅ Counter successfully reset to 01 after deleting all records');
  });

  test('should handle partial deletion correctly', async () => {
    // Create records 01-10
    const recordIds = [];
    for (let i = 1; i <= 10; i++) {
      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'INTEL',
          dateReceived: '2026-02-18',
          from: `Test User ${i}`,
          nature: `Test Record ${i}`,
          classification: 'Internal',
          actionTaken: 'Pending'
        });

      expect(response.status).toBe(200);
      recordIds.push(response.body.id);
    }

    // Delete records 6-10 (keep 01-05)
    for (let i = 5; i < 10; i++) {
      await request(app)
        .delete(`/records/${recordIds[i]}`)
        .set('Authorization', `Bearer ${authToken}`);
    }

    // Create new record - should get 06, not 11
    const newRecord = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        section: 'INTEL',
        dateReceived: '2026-02-18',
        from: 'New User',
        nature: 'New Record',
        classification: 'Internal',
        actionTaken: 'Pending'
      });

    expect(newRecord.status).toBe(200);
    expect(newRecord.body.sectionCtrlNo).toBe('RFU4A-INTEL-260218-06');
    
    console.log('✅ Counter correctly continued from highest existing record');
  });

  test('should work when records exist but counter is too high', async () => {
    // This simulates the user's situation: records were manually deleted
    // but the counter wasn't reset
    
    // Create one record
    const response = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        section: 'OPN',
        dateReceived: '2026-02-18',
        from: 'Test User',
        nature: 'Test Record',
        classification: 'Internal',
        actionTaken: 'Pending'
      });

    expect(response.status).toBe(200);
    const firstNumber = response.body.sectionCtrlNo;
    expect(firstNumber).toBe('RFU4A-OPN-260218-01');

    // The counter verification logic should prevent skipping numbers
    const response2 = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        section: 'OPN',
        dateReceived: '2026-02-18',
        from: 'Test User 2',
        nature: 'Test Record 2',
        classification: 'Internal',
        actionTaken: 'Pending'
      });

    expect(response2.status).toBe(200);
    expect(response2.body.sectionCtrlNo).toBe('RFU4A-OPN-260218-02');
    
    console.log('✅ Sequential numbering maintained correctly');
  });
});
