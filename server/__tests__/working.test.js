/**
 * Working Tests - Only tests endpoints that actually exist
 * Run with: npx jest __tests__/working.test.js
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, 'working-test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

process.env.DB_PATH = testDbPath;

describe('DMS Working API Tests', () => {
  let app;
  let server;
  let authToken;
  let recordId;

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

  describe('✅ AUTHENTICATION', () => {
    test('POST /auth/login - should login successfully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('admin');
    });

    test('POST /auth/login - should reject wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'wrong' });

      expect(response.status).toBe(401);
    });

    test('GET /auth/verify - should verify valid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });

    test('GET /auth/verify - should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('✅ USERS (Limited)', () => {
    test('GET /users/me - should return current user', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });

    test('GET /users/list - should return user list', async () => {
      const response = await request(app)
        .get('/users/list');

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });
  });

  describe('✅ RECORDS CRUD', () => {
    test('POST /records - should create new record', async () => {
      const newRecord = {
        section: 'INVES',
        dateReceived: '2026-02-18',
        from: 'Test User',
        nature: 'Test Record',
        classification: 'Internal',
        actionTaken: 'Pending',
        remarks: 'Test remarks'
      };

      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRecord);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.mcCtrlNo || response.body.sectionCtrlNo).toBeDefined();
      
      recordId = response.body.id;
    });

    test('GET /records - should list all records', async () => {
      const response = await request(app)
        .get('/records')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.records).toBeDefined();
      expect(Array.isArray(response.body.records)).toBe(true);
    });

    test('GET /records - should filter by section', async () => {
      const response = await request(app)
        .get('/records?section=INVES')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.records).toBeDefined();
      expect(Array.isArray(response.body.records)).toBe(true);
    });

    test('GET /records/:id - should get specific record', async () => {
      const response = await request(app)
        .get(`/records/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(recordId);
    });

    test('PUT /records/:id - should update record', async () => {
      const updates = {
        actionTaken: 'Completed',
        remarks: 'Updated remarks'
      };

      const response = await request(app)
        .put(`/records/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
    });

    test('DELETE /records/:id - should delete record', async () => {
      // Create a record to delete
      const createResponse = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'INVES',
          dateReceived: '2026-02-18',
          from: 'To Delete',
          nature: 'Test',
          classification: 'Internal',
          actionTaken: 'Filed'
        });

      const deleteId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/records/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify deleted
      const getResponse = await request(app)
        .get(`/records/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('✅ OTHER ENDPOINTS', () => {
    test('GET /sections - should return sections list', async () => {
      const response = await request(app)
        .get('/sections');

      expect(response.status).toBe(200);
      expect(response.body.sections).toBeDefined();
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    test('POST /export - should export records', async () => {
      const response = await request(app)
        .post('/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recordIds: [] });

      expect(response.status).toBe(200);
    });
  });

  describe('✅ SECURITY', () => {
    test('Protected routes should reject requests without token', async () => {
      const response = await request(app)
        .get('/records');

      expect(response.status).toBe(401);
    });

    test('Should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });
  });
});
