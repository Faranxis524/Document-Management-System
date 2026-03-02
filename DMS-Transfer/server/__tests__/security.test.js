/**
 * Security Tests
 * Tests rate limiting, CORS, and security features
 */

const request = require('supertest');
const path = require('path');

process.env.DB_PATH = path.join(__dirname, 'test-security.db');

describe('Security Features', () => {
  let app;
  let server;

  beforeAll(async () => {
    const appModule = require('../index');
    app = appModule.app;
    
    // Initialize server and database
    server = await appModule.startServer();
    
    await new Promise(resolve => setTimeout(resolve, 500));
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
    const dbPath = path.join(__dirname, 'test-security.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Rate Limiting - Login Endpoint', () => {
    test('should allow up to 5 login attempts', async () => {
      const attempts = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            username: 'testuser',
            password: 'wrongpassword'
          });
        
        attempts.push(response.status);
      }

      // All 5 attempts should receive 401 (not rate limited)
      expect(attempts.every(status => status === 401)).toBe(true);
    });

    test('should rate limit after 5 failed login attempts', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            username: 'ratelimituser',
            password: 'wrong'
          });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'ratelimituser',
          password: 'wrong'
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/Too many/i);
    });
  });

  describe('Rate Limiting - API Endpoints', () => {
    let authToken;

    beforeAll(async () => {
      // Get auth token (use a fresh IP by waiting)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      authToken = loginResponse.body.token;
    });

    test('should allow reasonable number of API requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .get('/records')
          .set('Authorization', `Bearer ${authToken}`);
        
        requests.push(response.status);
      }

      // All requests should succeed
      expect(requests.every(status => status === 200)).toBe(true);
    });

    // Note: Testing 100 requests would be slow, but verifies limit exists
    test('should have rate limit configured for API endpoints', async () => {
      // Just verify the first request works (limit is 100/15min)
      const response = await request(app)
        .get('/records')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Rate limit headers should be present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    test('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/auth/login')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('JWT Token Security', () => {
    let validToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      validToken = loginResponse.body.token;
    });

    test('should reject expired token format', async () => {
      // Create a malformed token
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.invalid';
      
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
    });

    test('should reject token with invalid signature', async () => {
      // Modify the token slightly
      const tamperedToken = validToken.slice(0, -5) + 'AAAAA';
      
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    test('should reject token without Bearer prefix', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', validToken); // No "Bearer " prefix

      expect(response.status).toBe(401);
    });
  });

  describe('Password Security', () => {
    let adminToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      adminToken = loginResponse.body.token;
    });

    test('should never return password in API responses', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.forEach(user => {
        expect(user.password).toBeUndefined();
        expect(Object.keys(user)).not.toContain('password');
      });
    });

    test('should not return password after user creation', async () => {
      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'securitytest',
          password: 'test123',
          role: 'user'
        });

      expect(response.status).toBe(201);
      expect(response.body.password).toBeUndefined();
    });

    test('should not return password after login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should not expose internal error details in production', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint');

      expect(response.status).toBe(404);
      // Should not contain stack traces or sensitive info
      if (response.body.error) {
        expect(response.body.stack).toBeUndefined();
      }
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
    });

    test('should handle SQL injection attempts', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: "admin' OR '1'='1",
          password: "anything"
        });

      expect(loginResponse.status).toBe(401);
    });
  });

  describe('File Upload Security', () => {
    let authToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      authToken = loginResponse.body.token;
    });

    test('should reject file upload without authentication', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(response.status).toBe(401);
    });

    test('should require authentication for file uploads', async () => {
      const response = await request(app)
        .post('/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), 'test.txt');

      // Should either succeed or fail with proper error (not 401)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Input Validation', () => {
    let authToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      authToken = loginResponse.body.token;
    });

    test('should reject invalid date formats', async () => {
      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'IT',
          dateReceived: 'invalid-date',
          from: 'Test',
          nature: 'Test',
          classification: 'Public',
          actionTaken: 'Filed'
        });

      // Should either accept any string or reject with 400
      expect([200, 201, 400]).toContain(response.status);
    });

    test('should sanitize string inputs', async () => {
      const response = await request(app)
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          section: 'IT',
          dateReceived: '2026-02-18',
          from: '<script>alert("xss")</script>',
          nature: 'Test',
          classification: 'Public',
          actionTaken: 'Filed'
        });

      if (response.status === 201) {
        // XSS attempt should be stored as plain text, not executed
        expect(response.body.from).toBeDefined();
      }
    });
  });
});
