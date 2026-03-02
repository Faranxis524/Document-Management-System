@echo off
REM DMS Production Mode - Single Server Startup
REM This runs DMS with the built frontend served by the backend

echo ========================================
echo    DMS - Production Mode
echo ========================================
echo.

REM Check if build folder exists
if not exist "%~dp0build" (
    echo ERROR: Build folder not found!
    echo.
    echo Please build the frontend first:
    echo   npm run build
    echo.
    pause
    exit /b 1
)

echo Starting DMS Production Server...
echo.

REM Add Windows Firewall rule so other devices on the network can connect.
REM This is a no-op if the rule already exists (netsh silently succeeds).
netsh advfirewall firewall show rule name="DMS Server Port 5000" >nul 2>&1
if errorlevel 1 (
    echo Adding Windows Firewall rule for port 5000...
    netsh advfirewall firewall add rule name="DMS Server Port 5000" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
    if errorlevel 1 (
        echo WARNING: Could not add firewall rule automatically.
        echo If other devices cannot connect, run this script as Administrator
        echo or run enable-remote-access.bat as Administrator.
        echo.
    ) else (
        echo Firewall rule added successfully.
        echo.
    )
)

REM Detect local network IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    set NETWORK_IP=%%a
    goto :found_ip
)
:found_ip
REM Trim leading space from IP
set NETWORK_IP=%NETWORK_IP: =%

echo Backend + Frontend: http://localhost:5000
if defined NETWORK_IP (
    echo Network access:     http://%NETWORK_IP%:5000
)
echo.

REM Start the server
cd /d %~dp0server
start "DMS Production" cmd /k "npm start"

echo.
echo ===========================================
echo DMS is starting in production mode...
echo.
echo Open your browser to: http://localhost:5000
if defined NETWORK_IP (
    echo Other devices use:   http://%NETWORK_IP%:5000
)
echo.
echo Keep the server window open while using DMS.
echo ===========================================
echo.
pause
