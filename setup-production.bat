@echo off
REM Complete DMS Setup for Production Mode
REM Run this once to set up everything

echo ================================================
echo    DMS - One-Time Production Setup
echo ================================================
echo.
echo This will:
echo  1. Install all dependencies
echo  2. Build the production version
echo  3. Create desktop shortcut
echo.
pause

echo.
echo [1/3] Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo ERROR: Server installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [3/3] Building production version...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ================================================
echo    SUCCESS! Setup Complete
echo ================================================
echo.
echo Next steps:
echo  1. Double-click: start-dms-production.bat
echo  2. Open browser to: http://localhost:5000
echo.
echo Optional:
echo  - Create desktop shortcut to start-dms-production.bat
echo  - Run setup-autostart.ps1 for auto-start with Windows
echo.
pause
