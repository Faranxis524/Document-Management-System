# ZeroTier Setup Guide - Step by Step
## Access Your DMS from Anywhere Securely!

This guide will help you set up ZeroTier VPN so you can access your DMS from any WiFi network (home, mobile data, coffee shop, etc.)

**Time needed:** 10-15 minutes  
**Cost:** FREE  
**Result:** Secure access to DMS from anywhere on any device!

---

## 📋 What You'll Need

- [ ] DMS computer (this computer)
- [ ] Device to access from (laptop, phone, tablet, etc.)
- [ ] Internet connection on both devices
- [ ] Email address (for free ZeroTier account)

---

## PART 1: Setup on DMS Computer (This Computer)

### Step 1: Create ZeroTier Account

1. **Open your web browser**

2. **Go to:** https://www.zerotier.com

3. **Click "Sign Up" (top right corner)**

4. **Create your free account:**
   - Enter your email address
   - Create a password
   - Click "Sign Up"

5. **Check your email and verify your account**
   - Click the verification link in the email

6. **Login to ZeroTier Central**
   - You'll be taken to: https://my.zerotier.com

---

### Step 2: Create Your Private Network

1. **In ZeroTier Central, click "Create A Network"**
   - This creates your private VPN network

2. **You'll see a new network appear with:**
   - Network ID (16 characters like: `abc123def456ghij`)
   - Network Name (you can change this)

3. **Click on the Network ID** to open network settings

4. **Configure your network:**

   **Network Name:** Change it to something memorable
   ```
   My DMS Network
   ```

   **Access Control:** Make sure it says "PRIVATE"
   ```
   ✓ PRIVATE (recommended - you approve each device)
   ```

   **IPv4 Auto-Assign:** Should be checked ✓
   ```
   ✓ Auto-Assign from Range
   ```

5. **Important: Copy your Network ID!**
   ```
   Example: abc123def456ghij
   ```
   Write it down or keep the browser tab open - you'll need this!

---

### Step 3: Install ZeroTier on DMS Computer

1. **Download ZeroTier:**
   - Go to: https://www.zerotier.com/download/
   - Click **"Download for Windows"**
   - File downloads: `ZeroTier One.msi`

2. **Install ZeroTier:**
   - Double-click `ZeroTier One.msi`
   - Click "Next"
   - Accept the license agreement
   - Click "Install"
   - **If Windows asks "Do you want to allow this app?"** → Click "Yes"
   - Click "Finish"

3. **ZeroTier is now installed!**
   - Look in system tray (bottom-right corner near clock)
   - You should see a small ZeroTier icon (looks like a network node)

---

### Step 4: Join Your Network (DMS Computer)

1. **Right-click the ZeroTier icon** in system tray

2. **Click "Join Network..."**

3. **Enter your Network ID:**
   ```
   abc123def456ghij  (your actual Network ID)
   ```

4. **Click "Join"**

5. **A notification appears:**
   ```
   "Joined Network [Network ID]"
   "Waiting for approval..."
   ```

---

### Step 5: Approve DMS Computer in Network

1. **Go back to your browser** (ZeroTier Central dashboard)

2. **Scroll down to "Members" section**
   - You should see a new device listed!
   - Shows: Address, Name, and a checkbox

3. **Check the box under "Auth?"** to approve this device
   ```
   ✓ Check this box
   ```

4. **The device is now approved!**
   - Status changes to "ONLINE"
   - You'll see an IP address assigned (like `10.147.18.x`)

5. **Important: Copy this IP address!**
   ```
   Example: 10.147.18.123
   ```
   This is your DMS computer's ZeroTier IP!

---

### Step 6: Test Local Connection

1. **Right-click ZeroTier icon** in system tray

2. **Click on your network name**
   - Should show as "Connected"
   - Shows your ZeroTier IP

3. **Open browser and test:**
   ```
   http://localhost:5000
   ```
   Your DMS should load normally ✓

---

## PART 2: Setup on Your Home/Remote Computer

### Step 7: Install ZeroTier on Remote Device

**On Windows Laptop/PC:**

1. **Download ZeroTier:**
   - Go to: https://www.zerotier.com/download/
   - Click "Download for Windows"

2. **Install (same as Step 3 above)**

**On Mac:**

1. Go to: https://www.zerotier.com/download/
2. Click "Download for Mac"
3. Open the .pkg file and install

**On Android Phone:**

1. Open Google Play Store
2. Search: "ZeroTier One"
3. Install the app

**On iPhone:**

1. Open App Store
2. Search: "ZeroTier One"
3. Install the app

---

### Step 8: Join Network from Remote Device

**On Windows/Mac:**

1. **Right-click ZeroTier icon** in system tray
2. **Click "Join Network..."**
3. **Enter the same Network ID** you used before
4. Click "Join"

**On Phone (Android/iPhone):**

1. **Open ZeroTier One app**
2. **Tap the "+" button** (Add Network)
3. **Enter your Network ID**
4. Tap "Add Network"

---

### Step 9: Approve Remote Device

1. **Go back to browser** (ZeroTier Central)
   - https://my.zerotier.com
   - Click on your network

2. **Scroll to "Members"**
   - You should now see TWO devices:
     - Your DMS computer (already approved ✓)
     - Your new device (waiting for approval)

3. **Check the box to approve** the new device
   ```
   ✓ Check the box under "Auth?"
   ```

4. **Device is now connected!**
   - Shows "ONLINE"
   - Gets its own ZeroTier IP (like `10.147.18.124`)

---

### Step 10: Access DMS from Remote Device!

1. **Make sure DMS is running** on your office computer
   - Run `start-dms-production.bat` or `START-DMS.bat`

2. **On your remote device, open browser**

3. **Navigate to:**
   ```
   http://10.147.18.123:5000
   ```
   (Use the ZeroTier IP from Step 5!)

4. **🎉 Your DMS loads!**
   - Even though you're on different WiFi!
   - Secure encrypted connection!

---

## 🔧 Configuration for Better Experience

### Optional: Give Devices Friendly Names

1. **In ZeroTier Central > Members section**

2. **Click on the "Name" field** for each device

3. **Rename them:**
   ```
   Office-DMS-Computer
   My-Home-Laptop
   My-Phone
   ```

Now you can identify which device is which!

---

### Optional: Set Static IP for DMS

1. **In ZeroTier Central, find your DMS computer**

2. **Look for its ZeroTier IP** (like `10.147.18.123`)

3. **Click the IP address** and add it to "Managed IPs"
   - This ensures it keeps the same IP always

---

## 📱 Using DMS from Your Phone

### On Mobile Browser:

1. **Connect to ZeroTier network** (from Step 8-9)

2. **Open browser (Chrome/Safari)**

3. **Type:**
   ```
   http://10.147.18.123:5000
   ```

4. **Your DMS works on mobile!**
   - Login with your username/password
   - View and manage documents
   - Upload files

---

## ✅ Final Checklist

After completing all steps:

- [ ] ZeroTier account created
- [ ] Network created and Network ID saved
- [ ] ZeroTier installed on DMS computer
- [ ] DMS computer joined network and approved
- [ ] ZeroTier IP address for DMS noted down
- [ ] ZeroTier installed on remote device
- [ ] Remote device joined network and approved
- [ ] Successfully accessed DMS from remote device!

---

## 🎯 Quick Reference Card

**Save this information:**

```
═══════════════════════════════════════
  MY DMS REMOTE ACCESS INFO
═══════════════════════════════════════

ZeroTier Network ID: ___________________
                    (16 characters)

DMS ZeroTier IP: ________________________
                 (example: 10.147.18.123)

DMS Access URL: http://[ZeroTier-IP]:5000

Login: https://my.zerotier.com

═══════════════════════════════════════
```

---

## 🔄 Daily Use

### To Access DMS from Home/Anywhere:

1. **On DMS computer (office):**
   - Make sure ZeroTier is running (auto-starts with Windows)
   - Start DMS: `START-DMS.bat`

2. **On your remote device:**
   - Make sure ZeroTier is connected
   - Open browser: `http://[DMS-ZeroTier-IP]:5000`
   - Done!

**Pro tip:** Bookmark the URL on all your devices!

---

## 🆘 Troubleshooting

### Problem: "Cannot connect to network"

**Solution:**
1. Check ZeroTier icon - should show as connected
2. Right-click icon → click on network name
3. Make sure it says "Connected"
4. If not, try:
   - Leave network
   - Join again with Network ID
   - Approve in ZeroTier Central

---

### Problem: "DMS not loading"

**Solution:**
1. **Check if DMS is running on office computer**
   ```
   Run: START-DMS.bat
   ```

2. **Verify ZeroTier IP is correct**
   - Check in ZeroTier Central > Members
   - Use the correct IP in URL

3. **Test on DMS computer first**
   ```
   http://localhost:5000  (should work)
   http://[ZeroTier-IP]:5000  (should also work)
   ```

---

### Problem: "Can't see device in Members"

**Solution:**
1. Make sure ZeroTier is running (check system tray)
2. Right-click ZeroTier → verify network is joined
3. Refresh browser on ZeroTier Central
4. Wait 30 seconds - can take time to appear
5. Try leaving and rejoining network

---

### Problem: "Page takes too long to load"

**Solution:**
1. Check internet connection on both devices
2. ZeroTier needs internet to work
3. Close and reopen browser
4. Check if DMS is responding on office computer locally

---

## 🔒 Security Notes

✅ **Your connection is:**
- Encrypted end-to-end
- Private (only approved devices can join)
- Secure as a corporate VPN

✅ **Best practices:**
- Don't share your Network ID publicly
- Only approve devices you own
- Remove old devices from network
- Use strong DMS login passwords

---

## 💡 Bonus Tips

### Auto-Start DMS with Windows

So you never have to manually start it:

```powershell
.\setup-autostart.ps1
```

(Run as Administrator - from your DMS folder)

---

### Add to Mobile Home Screen (Phone)

**On Android:**
1. Open DMS in Chrome
2. Menu (⋮) → "Add to Home screen"
3. Now opens like an app!

**On iPhone:**
1. Open DMS in Safari
2. Share button → "Add to Home Screen"
3. Now opens like an app!

---

### Monitor Network Status

**ZeroTier Central Dashboard shows:**
- Which devices are online
- When they last connected
- How much data transferred
- Connection status

Check anytime at: https://my.zerotier.com

---

## 📞 Support

**ZeroTier Support:**
- Documentation: https://docs.zerotier.com
- Community: https://discuss.zerotier.com

**Your DMS:**
- Check other guides in the DMS folder
- `QUICK_START.md`
- `TRANSFER_GUIDE.md`
- `REMOTE_ACCESS_GUIDE.md`

---

## 🎉 You're All Set!

You can now access your DMS from:
- ✅ Your home
- ✅ Mobile phone
- ✅ Any laptop
- ✅ Any WiFi network
- ✅ Mobile data
- ✅ Anywhere in the world!

**All connections are secure and encrypted!** 🔒

---

**Start with Part 1 on this computer, then do Part 2 on your home device!**
