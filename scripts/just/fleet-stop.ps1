# Emergency fleet stop - kill MCP servers and pause supervisor auto-restart
$ErrorActionPreference = 'Continue'
Write-Host '=== FLEET STOP ===' -ForegroundColor Red
try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:10857/api/v1/supervisor/status' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json
    $j.servers.PSObject.Properties | ForEach-Object {
        $id = $_.Name
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:10857/api/v1/supervisor/${id}/pause" -Method Post -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop | Out-Null
        } catch {}
    }
    Write-Host '  Supervisor paused for all servers' -ForegroundColor Yellow
} catch {
    Write-Host '  Supervisor unreachable, skipping pause' -ForegroundColor DarkYellow
}
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match 'yahboom|aiwatcher|fleet_agent|robofang|grandorgue|plex|calibre|arxiv|email|bookmarks|speech|tailscale|docker|ring|devices|virtualization|home-assistant|rustdesk|fastsearch|system-admin|local-llm|notion|winrar|gimp|blender|qcad|freecad|reaper|openclaw|browser|monitoring'
} | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name cmd -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'start.bat' } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host '  Fleet processes killed' -ForegroundColor Green
Write-Host 'Resume: POST /api/v1/supervisor/{id}/resume on federation hub' -ForegroundColor Cyan
