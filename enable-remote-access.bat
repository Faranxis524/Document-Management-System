@echo off
REM Enable DMS Remote Access via Port Forwarding
REM Run as Administrator

echo ================================================
echo    DMS Remote Access Setup  
echo ================================================
echo.
echo This will configure Windows Firewall to allow
echo remote access to your DMS from other WiFi networks.
echo.
echo After this, you need to:
echo  1. Setup port forwarding on your router
echo  2. Use your public IP to access DMS
echo.
pause

echo.
echo [1/2] Adding Windows Firewall rule...
netsh advfirewall firewall add rule name="DMS Remote Access" dir=in action=allow protocol=TCP localport=5000

if errorlevel 1 (
    echo.
    echo ERROR: Failed to add firewall rule!
    echo Please run this script as Administrator:
    echo  1. Right-click this file
    echo  2. Click "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [2/2] Getting your network information...
echo.
echo ================================================
echo    Your Network Information
echo ================================================
echo.

echo Local IP (this computer on your network):
ipconfig | findstr "IPv4"

echo.
echo Public IP (to access from outside):
echo Visit: https://whatismyipaddress.com
echo.

echo ================================================
echo    Next Steps
echo ================================================
echo.
echo 1. Login to your router (usually http://192.168.1.1)
echo.
echo 2. Find "Port Forwarding" or "Virtual Server"
echo.
echo 3. Add rule:
echo    Name: DMS
echo    External Port: 5000
echo    Internal IP: [your local IP from above]
echo    Internal Port: 5000
echo    Protocol: TCP
echo.
echo 4. Access DMS from anywhere:
echo    http://[your-public-ip]:5000
echo.
echo ================================================
echo.
pause
