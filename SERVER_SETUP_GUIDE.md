# Setting Up a Dedicated DMS Server PC

## Overview
This guide helps you transfer DMS to a PC that will stay in the office 24/7.

---

## Prerequisites
- One PC that will remain in the office (the "server PC")
- Administrator access to that PC
- USB drive for file transfer (or network share)

---

## Step 1: Prepare the Server PC

### 1.1 Install Node.js
1. Download Node.js from: https://nodejs.org
2. Click "LTS" (Long Term Support) version
3. Run the installer
4. Keep all default options
5. Restart the PC after installation

### 1.2 Verify Node.js Installation
Open Command Prompt and run:
```bash
node --version
npm --version
```
Both should show version numbers.

---

## Step 2: Transfer DMS Files

### Option A: USB Drive
1. On current PC, copy entire `DMS` folder to USB drive
2. Insert USB into server PC
3. Copy DMS folder to: `C:\Users\[USERNAME]\Documents\DMS`

### Option B: Network Share
1. Share the DMS folder on current PC
2. Access from server PC via network
3. Copy to: `C:\Users\[USERNAME]\Documents\DMS`

---

## Step 3: Install Dependencies

On the **server PC**, open Command Prompt or PowerShell:

```bash
# Navigate to DMS folder
cd C:\Users\[USERNAME]\Documents\DMS

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

This may take 5-10 minutes.

---

## Step 4: Update Network Configuration

### 4.1 Find Server PC's IP Address
Open Command Prompt on server PC:
```bash
ipconfig
```
Look for **IPv4 Address** under your network adapter (e.g., `192.168.254.xxx`)

### 4.2 Update Configuration Files

**Edit `.env` file** (in DMS root folder):
```env
REACT_APP_API_BASE=http://[SERVER-IP]:5000
HOST=0.0.0.0
```
Replace `[SERVER-IP]` with the actual IP from step 4.1

**Edit `server\.env` file**:
```env
DB_MODE=sqlite
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000,http://[SERVER-IP]:3000
```

---

## Step 5: Configure Firewall

On server PC, open PowerShell **as Administrator**:

```powershell
# Allow port 3000 (frontend)
New-NetFirewallRule -DisplayName "DMS Frontend Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any

# Allow port 5000 (backend)
New-NetFirewallRule -DisplayName "DMS Backend Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Any
```

---

## Step 6: Test Manual Start

Open PowerShell in DMS folder:

```bash
# Start backend
cd server
npm start
```

Open **another** PowerShell window:

```bash
# Start frontend
cd C:\Users\[USERNAME]\Documents\DMS
npm start
```

Test from server PC: `http://localhost:3000`
Test from other PC: `http://[SERVER-IP]:3000`

If both work, proceed to Step 7.

---

## Step 7: Set Up Auto-Start

### Option A: Use Provided Scripts (Easiest)

1. **Double-click** `start-dms.bat` to test manual start
2. If it works, right-click `setup-autostart.ps1`
3. Choose **"Run with PowerShell"**
4. If you see "scripts disabled" error:
   - Open PowerShell as Administrator
   - Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
   - Try again

### Option B: Task Scheduler (Manual)

1. Press **Windows Key + R** → type `taskschd.msc` → Enter
2. Click **"Create Task..."** (not Basic Task)
3. **General tab:**
   - Name: `DMS Auto-Start`
   - Check: **"Run with highest privileges"**
   - Check: **"Run whether user is logged on or not"**
4. **Triggers tab:**
   - Click **New**
   - Begin the task: **"At startup"**
   - Click **OK**
5. **Actions tab:**
   - Click **New**
   - Action: **"Start a program"**
   - Program/script: `cmd.exe`
   - Arguments: `/c "C:\Users\[USERNAME]\Documents\DMS\start-dms.bat"`
   - Click **OK**
6. **Settings tab:**
   - Uncheck: **"Stop the task if it runs longer than"**
   - Check: **"If task fails, restart every"** → 1 minute, 3 times
7. Click **OK** → Enter your Windows password

---

## Step 8: Configure Auto-Login (Optional)

If you want servers to start even when no one is logged in:

1. Press **Windows Key + R** → type `netplwiz` → Enter
2. Uncheck: **"Users must enter a username and password"**
3. Click **Apply**
4. Enter password for automatic login
5. Click **OK**

⚠️ **Warning**: This makes the PC auto-login. Only do this if the PC is in a secure location.

---

## Step 9: Prevent Sleep Mode

To keep servers running 24/7:

1. **Settings** → **System** → **Power & sleep**
2. Set both to **"Never"**:
   - Screen: Never
   - Sleep: Never
3. Click **"Additional power settings"**
4. Choose **"High performance"** plan
5. Click **"Change plan settings"**
6. Set **"Put the computer to sleep"** to **Never**

---

## Step 10: Test Restart

1. Restart the server PC
2. Wait 2-3 minutes
3. From another PC, try accessing: `http://[SERVER-IP]:3000`
4. If it works → Setup complete! 🎉

---

## Troubleshooting

### Servers Don't Start After Reboot
- Check Task Scheduler → DMS Auto-Start task → Last Run Result
- Right-click task → Run → Check if it works manually
- Check Windows Event Viewer for errors

### Can't Access from Other PCs
- Verify firewall rules: `Get-NetFirewallRule | Where DisplayName -like "*DMS*"`
- Try temporarily disabling Windows Firewall to test
- Check server IP hasn't changed: `ipconfig`

### Performance Issues
- Close unnecessary programs on server PC
- Increase RAM if possible (8GB+ recommended)
- Consider switching to PostgreSQL for better performance

---

## Alternative: Cloud Hosting

If you can't leave a PC running 24/7, consider:

### Free Options (Limited):
- **Render.com** (Free tier, sleeps after 15 min inactivity)
- **Railway.app** (Free $5 credit/month)
- **Fly.io** (Free tier available)

### Paid Options (Best):
- **DigitalOcean** ($6/month droplet)
- **AWS Lightsail** ($5/month)
- **Vultr** ($6/month)

Cloud hosting requires:
- Internet connection for access
- Different setup process
- Monthly cost ($0-$6/month)

Would you like a cloud hosting guide instead?

---

## Summary

✅ **One-time setup on server PC:**
1. Install Node.js
2. Transfer DMS files
3. Run `npm install`
4. Update IP addresses in config files
5. Add firewall rules
6. Set up auto-start

✅ **Maintenance:**
- Keep server PC powered on
- Don't close server windows
- Restart PC monthly for updates

✅ **Accessing from any device:**
- Just go to: `http://[SERVER-IP]:3000`
- No installation needed on client devices
- Works on PC, laptop, phone, tablet

---

## Support

If you need help:
1. Check Task Scheduler logs
2. Check server console for errors
3. Verify both ports (3000, 5000) are listening:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000,5000 -State Listen
   ```
