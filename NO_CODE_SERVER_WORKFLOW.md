# DMS No-Code Server Workflow (No VS Code Needed)

This workflow is for a server operator who does **not** use VS Code.

For full beginner instructions, read first:
- `SERVER_FIRST_TIMER_STEP_BY_STEP.md`

## One-Time Setup on Server PC (10.163.253.16)

1. Install **Node.js LTS**: https://nodejs.org
2. Install **Git for Windows**: https://git-scm.com/download/win
3. Copy/clone this DMS folder to the server.
4. Double-click `setup-production.bat` once.
5. Double-click `start-dms-production.bat` to run DMS.
6. (Optional but recommended) Right-click `setup-dms-shortcuts.ps1` and run with PowerShell to create desktop shortcuts.

Access URLs:
- `http://localhost:5000` (on server PC)
- `http://10.163.253.16:5000` (on LAN)
- ZeroTier IP URL (for remote access)

## Simple Update Process (No Coding)

When developer pushes new code:

1. On server PC, double-click `update-dms-server-silent.bat`
2. Wait until it shows **Update Complete**
3. Open browser and test DMS

That script does everything automatically:
- pulls latest code from GitHub
- installs dependencies
- rebuilds frontend
- restarts the DMS production server

## Which Script Should Staff Use?

- **Daily use (recommended):** `update-dms-server-silent.bat`
- **Troubleshooting / detailed output:** `update-dms-server.bat`
- **Desktop icon option:** run `setup-dms-shortcuts.ps1` once, then use the **Update DMS** desktop shortcut

## If Update Fails

1. Make sure server has internet / ZeroTier connection
2. Make sure Git and Node.js are installed
3. Re-run `update-dms-server-silent.bat`
4. If still failing, send the latest file from `logs\update-*.log` to developer

## Recommended Routine

- Developer: push updates to `main`
- Server operator: run `update-dms-server-silent.bat` once after each update
- Users: refresh browser
