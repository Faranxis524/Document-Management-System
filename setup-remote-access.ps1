# Setup DMS for Remote Access
# Run this as Administrator

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   DMS Remote Access Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Right-click PowerShell" -ForegroundColor White
    Write-Host "  2. Choose 'Run as administrator'" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    pause
    exit
}

Write-Host "Setting up Windows Firewall..." -ForegroundColor Yellow
Write-Host ""

# Remove existing rule if it exists
Remove-NetFirewallRule -DisplayName "DMS Remote Access" -ErrorAction SilentlyContinue

# Add new firewall rule
try {
    New-NetFirewallRule -DisplayName "DMS Remote Access" `
                        -Direction Inbound `
                        -LocalPort 5000 `
                        -Protocol TCP `
                        -Action Allow `
                        -Profile Any `
                        -Enabled True | Out-Null
    
    Write-Host "✓ Firewall rule created successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create firewall rule" -ForegroundColor Red
    Write-Host $_.Exception.Message
    pause
    exit
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   Windows Firewall Configured!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Get and display network info
Write-Host "Your Network Information:" -ForegroundColor Cyan
Write-Host ""

$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -like "192.168.*"}).IPAddress | Select-Object -First 1

Write-Host "  Local IP: $localIP" -ForegroundColor White
Write-Host "  Port: 5000" -ForegroundColor White
Write-Host ""

Write-Host "Access on same network:" -ForegroundColor Yellow
Write-Host "  http://${localIP}:5000" -ForegroundColor White
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Next Steps for Remote Access" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Choose your remote access method:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. PORT FORWARDING (Router Setup Required)" -ForegroundColor White
Write-Host "   - Login to your router (usually 192.168.1.1 or 192.168.254.254)" -ForegroundColor Gray
Write-Host "   - Setup port forwarding: External 5000 -> $localIP:5000" -ForegroundColor Gray
Write-Host "   - Access from anywhere using your public IP" -ForegroundColor Gray
Write-Host ""

Write-Host "2. VPN - ZeroTier (Easiest & Most Secure) ⭐" -ForegroundColor White
Write-Host "   - Download: https://www.zerotier.com/download/" -ForegroundColor Gray
Write-Host "   - Create free account and network" -ForegroundColor Gray
Write-Host "   - Install on both computers" -ForegroundColor Gray
Write-Host "   - Access securely from anywhere!" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Ngrok (Quick Test)" -ForegroundColor White
Write-Host "   - Download: https://ngrok.com/download" -ForegroundColor Gray
Write-Host "   - Run: ngrok http 5000" -ForegroundColor Gray
Write-Host "   - Get temporary public URL" -ForegroundColor Gray
Write-Host ""

Write-Host "See REMOTE_ACCESS_GUIDE.md for detailed instructions!" -ForegroundColor Cyan
Write-Host ""

pause
