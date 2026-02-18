/**
 * Test Setup Configuration
 * Runs before all tests to configure the test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '5001';
process.env.DB_MODE = 'sqlite';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
