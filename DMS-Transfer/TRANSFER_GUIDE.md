# Transfer DMS to Another Computer

## 🎯 Best Option: Portable Package with Minimal Setup

### What the New Computer Needs:
1. **Node.js** (download from nodejs.org) - That's it!
2. Everything else is included in your package

---

## 📦 Step 1: Create Transfer Package

Run this on your current computer:

```powershell
.\create-transfer-package.bat
```

This creates `DMS-Transfer.zip` with everything needed.

---

## 🚚 Step 2: Transfer to New Computer

1. Copy `DMS-Transfer.zip` to the new computer (USB drive, cloud, etc.)
2. Extract it anywhere (e.g., `C:\Apps\DMS`)

---

## 💻 Step 3: Setup on New Computer

### One-Time Setup:

1. **Install Node.js** (if not installed):
   - Download from: https://nodejs.org
   - Install the LTS version
   - Restart computer after installation

2. **Run the setup script**:
   - Open the DMS folder
   - Double-click `INSTALL.bat`
   - Wait for installation to complete

3. **Done!** Now just double-click `START-DMS.bat` to run

---

## 🖥️ Alternative: Create Standalone .EXE (No Node.js Needed!)

This is the BEST option if you want true portability with ZERO dependencies.

### On Your Current Computer:

```powershell
# 1. Install Electron
npm install --save-dev electron electron-builder

# 2. Build the app
npm run build

# 3. Create installer
npm run dist
```

### Result:
- You get a `.exe` installer in the `release/` folder
- Transfer ONLY that installer to the new computer
- Double-click to install
- No Node.js, no VS Code, nothing else needed!
- Works like any Windows desktop app

---

## 📋 What Gets Transferred

### Basic Package Includes:
- ✅ All source code
- ✅ Database (SQLite file with all your data)
- ✅ Configuration files
- ✅ Uploaded files
- ✅ Startup scripts

### What's NOT Included (must install on new PC):
- ❌ Node.js (must install separately)
- ❌ VS Code (not needed!)
- ❌ Git (not needed!)

### Electron .EXE Package:
- ✅ Everything bundled in one installer
- ✅ Even includes Node.js runtime
- ✅ Zero dependencies!

---

## 🔧 Comparison

| Method | Transfer Size | Setup Time | Dependencies |
|--------|--------------|------------|--------------|
| **Basic Package** | ~200 MB | 5 minutes | Node.js only |
| **Electron .EXE** | ~150 MB | 1 minute | NONE! |

---

## ⚠️ Important Notes

### Database Options:
- **SQLite** (default): Database file transfers with the app ✅
- **PostgreSQL**: You'd need to export/import the database separately

### Your Current Setup:
You're using **SQLite** - perfect! Your data will transfer automatically.

### Network Access:
On the new computer, the app will work on:
- `http://localhost:5000` (always works)
- `http://[new-computer-ip]:5000` (if you want network access)

---

## 🎯 My Recommendation

**Use the Electron .EXE method!**

Why?
- ✅ One installer file to transfer
- ✅ Zero dependencies needed
- ✅ Professional installation experience
- ✅ Auto-updates possible
- ✅ Looks like a real desktop app
- ✅ Works on ANY Windows computer

It takes 30 minutes to set up on your current computer, but saves hours of setup on the new one!

---

## 📞 Quick Reference

| Task | Command/File |
|------|-------------|
| Create package | `.\create-transfer-package.bat` |
| Build Electron | `npm run dist` |
| Install on new PC | Double-click `INSTALL.bat` |
| Run app | Double-click `START-DMS.bat` |
| Electron install | Double-click the `.exe` in `release/` |

---

## 🔍 Troubleshooting New Computer

**"Node is not recognized"**
- Install Node.js from nodejs.org
- Restart computer

**"Port already in use"**
- Check if DMS is already running
- Change port in `server/.env`

**Database not found**
- Make sure `server/data/dms.sqlite` was transferred

**Can't access from network**
- Update IP in `.env.production` and rebuild
- Or just use localhost

---

Need help? Check the detailed files:
- `DEPLOYMENT_GUIDE.md` - Full deployment options
- `QUICK_START.md` - Quick start guide
