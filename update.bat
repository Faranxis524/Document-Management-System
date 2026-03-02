@echo off
REM ============================================================
REM  DMS Web-Mode Update Script (no EXE rebuild needed)
REM
REM  Run this on the SERVER machine whenever you pull new code.
REM  Clients just refresh their browser – nothing to reinstall.
REM ============================================================

echo ============================================================
echo   DMS - Updating to latest version
echo ============================================================
echo.

REM Pull latest code from Git (if this is a Git checkout)
where git >nul 2>&1
if not errorlevel 1 (
    echo [1/4] Pulling latest code...
    git pull
    if errorlevel 1 (
        echo WARNING: git pull failed – continuing with local code.
    )
    echo.
) else (
    echo [1/4] git not found – skipping pull.
    echo.
)

REM Install / update frontend dependencies
echo [2/4] Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.

REM Build the React frontend
echo [3/4] Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.

REM Install / update server dependencies
echo [4/4] Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo ERROR: Server npm install failed!
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

echo ============================================================
echo   Update complete!
echo ============================================================
echo.
echo Restart the server to apply changes:
echo   Run start-dms-production.bat
echo.
echo All clients will see the new version on their next page refresh.
echo No EXE rebuild or redistribution needed.
echo.
pause
