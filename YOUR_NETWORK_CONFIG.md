# Your Network Configuration

## ✅ Setup Complete!

Your system is now configured for network access.

---

## Your Network Information

**Server IP Address:** `192.168.254.193` (Local Network - Wi-Fi)

**Access URLs:**
- **From your PC:** http://localhost:3000
- **From other PCs on same WiFi:** http://192.168.254.193:3000

---

## What Was Configured

✅ **Backend CORS** - Updated `server/.env`:
- Allows connections from localhost and your network IP

✅ **Frontend API** - Created `.env`:
- Points to your network IP address

⚠️ **Firewall** - Needs manual setup (see below)

---

## Next Steps

### 1. Configure Windows Firewall

When you start the server, Windows will show a firewall popup:

**IMPORTANT:** Check BOTH boxes:
- ✅ Private networks
- ✅ Public networks
- Click **"Allow access"**

If you don't see the popup, firewall is already configured.

---

### 2. Start the Servers

**Terminal 1 - Backend:**
```powershell
cd server
npm start
```

**Terminal 2 - Frontend:**
```powershell
npm start
```

---

### 3. Share with Other Users

Tell them to open their browser and go to:

```
http://192.168.254.193:3000
```

**Login credentials:**
- Username: `NUP Tala` (or any other user)
- Password: `password`

---

## What Other PCs Need

✅ Connected to the **same WiFi network** as you  
✅ Web browser (Chrome, Edge, Firefox)  
✅ The URL: http://192.168.254.193:3000

❌ They do NOT need to install anything!

---

## Testing

### Test from Your PC:
1. Open browser
2. Go to: http://localhost:3000
3. Login ✅

### Test from Another PC:
1. Make sure it's on same WiFi
2. Open browser  
2. Go to: http://192.168.254.193:3000
4. Login ✅

---

## Troubleshooting

### "Cannot connect" Error

**Check 1:** Both servers running?
- Backend (port 5000) ✓
- Frontend (port 3000) ✓

**Check 2:** Windows Firewall
- Allow Node.js through firewall
- See step 1 above

**Check 3:** Same WiFi network?
- Your PC and their PC must be on same WiFi

**Check 4:** Try ping test
```powershell
# On other PC, run:
ping 192.168.254.193

# Should see replies, not timeouts
```

---

## Important Notes

**Your IP may change if:**
- You restart your computer
- Router restarts
- WiFi reconnects

**If IP changes:**
1. Run `ipconfig` to get new IP
2. Update `server/.env` ALLOWED_ORIGINS
3. Update `.env` REACT_APP_API_BASE
4. Restart both servers
5. Tell users the new URL

**To prevent IP changes:**
- Reserve your IP in router settings
- Or use static IP configuration

---

## Files Modified

1. `server/.env` - Added ALLOWED_ORIGINS
2. `.env` (root) - Created with API base URL

---

## Quick Reference for Users

**Print this and share:**

```
┌────────────────────────────────────┐
│   CIDG RFU 4A DMS Access           │
├────────────────────────────────────┤
│                                    │
│  URL: http://192.168.254.193:3000  │
│                                    │
│  Login:                            │
│    Username: (ask admin)           │
│    Password: password              │
│                                    │
│  Requirements:                     │
│    • Same WiFi network             │
│    • Web browser                   │
│                                    │
└────────────────────────────────────┘
```

---

**Everything is configured and ready to go!** 🚀

Just start both servers and share the URL with your team.
