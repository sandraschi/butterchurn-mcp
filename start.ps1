Param([switch]$Headless)

if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}

$env:FASTMCP_LOG_LEVEL = 'WARNING'
Write-Host 'Starting butterchurn-mcp...' -ForegroundColor Cyan

Set-Location $PSScriptRoot

Get-NetTCPConnection -LocalPort 10878 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 10879 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host 'Starting backend (port 10878)...' -ForegroundColor Green
Start-Process pwsh -ArgumentList '-NoProfile', '-WorkingDirectory', $PSScriptRoot, '-Command', 'uv run butterchurn-mcp --serve' -WindowStyle Hidden

$backendReady = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:10878/api/health' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # still starting
    }
}

if (-not $backendReady) {
    Write-Host '[ERROR] Backend did not become ready on port 10878 within 60s' -ForegroundColor Red
    exit 1
}

Write-Host 'Backend ready. Starting frontend (port 10879)...' -ForegroundColor Green
Set-Location webapp

if (-not (Test-Path 'node_modules')) {
    bun install
}

$bun = (Get-Command bun -ErrorAction SilentlyContinue)?.Source
if (-not $bun) { $bun = "$env:USERPROFILE\.bun\bin\bun.exe" }
if (-not (Test-Path $bun)) {
    Write-Host '[ERROR] bun not found. Install bun or fix its PATH.' -ForegroundColor Red
    exit 1
}

Start-Process pwsh -ArgumentList '-NoProfile', '-WorkingDirectory', "$PSScriptRoot\webapp", '-Command', "& '$bun' run dev" -WindowStyle Hidden

$frontendReady = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:10879/' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $frontendReady = $true
            break
        }
    } catch {
        # still starting
    }
}

if ($frontendReady) {
    Start-Process 'http://127.0.0.1:10879'
    Write-Host 'Webapp ready at http://127.0.0.1:10879' -ForegroundColor Cyan
} else {
    Write-Host '[WARN] Frontend not responding yet - check Vite output' -ForegroundColor Yellow
}

Write-Host 'Both servers running in background (backend :10878, frontend :10879).' -ForegroundColor Yellow
