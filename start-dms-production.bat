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
echo Backend + Frontend: http://10.163.253.16:5000
echo.

REM Start the server
cd /d %~dp0server
start "DMS Production" cmd /k "npm start"

echo.
echo ===========================================
echo DMS is starting in production mode...
echo.
echo Open your browser to: http://10.163.253.16:5000
echo.
echo Keep the server window open while using DMS.
echo ===========================================
echo.
pause
