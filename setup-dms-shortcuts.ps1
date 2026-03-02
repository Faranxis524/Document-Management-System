$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')

$silentUpdateScript = Join-Path $root 'update-dms-server-silent.bat'
$startScript = Join-Path $root 'start-dms-production.bat'

$wsh = New-Object -ComObject WScript.Shell

function New-DmsShortcut {
    param(
        [string]$ShortcutName,
        [string]$TargetPath,
        [string]$Description,
        [string]$IconPath
    )

    if (-not (Test-Path $TargetPath)) {
        Write-Host "Skipped $ShortcutName (target not found): $TargetPath" -ForegroundColor Yellow
        return
    }

    $shortcutPath = Join-Path $desktop "$ShortcutName.lnk"
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = $root
    $shortcut.Description = $Description

    if ($IconPath -and (Test-Path $IconPath)) {
        $shortcut.IconLocation = $IconPath
    }

    $shortcut.Save()
    Write-Host "Created: $shortcutPath" -ForegroundColor Green
}

$iconPath = Join-Path $root 'public\favicon.ico'

New-DmsShortcut -ShortcutName 'Update DMS' -TargetPath $silentUpdateScript -Description 'Update and restart DMS silently with logging' -IconPath $iconPath
New-DmsShortcut -ShortcutName 'Start DMS' -TargetPath $startScript -Description 'Start DMS production server' -IconPath $iconPath

Write-Host ''
Write-Host 'Done. Desktop shortcuts are ready.' -ForegroundColor Cyan
Write-Host 'Use "Update DMS" for normal updates.' -ForegroundColor Cyan