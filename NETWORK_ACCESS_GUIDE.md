# Network Access Setup Guide

## Allow Other PCs on Your Network to Access the DMS

This guide shows how to share the DMS system with other computers on your local network (same WiFi/LAN).

---

## Step 1: Find Your Computer's IP Address

**On the SERVER computer (where you run the backend):**

```powershell
ipconfig
```

Look for **IPv4 Address** under your active network adapter:
- **WiFi:** Look under "Wireless LAN adapter Wi-Fi"
- **Ethernet:** Look under "Ethernet adapter"

**Example:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

**Your server IP:** `192.168.1.100` (use your actual IP)

---

## Step 2: Configure Backend for Network Access

### A. Update Server Environment Variables

Edit `server/.env` file:

```env
# Backend server port
PORT=5000

# Allow connections from network
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.1.100:3000,http://192.168.1.101:3000,http://192.168.1.102:3000

# Database (keep your existing setting)
DATABASE_URL=sqlite:./data/dms.sqlite
# or for PostgreSQL:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/dms

# JWT Secret (keep existing)
JWT_SECRET=your-secret-key
```

**Important:** Add the IP of each client computer that will access the system, or use `*` for development:

```env
# Development only - allows all origins
ALLOWED_ORIGINS=*
```

⚠️ **Security Note:** Only use `*` during testing. For production, list specific IPs.

---

## Step 3: Configure Windows Firewall

**Allow Node.js through firewall:**

### Option A: Automatic (when server starts)
1. Start the server: `npm start`
2. Windows Firewall popup appears
3. Check **both** boxes:
   - ✅ Private networks
   - ✅ Public networks (if needed)
4. Click "Allow access"

### Option B: Manual
1. Open **Windows Defender Firewall**
2. Click "Allow an app through firewall"
3. Find "Node.js" or "Node.js JavaScript Runtime"
4. Check **both** Private and Public
5. Click OK

### Option C: Create Rule
```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "DMS Server" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

---

## Step 4: Configure Frontend for Network Access

### A. Update Frontend Environment

**On the SERVER computer**, create/edit `.env` file in the **root directory** (not server folder):

```env
# Point to server's network IP
REACT_APP_API_BASE=http://192.168.1.100:5000

# Replace 192.168.1.100 with YOUR server's IP from Step 1
```

### B. Restart Frontend

```bash
# Stop current frontend (Ctrl+C if running)
# Then restart:
npm start
```

**Note:** You may see:
```
? Would you like to run the app on another port instead? › No
```
Click "Yes" if port 3000 is busy, or "No" to use 3000.

---

## Step 5: Start Both Servers

**On the SERVER computer:**

### Terminal 1: Start Backend
```bash
cd server
npm start
```

**Expected output:**
```
API listening on 5000 using SQLite
```

### Terminal 2: Start Frontend
```bash
# In project root
npm start
```

**Expected output:**
```
Compiled successfully!

Local:            http://localhost:3000
On Your Network:  http://192.168.1.100:3000
```

✅ **Note the "On Your Network" URL** - this is what other computers will use!

---

## Step 6: Access from Other Computers

**On CLIENT computers (other PCs on same network):**

### Open Web Browser

Go to: `http://192.168.1.100:3000`

**Replace `192.168.1.100` with your actual server IP from Step 1**

### Login

Use any of the predefined users:
- Username: `NUP Tala` (MC)
- Password: `password`

✅ **Done!** Multiple users can now work simultaneously.

---

## Quick Setup Summary

**Server Computer (Your PC):**
```bash
# 1. Get IP address
ipconfig
# → Note your IPv4 address (e.g., 192.168.1.100)

# 2. Update server/.env
ALLOWED_ORIGINS=http://192.168.1.100:3000,http://localhost:3000

# 3. Update .env (root folder)
REACT_APP_API_BASE=http://192.168.1.100:5000

# 4. Start backend
cd server
npm start

# 5. Start frontend (new terminal)
npm start
```

**Client Computer (Other PCs):**
```
Open browser → http://192.168.1.100:3000
(Replace with your server IP)
```

---

## Troubleshooting

### Issue: Cannot Connect from Other PC

**Check 1: Server Running?**
```bash
# On server PC, verify both running:
# Terminal 1: server (port 5000)
# Terminal 2: frontend (port 3000)
```

**Check 2: Firewall**
- Windows Firewall blocking? See Step 3
- Try temporarily disabling firewall to test

**Check 3: Same Network?**
- Both computers on same WiFi/network?
- Check IP addresses are in same range (e.g., 192.168.1.x)

**Check 4: Ping Test**
```bash
# On client PC:
ping 192.168.1.100

# Should see replies, not "Request timed out"
```

**Check 5: CORS Errors?**
- Check browser console (F12)
- Update ALLOWED_ORIGINS in server/.env
- Restart backend

---

### Issue: "Failed to fetch" Error

**Cause:** Frontend can't reach backend

**Solution:**
1. Check `.env` has correct IP:
   ```env
   REACT_APP_API_BASE=http://192.168.1.100:5000
   ```
2. Restart frontend: `npm start`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try again

---

### Issue: Real-Time Updates Not Working

**Cause:** Socket.IO connection blocked

**Solution:**
1. Check backend CORS includes client IP
2. Check firewall allows port 5000
3. Check browser console for Socket.IO errors

---

### Issue: IP Address Changes

**Cause:** DHCP assigns new IP after restart

**Solutions:**

**Option A: Reserve IP (Recommended)**
1. Open router admin (usually http://192.168.1.1)
2. Find DHCP settings
3. Create "DHCP Reservation" for server PC's MAC address
4. Assign permanent IP (e.g., 192.168.1.100)

**Option B: Static IP**
1. Open Network Settings
2. Set manual IP: 192.168.1.100
3. Subnet mask: 255.255.255.0
4. Gateway: 192.168.1.1
5. DNS: 8.8.8.8

**Option C: Update and Restart**
- Get new IP with `ipconfig`
- Update `.env` files
- Restart servers
- Tell users new URL

---

## Network Topology

```
┌─────────────────────────────────────┐
│  Your Local Network (192.168.1.x)  │
├─────────────────────────────────────┤
│                                     │
│  🖥️ SERVER PC (192.168.1.100)     │
│    ├─ Backend:  Port 5000          │
│    └─ Frontend: Port 3000          │
│                                     │
│  💻 CLIENT PC #1 (192.168.1.101)   │
│    └─ Browser → :100:3000          │
│                                     │
│  💻 CLIENT PC #2 (192.168.1.102)   │
│    └─ Browser → :100:3000          │
│                                     │
│  📱 Tablet (192.168.1.103)         │
│    └─ Browser → :100:3000          │
│                                     │
└─────────────────────────────────────┘
```

---

## Security Considerations

### Development (Testing)
✅ Use specific IPs in ALLOWED_ORIGINS  
✅ Local network only (192.168.x.x)  
✅ Windows Firewall enabled  

### Production (Real Use)
✅ Use specific IPs (not `*`)  
✅ Enable HTTPS (SSL certificates)  
✅ Use PostgreSQL with password  
✅ Change JWT_SECRET  
✅ Create firewall rules per IP  
✅ Disable unused user accounts  

---

## Performance Tips

**How many users can connect?**
- **SQLite:** 5-10 simultaneous users (with occasional write locks)
- **PostgreSQL:** 50+ users easily

**Optimize Performance:**
1. Use PostgreSQL for more than 5 users
2. Run on Windows/Linux server machine (not a laptop)
3. Use wired Ethernet (faster than WiFi)
4. Close unused programs on server

---

## Mobile Access (Phones/Tablets)

**Same steps, but:**

1. Connect mobile device to same WiFi
2. Open browser on phone
3. Go to: `http://192.168.1.100:3000`
4. Login normally

**Mobile-Friendly:**
- Responsive design works on phones
- Touch-friendly buttons
- Scrollable tables

---

## External Access (Outside Your Network)

**NOT COVERED IN THIS GUIDE**

For internet access (outside your office):
- Need port forwarding on router
- Need dynamic DNS or static IP
- Strongly recommend HTTPS
- Security concerns increase significantly

See POSTGRESQL_SETUP.md for cloud hosting options.

---

## Quick Reference Card

**Print this for users:**

```
┌────────────────────────────────────┐
│   DMS Access Information           │
├────────────────────────────────────┤
│                                    │
│  URL: http://192.168.1.100:3000   │
│       (from any PC on network)     │
│                                    │
│  Login:                            │
│    • Username: (ask admin)         │
│    • Password: password            │
│                                    │
│  Need Help?                        │
│    • Server down? Ask admin        │
│    • Can't connect? Check WiFi     │
│    • Forgot password? Contact IT   │
│                                    │
└────────────────────────────────────┘
```

---

## Testing Checklist

Before sharing with team:

- [ ] Found server IP address (Step 1)
- [ ] Updated server/.env ALLOWED_ORIGINS (Step 2)
- [ ] Updated .env REACT_APP_API_BASE (Step 4)
- [ ] Allowed through Windows Firewall (Step 3)
- [ ] Backend started successfully (port 5000)
- [ ] Frontend started successfully (port 3000)
- [ ] Tested from server PC (localhost:3000)
- [ ] Tested from another PC (192.168.1.100:3000)
- [ ] Verified real-time updates work
- [ ] Tested with 2+ simultaneous users
- [ ] Created user accounts for team
- [ ] Shared access URL with team

---

## Support

**Common Questions:**

**Q: Do all users need to install Node.js?**  
A: NO! Only the server PC. Clients just need a web browser.

**Q: Can users access from home?**  
A: Not with this setup. This is LAN only (same network).

**Q: What if server PC is turned off?**  
A: System is unavailable. Keep server running during work hours.

**Q: Can I use a laptop as server?**  
A: Yes, but keep it plugged in and prevent sleep mode.

**Q: How to prevent sleep mode?**  
A: Settings → System → Power & Sleep → Never

---

**Setup Time:** ~10-15 minutes  
**Difficulty:** Easy (Basic)  
**Cost:** FREE  

---

**Ready to share with your team!** 🎉
