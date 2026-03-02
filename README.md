# Document Management System (DMS)

A document tracking and management application for section-based document workflows, built with React and an Express/SQLite backend. Optionally runs as a desktop application via Electron.

## Features

- MC and Section user roles with document routing
- Record creation, tracking, and status management
- Activity log and reporting
- User management for MC administrators
- Runs in the browser or as a standalone Electron desktop app

## Installation

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd server && npm install
```

## Configuration

Copy `server/.env.example` to `server/.env` and update the values:

```bash
cp server/.env.example server/.env
```

Key environment variables (see `server/.env.example` for all options):

| Variable | Description |
|----------|-------------|
| `PORT` | Port the backend server listens on (default: `5000`) |
| `JWT_SECRET` | Secret key used to sign JWT tokens — **change this!** |
| `DB_MODE` | Database backend: `sqlite` (default) or `pg` (PostgreSQL) |
| `SQLITE_PATH` | Path to the SQLite database file |
| `UPLOAD_DIR` | Directory where uploaded files are stored |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

## Running the Development Server

Start the backend:

```bash
cd server && node index.js
```

Start the frontend (in a separate terminal from the project root):

```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Running in Electron (Desktop) Mode

Build the React frontend and launch the Electron window:

```bash
npm run electron-dev
```

Or, if the build is already up to date:

```bash
npm run electron
```

## Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd server && npm test
```
