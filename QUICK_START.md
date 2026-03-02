# Quick Start Guide - Make DMS Easy to Use

## 🚀 Recommended: Production Mode (Easiest!)

### One-Time Setup:

1. **Build the frontend** (only needed once, or after you make changes):
   ```powershell
   npm run build
   ```

2. **Double-click** `start-dms-production.bat`

3. **Open browser** to http://localhost:5000

That's it! Now you have ONE server running everything.

---

## 📌 Make It Start with Windows

1. Right-click PowerShell and select "Run as Administrator"
2. Run:
   ```powershell
   cd "C:\Users\FRANCIS\Documents\DMS"
   .\setup-autostart.ps1
   ```
3. Done! DMS will auto-start when Windows boots.

---

## 🖥️ Option: Desktop Application (Real .exe)

Want a standalone desktop app? Follow these steps:

### Step 1: Install Electron
```powershell
npm install --save-dev electron electron-builder
```

### Step 2: Update package.json

Open `package.json` and add `"main": "electron.js"` at the top:
```json
{
  "name": "dms",
  "version": "0.1.0",
  "private": true,
  "main": "electron.js",
  ...
}
```

Add these scripts to the `"scripts"` section:
```json
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "electron": "electron .",
  "electron-dev": "npm run build && electron .",
  "dist": "npm run build && electron-builder"
}
```

Add this build configuration at the end of package.json (before the last `}`):
```json
,
"build": {
  "appId": "com.dms.app",
  "productName": "DMS",
  "directories": {
    "output": "release"
  },
  "win": {
    "target": ["nsis"],
    "icon": "public/favicon.ico"
  },
  "files": [
    "build/**/*",
    "server/**/*",
    "electron.js",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "server/data",
      "to": "server/data"
    }
  ]
}
```

### Step 3: Build the Desktop App
```powershell
npm run dist
```

### Step 4: Install!
- Go to the `release/` folder
- Double-click the installer
- You'll have a real desktop app!

---

## 📊 Comparison

| Method | Setup | How to Start | Pros |
|--------|-------|-------------|------|
| **Production Mode** | 2 min | Double-click .bat | Fast, simple, professional |
| **Auto-Start** | 3 min | Automatic | No manual startup needed |
| **Desktop App** | 30 min | Desktop shortcut | Real .exe, looks professional |

---

## ✅ My Recommendation

1. Use **Production Mode** for daily use (it's ready now!)
2. Set up **Auto-Start** if you use it frequently  
3. Build **Desktop App** if you want to distribute to others

---

## 🔧 Troubleshooting

**"Build folder not found"**
- Run `npm run build` first

**"Port already in use"**
- Check if another DMS instance is running
- Close it and try again

**Desktop app won't start**
- Make sure PostgreSQL is running
- Check your .env file

---

## 📝 After Changes

When you modify the code:

**For Production Mode:**
```powershell
npm run build
```

**For Desktop App:**
```powershell
npm run dist
```

---

Need help? Check DEPLOYMENT_GUIDE.md for more details!
