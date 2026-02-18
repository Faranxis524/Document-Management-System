# Quick Test Commands

## Run All Tests
```bash
# Backend + Frontend
node run-tests.js all

# With coverage
node run-tests.js all:coverage
```

## Backend Tests
```bash
# All backend tests
node run-tests.js backend

# Watch mode
node run-tests.js backend:watch

# With coverage
node run-tests.js backend:coverage
```

## Frontend Tests
```bash
# All frontend tests
node run-tests.js frontend

# Watch mode
node run-tests.js frontend:watch

# With coverage
node run-tests.js frontend:coverage
```

## Specific Test Suites
```bash
# Authentication tests only
node run-tests.js auth

# Records tests only
node run-tests.js records

# Users tests only
node run-tests.js users

# Security tests only
node run-tests.js security
```

## Manual Commands

### Backend
```bash
cd server
npm test                    # Run all
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npx jest auth.test.js       # Specific file
```

### Frontend
```bash
npm test                              # Watch mode (interactive)
npm test -- --watchAll=false          # Run once
npm test -- --coverage                # With coverage
npm test -- App.test.js               # Specific file
```

## Coverage Reports
After running with coverage, open:
- Backend: `server/coverage/lcov-report/index.html`
- Frontend: `coverage/lcov-report/index.html`

## Test Summary
- **Total Tests:** 400+ assertions
- **Backend:** 320+ assertions (4 suites)
- **Frontend:** 80+ assertions (2 suites)

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed documentation.
