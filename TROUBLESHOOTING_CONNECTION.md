# Connection Troubleshooting Guide

## "This site cannot provide secure connection" Error

### Step 1: Check the URL Format
Make sure you're using HTTP (not HTTPS):
- ✅ **Use**: `http://10.42.11.207:5000`
- ❌ **Don't use**: `https://10.42.11.207:5000`

### Step 2: Verify ZeroTier on Other Device

**On the device that can't connect:**

1. **Check ZeroTier is installed and running**
   - Windows: Check system tray for ZeroTier icon
   - Look for the network icon

2. **Verify ZeroTier connection**
   - Open ZeroTier One
   - Make sure you're connected to the same network
   - Check your IP address (should be 10.42.11.xxx)

3. **Test connectivity**
   ```powershell
   # Ping the server
   ping 10.42.11.207
   
   # Test the port
   Test-NetConnection -ComputerName 10.42.11.207 -Port 5000
   ```

### Step 3: Alternative - Use Local Network IP

If ZeroTier isn't working, use your local network IP instead:

1. **On the server computer**, find your local IP:
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" (usually 192.168.x.x)

2. **On other devices**, use that IP:
   - Example: `http://192.168.254.193:5000`

### Step 4: Disable Browser HTTPS Forcing

Some browsers automatically upgrade to HTTPS:

**Chrome/Edge:**
1. Type in address bar: `chrome://net-internals/#hsts`
2. Scroll to "Delete domain security policies"
3. Enter: `10.42.11.207`
4. Click "Delete"

**Firefox:**
1. Type in address bar: `about:config`
2. Search for: `dom.security.https_only_mode`
3. Set to: `false`

### Step 5: Check Windows Firewall

**On the server computer:**

```powershell
# Check if port 5000 is open
netstat -an | findstr :5000

# Allow port 5000 through firewall (if needed)
New-NetFirewallRule -DisplayName "DMS Server" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### Step 6: Browser Cache

Try these in order:
1. **Hard refresh**: Ctrl + Shift + R
2. **Clear browser cache**
3. **Try incognito/private mode**
4. **Try a different browser**

## Quick Test Checklist

From the device that can't connect:

- [ ] Using `http://` not `https://`
- [ ] ZeroTier is running and connected
- [ ] Can ping 10.42.11.207
- [ ] Port 5000 is reachable
- [ ] Tried clearing browser cache
- [ ] Tried different browser

## Alternative Access Methods

### Method 1: ZeroTier IP (Best for remote access)
```
http://10.42.11.207:5000
```

### Method 2: Local Network IP (Same WiFi/LAN)
```
http://192.168.254.193:5000
```

### Method 3: Localhost (Only on server computer)
```
http://localhost:5000
```

## Still Not Working?

### Check Server is Running
On the server computer:
```powershell
# Make sure the server is running
node server/index.js
```

You should see:
```
API listening on 0.0.0.0:5000
Access from network: http://192.168.254.193:5000
```

### Network Test Script
Create a test file `test-connection.ps1`:

```powershell
Write-Host "Testing DMS Server Connection..." -ForegroundColor Cyan

# Test ZeroTier IP
Write-Host "`nTesting ZeroTier IP (10.42.11.207)..." -ForegroundColor Yellow
Test-NetConnection -ComputerName 10.42.11.207 -Port 5000 -InformationLevel Detailed

# Test Local Network IP
Write-Host "`nTesting Local Network IP (192.168.254.193)..." -ForegroundColor Yellow
Test-NetConnection -ComputerName 192.168.254.193 -Port 5000 -InformationLevel Detailed

# Try HTTP Request
Write-Host "`nTrying HTTP Request..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://10.42.11.207:5000" -UseBasicParsing -Method Head -TimeoutSec 5
    Write-Host "✅ Server is reachable! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot reach server: $($_.Exception.Message)" -ForegroundColor Red
}
```

Run it from the device having issues:
```powershell
.\test-connection.ps1
```
