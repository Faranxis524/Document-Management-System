# DMS Deployment Guide - Production Mode

## Quick Setup (One-Time)

### Step 1: Build the Frontend
```powershell
npm run build
```
This creates optimized production files in the `build/` folder.

### Step 2: Configure Backend to Serve Frontend
The server is already configured to serve the built files from the `build/` folder.

### Step 3: Create Production Startup Script
Create `start-dms-production.bat`:

```bat
@echo off
echo Starting DMS in Production Mode...
cd /d %~dp0server
start "DMS Production" cmd /k "npm start"
echo.
echo DMS is starting...
echo Open your browser to: http://localhost:5000
echo.
pause
```

### Step 4: Use It!
- Double-click `start-dms-production.bat`
- Open browser to http://localhost:5000
- Only ONE server runs (backend serves everything)

---

## Making It Auto-Start with Windows

Run the autostart setup:
```powershell
powershell -ExecutionPolicy Bypass -File setup-autostart.ps1
```

---

## Option: Create Desktop Application with Electron

### Install Electron
```powershell
npm install --save-dev electron electron-builder
```

### Configure package.json
Add these scripts:
```json
"scripts": {
  "electron": "electron .",
  "electron-build": "electron-builder",
  "dist": "npm run build && electron-builder"
}
```

Add Electron configuration:
```json
"main": "electron.js",
"build": {
  "appId": "com.dms.app",
  "productName": "DMS",
  "win": {
    "target": ["nsis"],
    "icon": "public/icon.ico"
  },
  "files": [
    "build/**/*",
    "server/**/*",
    "electron.js"
  ]
}
```

### Create electron.js in root
This file will launch your app as a desktop application.

### Build Installer
```powershell
npm run dist
```

This creates a Windows installer in `dist/` folder.

---

## Option: Windows Service (Advanced)

Use `node-windows` to run as a background service:

```powershell
npm install -g node-windows
```

Create service installer script.

---

## Comparison

| Method | Pros | Cons | Setup Time |
|--------|------|------|------------|
| Desktop Shortcut | Simplest, instant | Still shows terminal | 5 min |
| Production Mode | One server, fast | Need to rebuild after changes | 15 min |
| Electron App | Real desktop app, .exe | Larger file size | 1 hour |
| Windows Service | Runs in background | More complex | 1 hour |

## Recommended: Production Mode + Auto-Start

This gives you:
- ✓ One-click startup
- ✓ Fast performance
- ✓ No terminal windows if minimized
- ✓ Professional feel
- ✓ Easy to maintain
