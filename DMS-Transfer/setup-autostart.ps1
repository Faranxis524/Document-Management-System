# DMS Auto-Start on Windows Boot
# This PowerShell script configures DMS to start automatically when Windows starts

$dmsPath = $PSScriptRoot
$batchFile = Join-Path $dmsPath "start-dms.bat"

Write-Host "=== DMS Auto-Start Setup ===" -ForegroundColor Green
Write-Host ""
Write-Host "This will configure DMS to start automatically when Windows boots."
Write-Host "DMS Location: $dmsPath"
Write-Host ""

# Check if batch file exists
if (-not (Test-Path $batchFile)) {
    Write-Host "ERROR: start-dms.bat not found!" -ForegroundColor Red
    Write-Host "Please make sure start-dms.bat is in the DMS folder."
    pause
    exit
}

# Create scheduled task
$taskName = "DMS Auto-Start"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batchFile`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Remove existing task if it exists
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    
    # Register new task
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    
    Write-Host "✓ Auto-start configured successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "DMS will now start automatically when Windows boots." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To manage this:" -ForegroundColor Yellow
    Write-Host "  - Open Task Scheduler (taskschd.msc)"
    Write-Host "  - Look for task named: $taskName"
    Write-Host "  - You can disable/enable or delete it there"
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to create scheduled task" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Please run this script as Administrator:" -ForegroundColor Yellow
    Write-Host "  1. Right-click PowerShell"
    Write-Host "  2. Choose 'Run as administrator'"
    Write-Host "  3. Run this script again"
}

Write-Host ""
pause
