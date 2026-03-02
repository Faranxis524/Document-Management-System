# DMS Server Setup for First-Timer (No Coding, No VS Code)

Use this guide exactly as written on the new server PC.

Server IP in your office network: 10.163.253.16

---

## What You Need Before Starting

1. The DMS folder already copied to the server PC.
2. Internet connection (for first setup and updates).
3. A Windows account with Administrator rights.
4. About 30 to 60 minutes for first setup.

---

## PART A - First-Time Setup (Do this once only)

### Step 1 - Install Node.js

1. Open browser on server PC.
2. Go to: https://nodejs.org
3. Download the LTS version.
4. Open the downloaded installer.
5. Keep clicking Next until Install.
6. Click Finish.
7. Restart the computer.

What should happen:
- Node.js is installed and available for DMS.

---

### Step 2 - Install Git

1. Open browser.
2. Go to: https://git-scm.com/download/win
3. Download and run installer.
4. Keep default settings and click Next until Install.
5. Click Finish.

What should happen:
- Git is installed for receiving future updates.

---

### Step 3 - Open the DMS Folder

1. Open File Explorer.
2. Go to the folder where DMS was copied.
3. Confirm you can see these files:
   - setup-production.bat
   - start-dms-production.bat
   - update-dms-server-silent.bat
   - setup-dms-shortcuts.ps1

---

### Step 4 - Run One-Time Production Setup

1. Double-click setup-production.bat
2. If asked for permission, click Yes.
3. Wait until it says setup is complete.
4. If it pauses, press any key to continue.

Important:
- This can take several minutes.
- Do not close the window while it is installing.

What should happen:
- Required packages install.
- Frontend production build is created.

---

### Step 5 - Start DMS for the First Time

1. Double-click start-dms-production.bat
2. A command window named DMS Production should open.
3. Keep that window open.
4. Open browser and go to:
   - http://localhost:5000 (on the server PC)

Network access test from another office PC:
- Open browser and go to:
  - http://10.163.253.16:5000

If both open, setup is successful.

---

### Step 6 - Create Desktop Shortcuts (Recommended)

1. Right-click setup-dms-shortcuts.ps1
2. Click Run with PowerShell
3. If prompted, allow it.
4. Confirm desktop icons appear:
   - Update DMS
   - Start DMS

If PowerShell blocks the script:
- Open Windows PowerShell as Administrator.
- Run this command:
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
- Type Y then Enter.
- Run setup-dms-shortcuts.ps1 again.

---

### Step 7 - Keep Server Awake

1. Open Settings.
2. Go to System > Power.
3. Set sleep to Never while plugged in.

Reason:
- If PC sleeps, DMS stops responding.

---

## PART B - Daily Operation (Normal use)

1. Start DMS by double-clicking desktop icon Start DMS.
2. Do not close the DMS Production command window.
3. Users access DMS at:
   - http://10.163.253.16:5000

---

## PART C - Update Procedure (After developer pushes new code)

1. On server PC, double-click desktop icon Update DMS.
2. Wait until you see Update complete.
3. Open browser and refresh DMS.

What this updater does automatically:
1. Pull latest code from main branch.
2. Install any new dependencies.
3. Rebuild production frontend.
4. Restart DMS Production window.

---

## PART D - If Something Fails

### Problem 1 - Update failed message

1. Open DMS folder.
2. Open logs folder.
3. Find newest file named update-YYYYMMDD-HHMMSS.log
4. Send that file to developer.

---

### Problem 2 - Browser cannot open 10.163.253.16:5000

On server PC:
1. Check if DMS Production window is open.
2. If not open, run Start DMS again.
3. Test local URL first: http://localhost:5000

If localhost works but other PCs cannot access:
1. Windows Firewall may block port 5000.
2. Ask admin/developer to allow inbound TCP 5000.

---

### Problem 3 - Update does nothing

1. Ensure internet is connected.
2. Ensure ZeroTier is connected (if using remote access/VPN path).
3. Run Update DMS again.
4. If still failing, send latest log file to developer.

---

## PART E - What Not To Do

1. Do not delete the DMS folder.
2. Do not close update window before it finishes.
3. Do not edit files manually.
4. Do not move database files in server/data.

---

## Quick Checklist for the Operator

First day only:
1. Install Node.js
2. Install Git
3. Run setup-production.bat
4. Run start-dms-production.bat
5. Run setup-dms-shortcuts.ps1

Every update day:
1. Click Update DMS
2. Wait for Update complete
3. Refresh browser
