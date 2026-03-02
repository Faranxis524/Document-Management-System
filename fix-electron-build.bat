@echo off
REM Fix Electron Build Issues - Clean locked files

echo ================================================
echo    DMS Electron Build Fix
echo ================================================
echo.
echo This will clean up locked build files.
echo.

REM Step 1: Close any running DMS processes
echo [1/4] Checking for running DMS processes...
tasklist /FI "WINDOWTITLE eq DMS*" 2>nul | find /I "cmd.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo Found running DMS processes. Please close all DMS windows.
    echo.
    echo Close these windows:
    echo  - DMS Backend
    echo  - DMS Frontend  
    echo  - DMS Production
    echo.
    pause
)

REM Step 2: Kill any node processes that might be locking files
echo [2/4] Cleaning up node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Step 3: Remove the locked directories
echo [3/4] Removing old build files...
if exist "release" (
    echo Removing release folder...
    rmdir /s /q "release" 2>nul
    timeout /t 2 /nobreak >nul
    
    REM If still locked, try harder
    if exist "release" (
        echo Folder still locked, trying alternative method...
        rd /s /q "release" 2>nul
        timeout /t 3 /nobreak >nul
    )
)

if exist "dist" (
    echo Removing dist folder...
    rmdir /s /q "dist" 2>nul
)

REM Step 4: Clean npm cache for electron
echo [4/4] Cleaning Electron cache...
if exist "%LOCALAPPDATA%\electron\Cache" (
    rmdir /s /q "%LOCALAPPDATA%\electron\Cache" 2>nul
)

echo.
echo ================================================
echo    Cleanup Complete!
echo ================================================
echo.

REM Check if release folder was successfully deleted
if exist "release" (
    echo WARNING: Release folder still exists.
    echo.
    echo Please do this manually:
    echo  1. Close ALL command prompt windows
    echo  2. Close ALL Node.js processes in Task Manager
    echo  3. Delete the 'release' folder manually
    echo  4. Restart your computer if needed
    echo  5. Run create-electron-installer.bat again
    echo.
    echo Or try: Restart your computer now and run again.
    pause
    exit /b 1
) else (
    echo Success! Ready to build again.
    echo.
    echo Run create-electron-installer.bat again.
    echo.
)

pause
