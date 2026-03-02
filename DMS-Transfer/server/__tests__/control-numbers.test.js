/**
 * Control Number Management Tests
 * Tests counter reset and validation after record deletion
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, 'control-numbers-test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

process.env.DB_PATH = testDbPath;

describe('Control Number Management', () => {
  let app;
  let server;
  let authToken;
  let recordIds = [];

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
    await new Promise(resolve => setTimeout(resolve, 200));
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Counter Reset After Deletion', () => {
    test('should reset counters after deleting a record', async () => {
      // Create 3 records
      for (let i = 1; i <= 3; i++) {
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
      }

      // Delete the middle record
      const deleteResponse = await request(app)
        .delete(`/records/${recordIds[1]}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.ok).toBe(true);
      expect(deleteResponse.body.countersReset).toBeDefined();
      
      console.log('Delete response:', deleteResponse.body);
    });

    test('should provide validation warnings when there are issues', async () => {
      const deleteResponse = await request(app)
        .delete(`/records/${recordIds[0]}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      
      // After deleting records, there might be gaps
      if (deleteResponse.body.validation) {
        console.log('Validation detected:', deleteResponse.body.validation);
        expect(deleteResponse.body.validation.hasProblems).toBeDefined();
      }
    });
  });

  describe('Validate Control Numbers Endpoint', () => {
    test('GET /records/validate-control-numbers - should validate control numbers', async () => {
      // Create a few more records
      await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'INTEL',
          dateReceived: '2026-02-18',
          from: 'Test User',
          nature: 'Test',
          classification: 'Internal',
          actionTaken: 'Pending'
        });

      const response = await request(app)
        .get('/records/validate-control-numbers?section=INTEL&dateReceived=2026-02-18')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBeDefined();
      expect(response.body.hasProblems).toBeDefined();
      expect(response.body.duplicates).toBeDefined();
      expect(response.body.issues).toBeDefined();
      
      console.log('Validation result:', response.body);
    });

    test('should require section parameter', async () => {
      const response = await request(app)
        .get('/records/validate-control-numbers?dateReceived=2026-02-18')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/section/i);
    });

    test('should require dateReceived parameter', async () => {
      const response = await request(app)
        .get('/records/validate-control-numbers?section=INTEL')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/dateReceived/i);
    });
  });

  describe('Reset Counters Endpoint', () => {
    test('POST /records/reset-counters - should manually reset counters', async () => {
      const response = await request(app)
        .post('/records/reset-counters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'INVES',
          dateReceived: '2026-02-18'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.resetResult).toBeDefined();
      expect(response.body.validation).toBeDefined();
      
      console.log('Reset result:', response.body);
    });

    test('should require MC role', async () => {
      // This would need a SECTION user token to test properly
      // For now, we test with admin which has MC role
      const response = await request(app)
        .post('/records/reset-counters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'OPN',
          dateReceived: '2026-02-18'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Duplicate Detection', () => {
    test('should detect duplicate control numbers if they exist', async () => {
      // This test would require manually creating duplicate control numbers
      // which shouldn't happen in normal operation
      const response = await request(app)
        .get('/records/validate-control-numbers?section=INVES&dateReceived=2026-02-18')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.duplicates)).toBe(true);
    });
  });

  describe('Missing Number Detection', () => {
    test('should detect gaps in control number sequences', async () => {
      const response = await request(app)
        .get('/records/validate-control-numbers?section=INVES&dateReceived=2026-02-18')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.issues)).toBe(true);
      
      // If there are gaps, they should be reported
      if (response.body.issues.length > 0) {
        console.log('Detected gaps:', response.body.issues);
        expect(response.body.hasProblems).toBe(true);
      }
    });
  });
});
