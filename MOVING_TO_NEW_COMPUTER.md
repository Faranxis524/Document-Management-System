# 🚀 Moving DMS to Another Computer - Simple Guide

You're leaving the office and need to move your DMS app to a new computer without VS Code or development tools.

## ✅ BEST METHOD: Standalone Installer (Recommended!)

### Why This is Best:
- ✅ **ZERO dependencies** - New computer needs NOTHING installed
- ✅ **One file** to transfer (the .exe installer)
- ✅ **Professional** - Installs like any Windows software
- ✅ **Includes everything** - Node.js, your app, database, files
- ✅ **Easy** - Just double-click on new computer

### Steps on THIS Computer (Before Leaving):

```powershell
# Just run this script:
.\create-electron-installer.bat
```

**That's it!** This creates an installer in the `release/` folder.

**Time needed:** 10-15 minutes (computer does the work)

---

### Steps on NEW Computer:

1. Copy the `.exe` file from `release/` folder
2. Transfer it (USB drive, email, cloud)
3. Double-click the `.exe` on new computer
4. Done! DMS installs like any app

**No Node.js needed! No setup! Just works!**

---

## Alternative: Basic Transfer Package

If you don't want to wait for the Electron build:

### On THIS Computer:
```powershell
.\create-transfer-package.bat
```

This creates a `DMS-Transfer` folder with everything.

### On NEW Computer:
1. Install Node.js from nodejs.org
2. Extract the DMS-Transfer folder
3. Run `INSTALL.bat`
4. Run `START-DMS.bat`

**Time needed:** 5 minutes here + 10 minutes on new computer

---

## 📊 Quick Comparison

| Method | Transfer | New PC Needs | Setup Time | Best For |
|--------|----------|--------------|------------|----------|
| **Standalone .EXE** | 1 file (~150MB) | Nothing! | 1 minute | **Everyone!** |
| **Basic Package** | Folder (~200MB) | Node.js | 10 minutes | Quick transfer |

---

## 🎯 My Strong Recommendation

**Use the Standalone Installer!**

Run this RIGHT NOW on your current computer:
```powershell
.\create-electron-installer.bat
```

Then grab the `.exe` from the `release/` folder and you're done!

On the new computer, it will be just like installing Microsoft Word or Chrome - double-click and it works!

---

## 📦 What Gets Transferred

Both methods include:
- ✅ Your entire app
- ✅ Database with ALL your data (SQLite file)
- ✅ All uploaded files
- ✅ All configurations
- ✅ Everything needed to run

**Nothing is left behind!**

---

## ⚠️ Important Before You Leave

1. **Make sure your app is working** (run it one last time)
2. **Create the installer** (run the script)
3. **Copy the installer** to USB drive or cloud storage
4. **Test it works** (optional but recommended)

---

## 🔧 On New Computer - First Time:

**If using Standalone Installer:**
1. Double-click the `.exe` file
2. Follow installation prompts
3. Launch DMS from Start Menu or Desktop
4. That's it!

**If using Basic Package:**
1. Install Node.js (one time only)
2. Run INSTALL.bat
3. Run START-DMS.bat
4. Bookmark http://localhost:5000

---

## 📱 Accessing Your Data

All your data is in the SQLite database file:
- **Location:** `server/data/dms.sqlite`
- **Included:** Yes, automatically!
- **Safe:** All your records, users, files

All uploaded files:
- **Location:** `server/uploads/`
- **Included:** Yes, automatically!
- **Safe:** All PDF attachments included

---

## 🆘 Troubleshooting New Computer

**Standalone .EXE:**
- If it doesn't start, run as Administrator
- Check Windows Defender didn't block it

**Basic Package:**
- If "node not found", install Node.js
- If port in use, restart the computer
- If database missing, check data folder copied

---

## ✨ Final Checklist Before Leaving

- [ ] App is working on current computer
- [ ] Run `.\create-electron-installer.bat`
- [ ] Copy `.exe` from `release/` folder
- [ ] Save to USB drive or upload to cloud
- [ ] (Optional) Test on new computer before leaving

---

**That's it! You'll have your full DMS app on the new computer with zero hassle!** 🎉
