@echo off
REM Create a standalone Electron installer - NO dependencies needed on target PC!

echo ================================================
echo    DMS Standalone Installer Creator
echo ================================================
echo.
echo This creates a .exe installer that includes EVERYTHING.
echo The target computer needs NOTHING installed - no Node.js, nothing!
echo.
echo This will take 10-15 minutes...
echo.
pause

REM Check if electron is installed
echo [1/4] Checking Electron...
call npm list electron >nul 2>&1
if errorlevel 1 (
    echo Installing Electron and Electron Builder...
    call npm install --save-dev electron electron-builder
    if errorlevel 1 (
        echo ERROR: Failed to install Electron!
        pause
        exit /b 1
    )
)

REM Update package.json with electron config
echo [2/4] Configuring Electron...
node -e "const fs=require('fs');const pkg=JSON.parse(fs.readFileSync('package.json'));pkg.main='electron.js';pkg.scripts.electron='electron .';pkg.scripts.dist='npm run build && electron-builder';pkg.build={appId:'com.dms.app',productName:'DMS',directories:{output:'release'},win:{target:['nsis'],icon:'public/favicon.ico'},files:['build/**/*','server/**/*','electron.js','package.json'],extraResources:[{from:'server/data',to:'server/data',filter:['**/*']}]};fs.writeFileSync('package.json',JSON.stringify(pkg,null,2));"

REM Build React app
echo [3/4] Building React app...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

REM Build Electron installer
echo [4/4] Creating installer (.exe)...
echo This may take several minutes...
call npm run dist
if errorlevel 1 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo.
echo ================================================
echo    SUCCESS! Installer Created!
echo ================================================
echo.
echo Location: %~dp0release\
echo.
echo Find the .exe installer in the release folder.
echo Transfer ONLY that .exe file to any Windows computer.
echo.
echo No Node.js, no setup, just double-click and install!
echo.
pause

explorer "%~dp0release"
