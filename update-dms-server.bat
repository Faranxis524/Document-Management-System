@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo    DMS - One-Click Server Update
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Install Node.js LTS first: https://nodejs.org
    echo.
    pause
    exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
    echo ERROR: Git is not installed.
    echo Install Git first: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo [1/5] Pulling latest changes from main...
git pull --ff-only origin main
if errorlevel 1 (
    echo.
    echo ERROR: Git pull failed.
    echo Please check internet/VPN connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/5] Installing frontend dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo.
    echo ERROR: Frontend dependency install failed.
    echo.
    pause
    exit /b 1
)

echo.
echo [3/5] Installing backend dependencies...
cd server
call npm install --no-audit --no-fund
if errorlevel 1 (
    cd ..
    echo.
    echo ERROR: Backend dependency install failed.
    echo.
    pause
    exit /b 1
)
cd ..

echo.
echo [4/5] Building production frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: Build failed.
    echo.
    pause
    exit /b 1
)

echo.
echo [5/5] Restarting DMS production server...
taskkill /FI "WINDOWTITLE eq DMS Production*" /T /F >nul 2>nul
timeout /t 2 /nobreak >nul

cd /d "%~dp0server"
start "DMS Production" cmd /k "npm start"
cd /d "%~dp0"

echo.
echo ========================================
echo    Update Complete
echo ========================================
echo DMS is now running with the latest version.
echo Open: http://localhost:5000
echo      or http://10.163.253.16:5000
echo.
pause

endlocal