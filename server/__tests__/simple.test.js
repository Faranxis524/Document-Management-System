/**
 * Simple Authentication Test
 * Basic login test to debug the issue
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Clear any existing test database
const testDbPath = path.join(__dirname, 'simple-test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

// Set environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_PATH = testDbPath;
process.env.PORT = '5999';

describe('Simple Auth Test', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Clear require cache to get fresh app instance
    delete require.cache[require.resolve('../index')];
    delete require.cache[require.resolve('../lib/db')];
    delete require.cache[require.resolve('../lib/seedUsers')];
    
    const appModule = require('../index');
    app = appModule.app;
    server = await appModule.startServer();
    
    // Give more time for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Cleanup
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should login with admin credentials', async () => {
    console.log('Testing login...');
    
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    console.log('Response status:', response.status);
    console.log('Response body:', response.body);

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.username).toBe('admin');
  });

  test('should reject invalid password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
  });
});
