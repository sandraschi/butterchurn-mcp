Param([switch]$Headless)

if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}

$env:FASTMCP_LOG_LEVEL = 'WARNING'
Write-Host 'Starting butterchurn-mcp...' -ForegroundColor Cyan

Set-Location $PSScriptRoot

Get-NetTCPConnection -LocalPort 11124 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 11125 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host 'Starting backend (port 11124)...' -ForegroundColor Green
Start-Process pwsh -ArgumentList '-NoProfile', '-WorkingDirectory', $PSScriptRoot, '-Command', 'uv run butterchurn-mcp --serve' -WindowStyle Hidden

$backendReady = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:11124/api/health' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # still starting
    }
}

if (-not $backendReady) {
    Write-Host '[ERROR] Backend did not become ready on port 11124 within 60s' -ForegroundColor Red
    exit 1
}

Write-Host 'Backend ready. Starting frontend (port 11125)...' -ForegroundColor Green
Set-Location webapp

if (-not (Test-Path 'node_modules')) {
    bun install
}

$viteJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    Set-Location webapp
    bun run dev 2>&1
}

$frontendReady = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:11125/' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $frontendReady = $true
            break
        }
    } catch {
        # still starting
    }
}

if ($frontendReady) {
    Start-Process 'http://127.0.0.1:11125'
    Write-Host 'Webapp ready at http://127.0.0.1:11125' -ForegroundColor Cyan
} else {
    Write-Host '[WARN] Frontend not responding yet - check Vite output' -ForegroundColor Yellow
}

Receive-Job -Job $viteJob -Wait
