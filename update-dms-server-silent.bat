@echo off
setlocal

cd /d "%~dp0"

set "LOG_DIR=%~dp0logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "LOG_FILE=%LOG_DIR%\update-%STAMP%.log"

echo ========================================
echo    DMS Silent Update
echo ========================================
echo Please wait. This can take a few minutes...
echo Log file: %LOG_FILE%
echo.

where node >nul 2>nul
if errorlevel 1 (
    > "%LOG_FILE%" echo ERROR: Node.js is not installed.
    echo Update failed: Node.js not found.
    echo See log: %LOG_FILE%
    pause
    exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
    > "%LOG_FILE%" echo ERROR: Git is not installed.
    echo Update failed: Git not found.
    echo See log: %LOG_FILE%
    pause
    exit /b 1
)

(
    echo ========================================
    echo DMS Update Log
    echo Started: %date% %time%
    echo ========================================
    echo.

    echo [1/5] git pull --ff-only origin main
    git pull --ff-only origin main
    if errorlevel 1 goto :pull_failed

    echo.
    echo [2/5] npm install (frontend)
    call npm install --no-audit --no-fund
    if errorlevel 1 goto :frontend_failed

    echo.
    echo [3/5] npm install (backend)
    cd server
    call npm install --no-audit --no-fund
    if errorlevel 1 goto :backend_failed
    cd ..

    echo.
    echo [4/5] npm run build
    call npm run build
    if errorlevel 1 goto :build_failed

    echo.
    echo [5/5] Restarting DMS Production window
    taskkill /FI "WINDOWTITLE eq DMS Production*" /T /F >nul 2>nul
    timeout /t 2 /nobreak >nul

    cd server
    start "DMS Production" cmd /k "npm start"
    cd ..

    echo.
    echo ========================================
    echo RESULT: SUCCESS
    echo Finished: %date% %time%
    echo ========================================
    goto :success

    :pull_failed
    echo.
    echo RESULT: FAILED at git pull
    goto :failed

    :frontend_failed
    echo.
    echo RESULT: FAILED at frontend npm install
    goto :failed

    :backend_failed
    cd ..
    echo.
    echo RESULT: FAILED at backend npm install
    goto :failed

    :build_failed
    echo.
    echo RESULT: FAILED at npm run build
    goto :failed

    :failed
    echo Finished: %date% %time%
) > "%LOG_FILE%" 2>&1

echo Update failed.
echo Please send this log file to developer:
echo %LOG_FILE%
echo.
pause
exit /b 1

:success
echo Update complete.
echo DMS is running with the latest version.
echo URL: http://10.163.253.16:5000
echo.
echo Log saved at:
echo %LOG_FILE%
echo.
pause
exit /b 0
