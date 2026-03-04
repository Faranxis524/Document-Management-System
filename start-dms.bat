@echo off
REM DMS Auto-Start Script
REM Run this batch file to start both frontend and backend servers

echo Starting DMS servers...
echo.

REM Start backend server in new window
start "DMS Backend" cmd /k "cd /d %~dp0server && npm start"

REM Wait 5 seconds for backend to initialize
timeout /t 5 /nobreak >nul

REM Start frontend server in new window
start "DMS Frontend" cmd /k "cd /d %~dp0 && npm start"

echo.
echo DMS servers are starting...
echo Backend: http://10.163.253.16:5000
echo Frontend: http://localhost:3000
echo.
echo Keep both windows open while using the system.
echo Close this window if you want.
pause
