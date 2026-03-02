/**
 * Socket.IO Connection Test
 * 
 * This script tests the real-time connection to the server.
 * Run this to verify Socket.IO is working correctly.
 * 
 * Usage: node scripts/testSocketIO.js
 */

const { io } = require('socket.io-client');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Test credentials (use an existing user)
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'password';

console.log('Testing Socket.IO Connection\n');
console.log(`Connecting to: ${API_BASE}\n`);

async function testConnection() {
  try {
    // Step 1: Login to get JWT token
    console.log('1) Logging in...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const { token } = await loginResponse.json();
    console.log('   Login successful\n');

    // Step 2: Connect to Socket.IO
    console.log('2) Connecting to Socket.IO...');
    const socket = io(API_BASE, {
      auth: { token },
      reconnection: false
    });

    socket.on('connect', () => {
      console.log('   Socket.IO connected!\n');
      console.log(`   Socket ID: ${socket.id}\n`);
      
      // Step 3: Listen for events
      console.log('3) Listening for events...');
      console.log('   (Make changes in the app to see events)\n');
      
      socket.on('record_created', (data) => {
        console.log('   RECORD CREATED:', data.mcCtrlNo);
        console.log('      Section:', data.section);
        console.log('      Subject:', data.subjectText);
        console.log('');
      });
      
      socket.on('record_updated', (data) => {
        console.log('   RECORD UPDATED:', data.mcCtrlNo);
        console.log('      ID:', data.id);
        console.log('      Subject:', data.subjectText);
        console.log('');
      });
      
      socket.on('record_deleted', (data) => {
        console.log('   RECORD DELETED:', data.id);
        console.log('      Section:', data.section);
        console.log('');
      });
      
      console.log('Test complete! Connection is working.\n');
      console.log('   Press Ctrl+C to exit\n');
    });

    socket.on('connect_error', (error) => {
      console.error('   Connection error:', error.message);
      process.exit(1);
    });

    socket.on('disconnect', (reason) => {
      console.log('   Disconnected:', reason);
      process.exit(0);
    });

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testConnection();
