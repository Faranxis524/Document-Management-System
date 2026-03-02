/**
 * Authentication API Tests
 * Tests login, token validation, and authentication middleware
 */

const request = require('supertest');
const path = require('path');

// Set environment before requiring the app
process.env.DB_PATH = path.join(__dirname, 'test-auth.db');

describe('Authentication API', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Import app after environment is set
    const appModule = require('../index');
    app = appModule.app;
    
    // Initialize server and database
    server = await appModule.startServer();
    
    // Wait for database initialization
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    // Close server and clean up
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Clean up test database
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'test-auth.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /auth/login', () => {
    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should reject login with invalid username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/Invalid credentials/);
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/Invalid credentials/);
    });

    test('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should return user role and section', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBeDefined();
      expect(['admin', 'user']).toContain(response.body.user.role);
    });
  });

  describe('GET /auth/verify', () => {
    let validToken;

    beforeAll(async () => {
      // Get a valid token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      validToken = loginResponse.body.token;
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/verify');

      expect(response.status).toBe(401);
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    test('should verify valid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('admin');
    });

    test('should include user details in verification', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.role).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe('Protected Routes', () => {
    test('should reject access to /records without token', async () => {
      const response = await request(app)
        .get('/records');

      expect(response.status).toBe(401);
    });

    test('should reject access to /users without token', async () => {
      const response = await request(app)
        .get('/users');

      expect(response.status).toBe(401);
    });
  });
});
