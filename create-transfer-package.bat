@echo off
REM Create a transfer package for moving DMS to another computer
REM This packages everything needed except node_modules (will be installed on new computer)

echo ================================================
echo    DMS Transfer Package Creator
echo ================================================
echo.
echo This will create a portable package of your DMS
echo that can be transferred to another computer.
echo.

REM Check if build exists
if not exist "build" (
    echo Building production version first...
    call npm run build
    if errorlevel 1 (
        echo ERROR: Build failed!
        pause
        exit /b 1
    )
)

echo.
echo Creating transfer package...
echo.

REM Create temp directory for package
if exist "DMS-Transfer" rmdir /s /q "DMS-Transfer"
mkdir "DMS-Transfer"

echo [1/8] Copying source files...
xcopy /E /I /Y "src" "DMS-Transfer\src" >nul
xcopy /E /I /Y "public" "DMS-Transfer\public" >nul
xcopy /E /I /Y "server" "DMS-Transfer\server" >nul

echo [2/8] Copying build files...
xcopy /E /I /Y "build" "DMS-Transfer\build" >nul

echo [3/8] Copying configuration files...
copy package.json "DMS-Transfer\" >nul
copy .env "DMS-Transfer\" >nul
copy .env.production "DMS-Transfer\" >nul
if exist ".gitignore" copy .gitignore "DMS-Transfer\" >nul

echo [4/8] Copying server configuration...
copy "server\package.json" "DMS-Transfer\server\" >nul
copy "server\.env" "DMS-Transfer\server\" >nul

echo [5/8] Copying database and uploads...
if exist "server\data" xcopy /E /I /Y "server\data" "DMS-Transfer\server\data" >nul
if exist "server\uploads" xcopy /E /I /Y "server\uploads" "DMS-Transfer\server\uploads" >nul

echo [6/8] Copying scripts...
copy start-dms-production.bat "DMS-Transfer\START-DMS.bat" >nul
copy setup-autostart.ps1 "DMS-Transfer\" >nul

echo [7/8] Copying documentation...
copy README.md "DMS-Transfer\" >nul 2>nul
copy QUICK_START.md "DMS-Transfer\" >nul 2>nul
copy TRANSFER_GUIDE.md "DMS-Transfer\" >nul 2>nul

echo [8/8] Creating installation script for new computer...
(
echo @echo off
echo REM DMS Installation Script for New Computer
echo echo ================================================
echo echo    DMS Installation
echo echo ================================================
echo echo.
echo echo This will install all dependencies.
echo echo Make sure Node.js is installed first!
echo echo.
echo pause
echo.
echo echo Installing frontend dependencies...
echo call npm install
echo if errorlevel 1 ^(
echo     echo ERROR: Frontend installation failed!
echo     echo Make sure Node.js is installed!
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo Installing server dependencies...
echo cd server
echo call npm install
echo if errorlevel 1 ^(
echo     echo ERROR: Server installation failed!
echo     pause
echo     exit /b 1
echo ^)
echo cd ..
echo.
echo echo ================================================
echo echo    Installation Complete!
echo echo ================================================
echo echo.
echo echo To run DMS:
echo echo   Double-click START-DMS.bat
echo echo.
echo echo To access:
echo echo   Open browser to http://localhost:5000
echo echo.
echo pause
) > "DMS-Transfer\INSTALL.bat"

echo.
echo Creating README for new computer...
(
echo # DMS - Quick Installation Guide
echo.
echo ## Requirements
echo - Windows computer
echo - Node.js ^(download from: https://nodejs.org^)
echo.
echo ## Installation Steps
echo.
echo 1. Install Node.js if not already installed
echo 2. Restart your computer after Node.js installation
echo 3. Double-click INSTALL.bat
echo 4. Wait for installation to complete
echo.
echo ## Running DMS
echo.
echo Double-click START-DMS.bat
echo.
echo Then open your browser to: http://localhost:5000
echo.
echo ## Files Included
echo.
echo - All source code
echo - Built production files
echo - Database with your data
echo - Configuration files
echo - Uploaded files
echo - Startup scripts
echo.
echo ## Support
echo.
echo See QUICK_START.md and TRANSFER_GUIDE.md for detailed help.
echo.
) > "DMS-Transfer\README-INSTALL.md"

echo.
echo Excluding unnecessary files...
if exist "DMS-Transfer\node_modules" rmdir /s /q "DMS-Transfer\node_modules"
if exist "DMS-Transfer\server\node_modules" rmdir /s /q "DMS-Transfer\server\node_modules"

echo.
echo ================================================
echo    Package Created Successfully!
echo ================================================
echo.
echo Location: %~dp0DMS-Transfer
echo.
echo Next steps:
echo 1. Compress the DMS-Transfer folder to ZIP
echo 2. Transfer to new computer
echo 3. Extract and run INSTALL.bat
echo.
echo Would you like to open the folder?
pause

explorer "%~dp0DMS-Transfer"
