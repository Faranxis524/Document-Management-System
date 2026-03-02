# Document Management System

A web-based document management system. The server runs on one PC; **everyone else just opens a browser** — no EXE to install or redistribute when you update.

---

## Step-by-Step: First-Time Setup (Windows)

> **Do this once on the PC that will act as the server (the host machine).**

### Step 1 — Install Node.js

1. Go to <https://nodejs.org> and download the **LTS** version.
2. Run the installer, keep all defaults, and click **Finish**.
3. Open **Command Prompt** and verify:
   ```
   node --version
   npm --version
   ```
   Both should print a version number (e.g. `v20.x.x`).

---

### Step 2 — Get the project files

**Option A — Git (recommended, makes updates easy)**

1. Install Git from <https://git-scm.com> (keep all defaults).
2. Open Command Prompt and run:
   ```
   git clone https://github.com/Faranxis524/Document-Management-System.git
   cd Document-Management-System
   ```

**Option B — Download ZIP**

1. Click the green **Code** button on GitHub → **Download ZIP**.
2. Extract the ZIP to a folder like `C:\DMS`.
3. Open Command Prompt inside that folder:
   ```
   cd C:\DMS
   ```

---

### Step 3 — Configure the server

1. Copy the example environment file:
   ```
   copy server\.env.example server\.env
   ```
2. Open `server\.env` in Notepad.
3. Replace `REPLACE_THIS_WITH_A_STRONG_RANDOM_SECRET` with a real secret.
   Generate one by running this in Command Prompt:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste it as the value of `JWT_SECRET`.
4. Leave everything else as-is (the defaults work for LAN and ZeroTier).
5. Save and close the file.

---

### Step 4 — Run the one-time setup

Double-click **`setup-production.bat`** (or run it from Command Prompt):
```
setup-production.bat
```

This will:
- Install all dependencies (takes 2–5 minutes on first run)
- Build the frontend into the `build/` folder

You only need to do this once (and again after any code update).

---

### Step 5 — Start the server

Double-click **`start-dms-production.bat`**.

A terminal window opens. When you see:
```
API listening on 0.0.0.0:5000
Local:   http://localhost:5000
Network: http://192.168.x.x:5000
```
the server is ready. **Keep this window open** while the system is in use.

---

### Step 6 — Open the app

| Who | URL to open in a browser |
|-----|--------------------------|
| The server PC itself | `http://localhost:5000` |
| Any other PC on the same LAN | `http://<SERVER-IP>:5000` |
| Any PC connected via ZeroTier | `http://<ZEROTIER-IP>:5000` |

Replace `<SERVER-IP>` / `<ZEROTIER-IP>` with the address printed in the terminal.

Default login: **admin / admin123** — change this immediately after first login.

---

### Step 7 (Optional) — Open the firewall port

If other PCs on the network cannot connect, run this **once** in PowerShell as Administrator:

```powershell
New-NetFirewallRule -DisplayName "DMS Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Any
```

---

### Step 8 (Optional) — Auto-start when Windows boots

So the server starts automatically without anyone clicking a bat file:

1. Open **PowerShell as Administrator**.
2. Navigate to the DMS folder:
   ```powershell
   cd C:\DMS
   ```
3. Run:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\setup-autostart.ps1
   ```

The server will now start every time Windows boots. Manage it in Task Scheduler (`taskschd.msc`) → look for **DMS Auto-Start**.

---

## How to Update (after code changes)

> No EXE rebuild. No distributing files to users. Just do this on the **server PC**.

**Windows** — double-click **`update.bat`**  
**Linux / Mac** — run `bash update.sh`

What it does automatically:
1. Pulls the latest code from Git (`git pull`)
2. Reinstalls any new dependencies
3. Rebuilds the frontend
4. Tells you to restart the server

After the server restarts, every user sees the new version on their next **browser refresh**. Nothing to send, nothing to reinstall on client devices.

---

## Alternative: Docker (any OS)

If Docker is installed (<https://docs.docker.com/get-docker/>):

```bash
# First time, or after any code change:
docker compose up -d --build
```

The app runs at `http://localhost:5000`. Data persists in Docker named volumes across every rebuild.

```bash
docker compose logs -f   # watch live logs
docker compose down      # stop
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `'node' is not recognized` | Reinstall Node.js and open a new Command Prompt |
| `Build folder not found` when starting | Run `setup-production.bat` first |
| `Port 5000 already in use` | Another DMS instance is running — close it |
| Other PCs can't connect | Run the firewall command in Step 7 |
| Page loads but login fails | Check `server\.env` — make sure `JWT_SECRET` is set to a real value |
| ZeroTier IP not printed at startup | Make sure ZeroTier is connected **before** starting the server |

---

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `user1` | `user123` |

Change these immediately after first login via the **User Management** page.
