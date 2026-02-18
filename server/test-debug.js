// Simple debug script to test authentication
const request = require('supertest');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_PATH = path.join(__dirname, 'test-debug.db');

async function test() {
  const { app, startServer } = require('./index');
  
  console.log('Starting server...');
  const server = await startServer();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\nAttempting login...');
  const response = await request(app)
    .post('/auth/login')
    .send({
      username: 'admin',
      password: 'admin123'
    });
  
  console.log('Status:', response.status);
  console.log('Body:', response.body);
  
  if (response.status === 200) {
    console.log('\n✅ Login successful!');
    console.log('Token:', response.body.token?.substring(0, 20) + '...');
  } else {
    console.log('\n❌ Login failed!');
  }
  
  server.close();
  
  // Cleanup
  const fs = require('fs');
  const dbPath = path.join(__dirname, 'test-debug.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
}

test().catch(console.error);
