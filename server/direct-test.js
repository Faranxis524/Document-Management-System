/**
 * Direct Authentication Test (No Jest)
 * Pure Node.js script to test authentication
 */

const path = require('path');
const fs = require('fs');

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-12345';
process.env.PORT = '5998';

const testDbPath = path.join(__dirname, '__tests__', 'direct-test.db');
process.env.DB_PATH = testDbPath;

// Clean up old database
if (fs.existsSync(testDbPath)) {
  console.log('Removing old test database...');
  fs.unlinkSync(testDbPath);
}

async function runTest() {
  console.log('\n🔧 Starting Direct Authentication Test\n');
  console.log('Environment:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  DB_PATH:', process.env.DB_PATH);
  console.log('  PORT:', process.env.PORT);
  console.log('');

  // Import after environment is set
  const { app, startServer } = require('./index');
  const request = require('supertest');

  console.log('Starting server...');
  const server = await startServer();
  console.log('✓ Server started\n');

  // Wait for database seeding
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Test 1: Check if admin user exists in database
  console.log('Test 1: Checking admin user in database');
  const { db } = require('./lib/db');
  const adminUser = await db.getUserByUsername('admin');
  if (adminUser) {
    console.log('✓ Admin user found in database');
    console.log('  Username:', adminUser.username);
    console.log('  Role:', adminUser.role);
    console.log('  Has password hash:', !!adminUser.password);
  } else {
    console.log('✗ Admin user NOT found in database!');
    process.exit(1);
  }
  console.log('');

  // Test 2: Try to login
  console.log('Test 2: Attempting login with admin/admin123');
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({
      username: 'admin',
      password: 'admin123'
    });

  console.log('  Status:', loginResponse.status);
  console.log('  Body:', JSON.stringify(loginResponse.body, null, 2));

  if (loginResponse.status === 200) {
    console.log('✓ Login successful!');
    const token = loginResponse.body.token;
    console.log('  Token (first 30 chars):', token?.substring(0, 30) + '...');
    console.log('');

    // Test 3: Verify token
    console.log('Test 3: Verifying token');
    const verifyResponse = await request(app)
      .get('/auth/verify')
      .set('Authorization', `Bearer ${token}`);

    console.log('  Status:', verifyResponse.status);
    if (verifyResponse.status === 200) {
      console.log('✓ Token verification successful!');
      console.log('  User:', verifyResponse.body.user.username);
    } else {
      console.log('✗ Token verification failed!');
      console.log('  Body:', verifyResponse.body);
    }
  } else {
    console.log('✗ Login failed!');
    console.log('  Expected: 200');
    console.log('  Received:', loginResponse.status);
  }

  console.log('');

  // Test 4: Try wrong password
  console.log('Test 4: Testing wrong password');
  const wrongPassResponse = await request(app)
    .post('/auth/login')
    .send({
      username: 'admin',
      password: 'wrongpassword'
    });

  console.log('  Status:', wrongPassResponse.status);
  if (wrongPassResponse.status === 401) {
    console.log('✓ Wrong password correctly rejected');
  } else {
    console.log('✗ Wrong password not rejected properly');
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('Test complete!');
  console.log('='.repeat(50));

  // Cleanup
  server.close(() => {
    setTimeout(() => {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log('\n✓ Test database cleaned up');
      }
      process.exit(0);
    }, 200);
  });
}

runTest().catch(error => {
  console.error('\n❌ Test failed with error:');
  console.error(error);
  process.exit(1);
});
