@echo off
REM DMS Installation Script for New Computer
echo ================================================
echo    DMS Installation
echo ================================================
echo.
echo This will install all dependencies.
echo Make sure Node.js is installed first!
echo.
pause

echo Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Frontend installation failed!
    echo Make sure Node.js is installed!
    pause
    exit /b 1
)

echo Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo ERROR: Server installation failed!
    pause
    exit /b 1
)
cd ..

echo ================================================
echo    Installation Complete!
echo ================================================
echo.
echo To run DMS:
echo   Double-click START-DMS.bat
echo.
echo To access:
echo   Open browser to http://localhost:5000
echo.
pause
