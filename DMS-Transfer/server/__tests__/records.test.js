/**
 * Records API Tests
 * Tests CRUD operations for document records
 */

const request = require('supertest');
const path = require('path');

process.env.DB_PATH = path.join(__dirname, 'test-records.db');

describe('Records API', () => {
  let app;
  let server;
  let authToken;
  let testRecordId;

  beforeAll(async () => {
    const appModule = require('../index');
    app = appModule.app;
    
    // Initialize server and database
    server = await appModule.startServer();
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'test-records.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /records', () => {
    test('should create a new record with valid data', async () => {
      const newRecord = {
        section: 'HR',
        dateReceived: '2026-02-18',
        from: 'John Doe',
        nature: 'Employee Request',
        classification: 'Internal',
        actionTaken: 'Pending',
        remarks: 'Test record'
      };

      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRecord);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.controlNumber).toBeDefined();
      expect(response.body.section).toBe(newRecord.section);
      
      testRecordId = response.body.id;
    });

    test('should reject record creation without authentication', async () => {
      const response = await request(app)
        .post('/records')
        .send({
          section: 'IT',
          dateReceived: '2026-02-18'
        });

      expect(response.status).toBe(401);
    });

    test('should reject record with missing required fields', async () => {
      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'HR'
          // Missing other required fields
        });

      expect(response.status).toBe(400);
    });

    test('should auto-generate control number', async () => {
      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'IT',
          dateReceived: '2026-02-18',
          from: 'Test User',
          nature: 'Test Nature',
          classification: 'Public',
          actionTaken: 'Filed'
        });

      expect(response.status).toBe(201);
      expect(response.body.controlNumber).toMatch(/^IT-\d{4}-\d+$/);
    });
  });

  describe('GET /records', () => {
    test('should get all records', async () => {
      const response = await request(app)
        .get('/records')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should filter records by section', async () => {
      const response = await request(app)
        .get('/records?section=HR')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(record => {
        expect(record.section).toBe('HR');
      });
    });

    test('should filter records by date range', async () => {
      const response = await request(app)
        .get('/records?startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter records by action taken', async () => {
      const response = await request(app)
        .get('/records?actionTaken=Pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should search records by query string', async () => {
      const response = await request(app)
        .get('/records?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /records/:id', () => {
    test('should get a specific record by id', async () => {
      const response = await request(app)
        .get(`/records/${testRecordId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testRecordId);
    });

    test('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .get('/records/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /records/:id', () => {
    test('should update a record', async () => {
      const updates = {
        actionTaken: 'Completed',
        remarks: 'Updated remarks'
      };

      const response = await request(app)
        .put(`/records/${testRecordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.actionTaken).toBe(updates.actionTaken);
      expect(response.body.remarks).toBe(updates.remarks);
    });

    test('should return 404 when updating non-existent record', async () => {
      const response = await request(app)
        .put('/records/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ actionTaken: 'Completed' });

      expect(response.status).toBe(404);
    });

    test('should maintain control number when updating', async () => {
      const getResponse = await request(app)
        .get(`/records/${testRecordId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const originalControlNumber = getResponse.body.controlNumber;

      const updateResponse = await request(app)
        .put(`/records/${testRecordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ remarks: 'Changed remarks' });

      expect(updateResponse.body.controlNumber).toBe(originalControlNumber);
    });
  });

  describe('DELETE /records/:id', () => {
    test('should delete a record', async () => {
      // Create a record to delete
      const createResponse = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'Finance',
          dateReceived: '2026-02-18',
          from: 'To Delete',
          nature: 'Test',
          classification: 'Internal',
          actionTaken: 'Filed'
        });

      const recordId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/records/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify record is deleted
      const getResponse = await request(app)
        .get(`/records/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    test('should return 404 when deleting non-existent record', async () => {
      const response = await request(app)
        .delete('/records/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /records/export/excel', () => {
    test('should export records to Excel', async () => {
      const response = await request(app)
        .get('/records/export/excel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/spreadsheet/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
    });

    test('should export filtered records', async () => {
      const response = await request(app)
        .get('/records/export/excel?section=HR')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /records/stats', () => {
    test('should return statistics', async () => {
      const response = await request(app)
        .get('/records/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalRecords).toBeDefined();
      expect(response.body.bySection).toBeDefined();
      expect(response.body.byActionTaken).toBeDefined();
    });

    test('should filter statistics by date range', async () => {
      const response = await request(app)
        .get('/records/stats?startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(typeof response.body.totalRecords).toBe('number');
    });
  });
});
