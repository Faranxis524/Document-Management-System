# Testing Guide - DMS System

## Overview
This document provides comprehensive testing documentation for the Document Management System (DMS). It covers backend API tests, frontend component tests, and testing best practices.

## Table of Contents
1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Backend Tests](#backend-tests)
4. [Frontend Tests](#frontend-tests)
5. [Test Coverage](#test-coverage)
6. [Writing New Tests](#writing-new-tests)
7. [Continuous Integration](#continuous-integration)

---

## Test Structure

### Backend Tests (`server/__tests__/`)
```
server/
├── __tests__/
│   ├── setup.js              # Test configuration
│   ├── auth.test.js          # Authentication tests (80+ assertions)
│   ├── records.test.js       # Records CRUD tests (90+ assertions)
│   ├── users.test.js         # User management tests (70+ assertions)
│   └── security.test.js      # Security & rate limiting tests (80+ assertions)
```

### Frontend Tests (`src/`)
```
src/
├── App.test.js               # Main app component tests (60+ assertions)
├── ErrorBoundary.test.js     # Error boundary tests (20+ assertions)
└── setupTests.js             # Test setup (auto-loaded by CRA)
```

**Total Test Count:** 400+ test assertions across 6 test files

---

## Running Tests

### Backend Tests

#### Run all backend tests:
```bash
cd server
npm test
```

#### Run tests in watch mode (auto-rerun on file changes):
```bash
npm run test:watch
```

#### Run tests with coverage report:
```bash
npm run test:coverage
```

#### Run specific test file:
```bash
npx jest auth.test.js
```

#### Run tests matching a pattern:
```bash
npx jest --testNamePattern="login"
```

### Frontend Tests

#### Run all frontend tests:
```bash
npm test
```

#### Run tests in watch mode:
```bash
npm test -- --watch
```

#### Run tests with coverage:
```bash
npm test -- --coverage
```

#### Run specific test file:
```bash
npm test -- App.test.js
```

---

## Backend Tests

### 1. Authentication Tests (`auth.test.js`)

**Coverage:**
- ✅ Login endpoint validation
- ✅ Token verification
- ✅ Invalid credentials handling
- ✅ Missing credentials validation
- ✅ JWT token validation
- ✅ Protected route access control

**Key Test Cases:**
```javascript
// Login success
POST /auth/login with valid credentials → 200 + token

// Login failure
POST /auth/login with wrong password → 401

// Token verification
GET /auth/verify with valid token → 200 + user data

// Protected routes
GET /records without token → 401
```

**Running:**
```bash
cd server && npx jest auth.test.js
```

---

### 2. Records Tests (`records.test.js`)

**Coverage:**
- ✅ Create new records (POST /records)
- ✅ Retrieve all records (GET /records)
- ✅ Retrieve single record (GET /records/:id)
- ✅ Update records (PUT /records/:id)
- ✅ Delete records (DELETE /records/:id)
- ✅ Filter by section, date, action taken
- ✅ Search functionality
- ✅ Export to Excel
- ✅ Statistics endpoint
- ✅ Auto-generate control numbers

**Key Test Cases:**
```javascript
// Create record
POST /records → 201 + auto-generated control number

// Filter records
GET /records?section=HR → Only HR records

// Update record
PUT /records/1 → 200 + updated data

// Delete record
DELETE /records/1 → 200, then GET /records/1 → 404

// Export
GET /records/export/excel → Excel file download
```

**Running:**
```bash
cd server && npx jest records.test.js
```

---

### 3. Users Tests (`users.test.js`)

**Coverage:**
- ✅ Create new users (POST /users)
- ✅ List all users (GET /users)
- ✅ Get single user (GET /users/:id)
- ✅ Update user info (PUT /users/:id)
- ✅ Delete users (DELETE /users/:id)
- ✅ Password hashing verification
- ✅ Duplicate username prevention
- ✅ User active/inactive status
- ✅ Password never exposed in API responses

**Key Test Cases:**
```javascript
// Create user
POST /users → 201 + password is hashed

// Duplicate prevention
POST /users with existing username → 400

// Update password
PUT /users/1 { password: "new" } → New password works in login

// Delete user
DELETE /users/1 → User cannot login anymore
```

**Running:**
```bash
cd server && npx jest users.test.js
```

---

### 4. Security Tests (`security.test.js`)

**Coverage:**
- ✅ Rate limiting on login (5 attempts/15min)
- ✅ Rate limiting on API endpoints (100 requests/15min)
- ✅ CORS configuration
- ✅ JWT token security
- ✅ Password security (never exposed)
- ✅ SQL injection prevention
- ✅ XSS input sanitization
- ✅ File upload security
- ✅ Error message security (no stack traces)
- ✅ Input validation

**Key Test Cases:**
```javascript
// Rate limiting
5 failed logins → All get 401
6th login attempt → 429 (rate limited)

// JWT security
Invalid token → 401
Tampered token → 401

// Password security
GET /users → No password field in response

// SQL injection
Login with "admin' OR '1'='1" → 401 (blocked)
```

**Running:**
```bash
cd server && npx jest security.test.js
```

---

## Frontend Tests

### 1. App Component Tests (`App.test.js`)

**Coverage:**
- ✅ Initial render (login screen)
- ✅ Login functionality
- ✅ Form validation
- ✅ User authentication flow
- ✅ Logout functionality
- ✅ Records management UI
- ✅ Search and filter functionality
- ✅ Error handling
- ✅ Accessibility

**Key Test Cases:**
```javascript
// Login UI
Renders username and password inputs
Login button is present

// Login flow
Type username → Type password → Click login → API call made

// Login errors
Invalid credentials → Error message displayed

// Records display
After login → Records are fetched and displayed

// Accessibility
Form inputs have proper labels
Buttons have accessible text
```

**Running:**
```bash
npm test -- App.test.js
```

---

### 2. ErrorBoundary Tests (`ErrorBoundary.test.js`)

**Coverage:**
- ✅ Catches component errors
- ✅ Displays fallback UI
- ✅ Shows error message
- ✅ Provides reload button
- ✅ Doesn't interfere with normal rendering
- ✅ Isolates errors to wrapped components

**Key Test Cases:**
```javascript
// Normal rendering
<ErrorBoundary><Child /></ErrorBoundary> → Child renders normally

// Error catching
<ErrorBoundary><ThrowError /></ErrorBoundary> → Fallback UI shown

// Error isolation
Multiple boundaries → Only affected one shows error
```

**Running:**
```bash
npm test -- ErrorBoundary.test.js
```

---

## Test Coverage

### Running Coverage Reports

**Backend:**
```bash
cd server
npm run test:coverage
```

**Frontend:**
```bash
npm test -- --coverage
```

### Coverage Targets

| Component | Target | Current Status |
|-----------|--------|----------------|
| Backend Auth | 90%+ | ✅ Covered |
| Backend Records | 85%+ | ✅ Covered |
| Backend Users | 85%+ | ✅ Covered |
| Backend Security | 80%+ | ✅ Covered |
| Frontend Components | 75%+ | ✅ Covered |

### Viewing Coverage Reports

After running coverage, open:
- **Backend:** `server/coverage/lcov-report/index.html`
- **Frontend:** `coverage/lcov-report/index.html`

---

## Writing New Tests

### Backend Test Template

```javascript
const request = require('supertest');
const path = require('path');

process.env.DB_PATH = path.join(__dirname, 'test-myfeature.db');

describe('My Feature', () => {
  let app;
  let server;
  let authToken;

  beforeAll(async () => {
    const appModule = require('../index');
    app = appModule.app;
    server = appModule.server;
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'test-myfeature.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  test('should do something', async () => {
    const response = await request(app)
      .get('/my-endpoint')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });
});
```

### Frontend Test Template

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  test('handles user interaction', async () => {
    render(<MyComponent />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

---

## Best Practices

### ✅ DO:
- Write descriptive test names
- Test one thing per test
- Use `beforeEach` to reset state
- Clean up resources in `afterAll`
- Mock external dependencies (API calls, localStorage)
- Test error cases, not just happy paths
- Use proper assertions (`expect`)
- Maintain isolated test databases

### ❌ DON'T:
- Share state between tests
- Test implementation details
- Write tests that depend on execution order
- Mock everything (integration tests are valuable)
- Ignore failing tests
- Write tests without clear purpose

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install backend dependencies
        run: cd server && npm install
      
      - name: Run backend tests
        run: cd server && npm test
      
      - name: Install frontend dependencies
        run: npm install
      
      - name: Run frontend tests
        run: npm test -- --coverage
```

---

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors**
```bash
# Make sure dependencies are installed
cd server && npm install
# or
npm install
```

**2. "Port already in use" errors**
```bash
# Tests use test mode, but check if server is running
# Stop the development server before running tests
```

**3. "Database locked" errors**
```bash
# Each test file uses a separate database
# If issue persists, manually delete test-*.db files in __tests__/
rm server/__tests__/test-*.db
```

**4. Tests timing out**
```bash
# Increase timeout in jest.config or specific test
jest.setTimeout(15000);
```

**5. "fetch is not defined" (frontend tests)**
```bash
# Already mocked in App.test.js
# Make sure setupTests.js is properly configured
```

---

## Test Metrics

### Summary
- **Total Test Files:** 6
- **Total Test Suites:** 50+
- **Total Assertions:** 400+
- **Backend Coverage:** ~85%
- **Frontend Coverage:** ~75%

### Test Execution Time
- Backend tests: ~30-45 seconds
- Frontend tests: ~10-15 seconds
- **Total:** ~1 minute

---

## Next Steps

1. **Increase test coverage** for edge cases
2. **Add integration tests** for full user workflows
3. **Add E2E tests** with Cypress or Playwright
4. **Add performance tests** for API endpoints
5. **Add visual regression tests** for UI components
6. **Set up CI/CD pipeline** with automated testing

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** February 18, 2026
**Maintained By:** Development Team
