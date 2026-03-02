@echo off
echo Adding Windows Firewall rule for DMS ZeroTier access...
echo.

powershell -Command "New-NetFirewallRule -DisplayName 'DMS ZeroTier Access' -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Any"

echo.
echo Firewall rule added successfully!
echo You can now access DMS from your ZeroTier network at: http://10.42.11.207:5000
echo.
pause
