@echo off
setlocal
echo.
echo =========================================
echo  DMS DATA RESET (DESTRUCTIVE)
echo =========================================
echo This will DELETE all records and activity logs
echo by removing the SQLite database file(s):
echo   server\data\dms.sqlite
echo   DMS-Transfer\server\data\dms.sqlite
echo.
echo Your user accounts will be recreated on next start.
echo Uploaded files are NOT deleted by this script.
echo.
choice /M "Continue"
if errorlevel 2 (
  echo Cancelled.
  exit /b 1
)
echo.
echo Stopping Node server...
taskkill /F /IM node.exe >nul 2>&1
echo.
set "DELETED_ANY=0"

if exist "server\data\dms.sqlite" (
  echo Deleting server\data\dms.sqlite...
  del /F /Q "server\data\dms.sqlite"
  set "DELETED_ANY=1"
)

if exist "DMS-Transfer\server\data\dms.sqlite" (
  echo Deleting DMS-Transfer\server\data\dms.sqlite...
  del /F /Q "DMS-Transfer\server\data\dms.sqlite"
  set "DELETED_ANY=1"
)

if "%DELETED_ANY%"=="0" (
  echo No database files found (already reset).
) else (
  if exist "server\data\dms.sqlite" (
    echo WARNING: server\data\dms.sqlite still exists (file may be locked).
  )
  if exist "DMS-Transfer\server\data\dms.sqlite" (
    echo WARNING: DMS-Transfer\server\data\dms.sqlite still exists (file may be locked).
  )
)
echo.
echo Done.
echo Start DMS again using start-dms-production.bat
echo.
pause
