Param([switch]$Headless)

if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}

$env:FASTMCP_LOG_LEVEL = 'WARNING'
Write-Host 'Starting butterchurn-mcp...' -ForegroundColor Cyan

Set-Location $PSScriptRoot

# Kill any stale processes on our ports
Get-NetTCPConnection -LocalPort 11124 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 11125 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host 'Starting backend (port 11124)...' -ForegroundColor Green
Start-Process pwsh -ArgumentList '-NoProfile', '-Command', 'uv run butterchurn-mcp --serve' -WindowStyle Hidden

Start-Sleep 2

Write-Host 'Starting frontend (port 11125)...' -ForegroundColor Green
Set-Location web_sota
bun run dev

Start-Process "http://127.0.0.1:11125"
