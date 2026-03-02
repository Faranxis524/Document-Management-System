# Force Delete Release Folder - PowerShell Script
# Run this as Administrator if needed

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Force Delete Locked Release Folder" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Kill all node processes
Write-Host "[1/4] Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Kill electron processes
Write-Host "[2/4] Stopping all Electron processes..." -ForegroundColor Yellow
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Try to remove the folder
Write-Host "[3/4] Attempting to delete release folder..." -ForegroundColor Yellow

if (Test-Path "release") {
    # Try method 1: PowerShell Remove-Item
    try {
        Remove-Item -Path "release" -Recurse -Force -ErrorAction Stop
        Write-Host "   Success with Remove-Item!" -ForegroundColor Green
    }
    catch {
        Write-Host "   Remove-Item failed, trying alternative..." -ForegroundColor Yellow
        
        # Try method 2: CMD rmdir
        Start-Sleep -Seconds 2
        cmd /c "rd /s /q release" 2>$null
        Start-Sleep -Seconds 2
        
        if (Test-Path "release") {
            # Try method 3: Delete files first, then folder
            Write-Host "   Trying aggressive cleanup..." -ForegroundColor Yellow
            Get-ChildItem -Path "release" -Recurse -File | ForEach-Object {
                try {
                    Remove-Item $_.FullName -Force -ErrorAction Stop
                } catch {}
            }
            Start-Sleep -Seconds 1
            Get-ChildItem -Path "release" -Recurse -Directory | Sort-Object {$_.FullName.Length} -Descending | ForEach-Object {
                try {
                    Remove-Item $_.FullName -Force -ErrorAction Stop
                } catch {}
            }
            Start-Sleep -Seconds 1
            Remove-Item -Path "release" -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "[4/4] Verifying..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

if (Test-Path "release") {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host "   FOLDER STILL LOCKED" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "The folder is locked by Windows. Please:" -ForegroundColor Yellow
    Write-Host "  1. Right-click PowerShell -> Run as Administrator" -ForegroundColor White
    Write-Host "  2. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "OR restart your computer and run this script again." -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
} else {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "   SUCCESS! Folder Deleted" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to build the .exe installer!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Run: .\create-electron-installer-fixed.bat" -ForegroundColor White
    Write-Host ""
    pause
}
