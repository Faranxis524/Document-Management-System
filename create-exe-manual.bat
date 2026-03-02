@echo off
REM CREATE EXE - Manual Delete Version

echo ================================================
echo    Create .EXE Installer
echo ================================================
echo.
echo STEP 1: Delete the release folder MANUALLY
echo.
echo Please do this NOW:
echo  1. Open File Explorer (it should already be open)
echo  2. Find the "release" folder
echo  3. Right-click it -^> Delete
echo  4. If it won't delete, close ALL command windows first
echo     then try again
echo.
pause
echo.

REM Check if deleted
if exist "release" (
    echo ERROR: Release folder still exists!
    echo.
    echo Try this:
    echo  1. Close ALL command/PowerShell windows
    echo  2. Delete the release folder in File Explorer
    echo  3. Restart your computer if needed
    echo  4. Run this script again
    echo.
    pause
    exit /b 1
)

echo Good! Release folder deleted.
echo.
echo ================================================
echo    Building .EXE Installer
echo ================================================
echo.

REM Check if electron is installed
echo [1/4] Checking Electron...
call npm list electron >nul 2>&1
if errorlevel 1 (
    echo Installing Electron...
    call npm install --save-dev electron@latest electron-builder@latest
    if errorlevel 1 (
        echo ERROR: Failed to install Electron!
        pause
        exit /b 1
    )
)

echo [2/4] Building React app...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo [3/4] Installing server dependencies...
cd server
if not exist "node_modules" (
    call npm install
)
cd ..

echo [4/4] Creating .EXE installer...
echo This takes 5-10 minutes. Please wait...
echo.

call npm run dist

if errorlevel 1 (
    echo.
    echo ERROR: Electron build failed!
    echo.
    echo Try:
    echo  1. Restart computer
    echo  2. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo    SUCCESS! .EXE Created!
echo ================================================
echo.

explorer "release"

pause
