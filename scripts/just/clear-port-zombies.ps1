# clear-port-zombies.ps1 - kill stale listeners on fleet-registered ports.
#
# Scans Get-NetTCPConnection for listeners on ports from the fleet registry
# (operations/webapp-registry.json, fallback: the 10700-11500 reservoir) and
# kills their owning processes, printing a labeled table (port -> product).
#
# Usage:
#   clear-port-zombies.ps1            # kill (with confirmation of what it did)
#   clear-port-zombies.ps1 -DryRun    # report only, touch nothing
#   clear-port-zombies.ps1 -Ports 11154,11155   # restrict to specific ports
#
# Safety: never touches PID 0/4/System; only listeners on registered ports.
# See standards/POWERSHELL_STANDARDS.md (Dry-Run First).

param(
    [switch]$DryRun,
    [string]$Ports
)
$ErrorActionPreference = "SilentlyContinue"

$mcdRoot = "D:\Dev\repos\mcp-central-docs"
$registry = Join-Path $mcdRoot "operations\webapp-registry.json"

# port -> product label
$labels = @{}
if (Test-Path $registry) {
    try {
        $reg = Get-Content $registry -Raw | ConvertFrom-Json
        foreach ($w in $reg.webapps) {
            if ($w.port) { $labels[[int]$w.port] = $w.id }
        }
    } catch {
        Write-Host "WARN: could not parse registry: $_" -ForegroundColor Yellow
    }
}

$candidates = @()
if ($Ports) {
    $candidates = @($Ports -split "," | ForEach-Object { [int]$_ } | Where-Object { $_ -gt 0 })
} elseif ($labels.Count -gt 0) {
    $candidates = @($labels.Keys | Sort-Object)
} else {
    $candidates = 10700..11500
}

$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $candidates -contains $_.LocalPort }

$rows = @()
foreach ($l in $listeners) {
    $pid_ = $l.OwningProcess
    if ($pid_ -le 4) { continue }
    $proc = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
    if (-not $proc) { continue }
    if ($proc.ProcessName -in @("System", "Idle")) { continue }
    $product = $labels[[int]$l.LocalPort]
    if (-not $product) { $product = "unregistered :$($l.LocalPort)" }
    $rows += [PSCustomObject]@{
        Port    = $l.LocalPort
        Product = $product
        PID     = $pid_
        Process = $proc.ProcessName
        Action  = if ($DryRun) { "would kill" } else { "killed" }
    }
}

if ($rows.Count -eq 0) {
    Write-Host "No listeners on fleet-registered ports. Clean." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "  Fleet port zombies" -ForegroundColor Cyan
$rows | Format-Table -AutoSize Port, Product, PID, Process, Action

if (-not $DryRun) {
    foreach ($r in $rows) {
        $killed = $false
        try {
            Stop-Process -Id $r.PID -Force -ErrorAction Stop
            $killed = $true
        } catch {
            # escalate: taskkill /F /T handles protected/tree processes
            & taskkill.exe /F /T /PID $r.PID 2>$null | Out-Null
            $killed = $LASTEXITCODE -eq 0
        }
        if (-not $killed) {
            Write-Host "  FAILED to kill $($r.Process) (PID $($r.PID)) on :$($r.Port)" -ForegroundColor Red
        }
    }
    Start-Sleep -Milliseconds 500
    $still = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $candidates -contains $_.LocalPort }
    if ($still) {
        Write-Host "  $($still.Count) listener(s) still bound (TIME_WAIT or protected)" -ForegroundColor Yellow
    } else {
        Write-Host "  All fleet ports released." -ForegroundColor Green
    }
} else {
    Write-Host "  DRY RUN - nothing killed. Re-run without -DryRun to clean." -ForegroundColor Yellow
}
exit 0
