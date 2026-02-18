/**
 * Users API Tests
 * Tests user management operations (admin only)
 */

const request = require('supertest');
const path = require('path');

process.env.DB_PATH = path.join(__dirname, 'test-users.db');

describe('Users API', () => {
  let app;
  let server;
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    const appModule = require('../index');
    app = appModule.app;
    
    // Initialize server and database
    server = await appModule.startServer();
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Login as admin
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    adminToken = loginResponse.body.token;
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
    const dbPath = path.join(__dirname, 'test-users.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /users', () => {
    test('should create a new user', async () => {
      const newUser = {
        username: 'testuser',
        password: 'test123',
        role: 'user',
        section: 'IT'
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.username).toBe(newUser.username);
      expect(response.body.role).toBe(newUser.role);
      expect(response.body.password).toBeUndefined(); // Password should not be returned
      
      testUserId = response.body.id;
    });

    test('should reject duplicate username', async () => {
      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'testuser', // Already exists
          password: 'password',
          role: 'user'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already exists/i);
    });

    test('should reject user creation without authentication', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          username: 'noauth',
          password: 'test123',
          role: 'user'
        });

      expect(response.status).toBe(401);
    });

    test('should reject user with missing required fields', async () => {
      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'incomplete'
          // Missing password and role
        });

      expect(response.status).toBe(400);
    });

    test('should hash password before storing', async () => {
      const newUser = {
        username: 'hashtest',
        password: 'plaintext123',
        role: 'user'
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      
      // Try to login with the password
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'hashtest',
          password: 'plaintext123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
    });
  });

  describe('GET /users', () => {
    test('should get all users', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Passwords should not be included
      response.body.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    test('should filter active users only', async () => {
      const response = await request(app)
        .get('/users?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });
  });

  describe('GET /users/:id', () => {
    test('should get a specific user by id', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testUserId);
      expect(response.body.password).toBeUndefined();
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /users/:id', () => {
    test('should update user information', async () => {
      const updates = {
        section: 'Finance',
        role: 'user'
      };

      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.section).toBe(updates.section);
    });

    test('should update user password', async () => {
      const newPassword = 'newpassword123';
      
      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: newPassword });

      expect(response.status).toBe(200);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: newPassword
        });

      expect(loginResponse.status).toBe(200);
    });

    test('should toggle user active status', async () => {
      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });

    test('should return 404 when updating non-existent user', async () => {
      const response = await request(app)
        .put('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ section: 'HR' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /users/:id', () => {
    test('should delete a user', async () => {
      // Create a user to delete
      const createResponse = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'todelete',
          password: 'test123',
          role: 'user'
        });

      const userId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify user is deleted
      const getResponse = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(404);
    });

    test('should return 404 when deleting non-existent user', async () => {
      const response = await request(app)
        .delete('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('should not allow deleted user to login', async () => {
      // Create and delete a user
      const createResponse = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'deletedlogin',
          password: 'test123',
          role: 'user'
        });

      await request(app)
        .delete(`/users/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'deletedlogin',
          password: 'test123'
        });

      expect(loginResponse.status).toBe(401);
    });
  });
});
