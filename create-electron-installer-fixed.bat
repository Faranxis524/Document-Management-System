@echo off
REM Simple Electron Build - With automatic cleanup

echo ================================================
echo    DMS Standalone Installer Creator (Fixed)
echo ================================================
echo.

REM Step 0: Clean up first
echo [0/5] Cleaning previous builds...
if exist "release" (
    rmdir /s /q "release" 2>nul
    timeout /t 2 /nobreak >nul
)
if exist "dist" (
    rmdir /s /q "dist" 2>nul
)

REM Make sure no node processes are running
echo Stopping any running DMS instances...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Check if electron is installed
echo [1/5] Checking Electron...
call npm list electron >nul 2>&1
if errorlevel 1 (
    echo Installing Electron and Electron Builder...
    call npm install --save-dev electron@latest electron-builder@latest
    if errorlevel 1 (
        echo ERROR: Failed to install Electron!
        pause
        exit /b 1
    )
)

REM Build React app  
echo [2/5] Building React app...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

REM Install server dependencies if needed
echo [3/5] Checking server dependencies...
cd server
if not exist "node_modules" (
    echo Installing server dependencies...
    call npm install
)
cd ..

REM Build Electron installer with better error handling
echo [4/5] Creating installer (.exe)...
echo This may take 5-10 minutes...
echo.

set ELECTRON_BUILDER_CACHE=%TEMP%\electron-builder-cache
call npm run dist

if errorlevel 1 (
    echo.
    echo ================================================
    echo    Build Failed - Troubleshooting
    echo ================================================
    echo.
    echo Common fixes:
    echo  1. Close ALL DMS windows
    echo  2. Run: fix-electron-build.bat
    echo  3. Restart your computer
    echo  4. Try again
    echo.
    echo Or use the Basic Package instead:
    echo    create-transfer-package.bat
    echo.
    pause
    exit /b 1
)

echo [5/5] Verifying installer...
if exist "release\*.exe" (
    echo.
    echo ================================================
    echo    SUCCESS! Installer Created!
    echo ================================================
    echo.
    echo Location: %~dp0release\
    echo.
    echo Transfer the .exe file to any Windows computer.
    echo No dependencies needed on the target computer!
    echo.
    pause
    explorer "%~dp0release"
) else (
    echo.
    echo ERROR: Installer not found!
    echo Something went wrong. Try the basic package instead:
    echo    create-transfer-package.bat
    echo.
    pause
    exit /b 1
)
