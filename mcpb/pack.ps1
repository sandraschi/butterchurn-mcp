#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build the butterchurn-mcp MCPB bundle (fleet MCPB_PACKAGING_STANDARDS).

.DESCRIPTION
    Wipes and recopies src/ -> mcpb/src/, validates the 3-4-100 prompts,
    runs the mechanical packaging checks, then packs via the mcpb CLI.

.PARAMETER OutputDir
    Where to write the .mcpb (default: dist).
#>
param(
    [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$MCPB = Join-Path $RepoRoot "mcpb"
$Pkg = "butterchurn_mcp"
$Version = "0.1.0-beta.1"
$OutFile = Join-Path (Join-Path $RepoRoot $OutputDir) "butterchurn-mcp-$Version.mcpb"

function Step($m) { Write-Host "[STEP] $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Fail($m) { Write-Host "[FAIL] $m" -ForegroundColor Red; exit 1 }

# --- 0. Prereqs -----------------------------------------------------------
Step "Checking mcpb CLI"
$bun = "$env:USERPROFILE\.bun\bin\bun.exe"
$mcpbCmd = Get-Command mcpb -ErrorAction SilentlyContinue
if (-not $mcpbCmd -and (Test-Path $bun)) {
    # mcpb CLI not on PATH; run via bun x @anthropic-ai/mcpb
    $MCPB_CMD = $bun
    $MCPB_ARGS = @("x", "@anthropic-ai/mcpb")
    Ok "mcpb via bun x: $bun"
} else {
    $MCPB_CMD = $mcpbCmd.Source
    $MCPB_ARGS = @()
    Ok "mcpb CLI: $MCPB_CMD"
}

# --- 1. Fresh stage: wipe + recopy src -> mcpb/src ------------------------
Step "Fresh staging: wipe + recopy src -> mcpb/src"
$stage = Join-Path $MCPB "src"
if (Test-Path $stage) {
    Remove-Item -Recurse -Force $stage
    Step "  wiped existing mcpb/src"
}
$pkgSrc = Join-Path (Join-Path $RepoRoot "src") $Pkg
if (-not (Test-Path (Join-Path $pkgSrc "server.py"))) {
    Fail "Copy source missing: $pkgSrc"
}
New-Item -ItemType Directory -Force -Path (Join-Path $MCPB "src") | Out-Null
Copy-Item -Recurse -Force $pkgSrc (Join-Path (Join-Path $MCPB "src") $Pkg)
Ok "copied $pkgSrc -> mcpb/src/$Pkg"

# Strip bytecode / backups from stage immediately
Get-ChildItem $stage -Recurse -Directory -Filter __pycache__ -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem $stage -Recurse -File -Include *.pyc,*.pyo,*.bak,*.bak.* -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue
Ok "stripped bytecode + backups from stage"

# --- 2. Ensure .mcpbignore present at pack root ---------------------------
Step "Ensuring mcpb/.mcpbignore"
$rootIgnore = Join-Path $RepoRoot ".mcpbignore"
$packIgnore = Join-Path $MCPB ".mcpbignore"
if (-not (Test-Path $packIgnore) -and (Test-Path $rootIgnore)) {
    Copy-Item $rootIgnore $packIgnore -Force
    Ok "copied .mcpbignore to pack root"
} elseif (-not (Test-Path $packIgnore)) {
    Fail ".mcpbignore missing at both repo root and mcpb/"
} else {
    Ok "mcpb/.mcpbignore present"
}

# --- 3. Validate prompts (3-4-100) ----------------------------------------
Step "Validating prompts (3-4-100)"
function Word-Count([string]$p) { (@(Get-Content -Raw $p) -split '\s+' | Where-Object { $_ }).Count }
$prompts = Join-Path (Join-Path $RepoRoot "assets") "prompts"
if (-not (Test-Path $prompts)) { Fail "assets/prompts missing" }
$sys = Word-Count (Join-Path $prompts "system.md")
$user = Word-Count (Join-Path $prompts "user.md")
$ex = (Get-Content (Join-Path $prompts "examples.json") -Raw | ConvertFrom-Json).Count
Write-Host "  system=$sys user=$user examples=$ex"
if ($sys -lt 3000 -or $user -lt 4000 -or $ex -lt 100) {
    Fail "3-4-100 FAIL (need 3000/4000/100)"
}
Ok "3-4-100 OK"

# --- 4. Copy prompts + manifest + README into pack ------------------------
Step "Staging assets + metadata"
$packAssets = Join-Path $MCPB "assets"
if (-not (Test-Path $packAssets)) {
    New-Item -ItemType Directory -Force -Path $packAssets | Out-Null
}
$destPrompts = Join-Path $packAssets "prompts"
if (Test-Path $destPrompts) { Remove-Item -Recurse -Force $destPrompts }
Copy-Item -Recurse -Force $prompts $destPrompts
if (Test-Path (Join-Path (Join-Path $RepoRoot "assets") "icon.png")) {
    Copy-Item (Join-Path (Join-Path $RepoRoot "assets") "icon.png") (Join-Path $packAssets "icon.png") -Force
}
# manifest is authored at mcpb/manifest.json already; ensure README present
if (-not (Test-Path (Join-Path $MCPB "README.md"))) {
    Copy-Item (Join-Path $RepoRoot "README.md") (Join-Path $MCPB "README.md") -Force
}
Ok "assets + metadata staged"

# --- 5. Mechanical checks -------------------------------------------------
Step "Running mechanical checks"
$py = Join-Path (Join-Path (Join-Path $RepoRoot ".venv") "Scripts") "python.exe"
if (-not (Test-Path $py)) { $py = "python" }
# PYTHONDONTWRITEBYTECODE prevents the import check from leaving __pycache__.
$env:PYTHONDONTWRITEBYTECODE = "1"
$check = & $py -c "import sys; sys.path.insert(0, r'$stage'); import $Pkg.__main__ as m; print('OK', m.__file__)" 2>&1
if ($LASTEXITCODE -ne 0 -or "$check" -notmatch "OK") {
    Fail "Entry point import check failed: $check"
}
Ok "entry point imports from mcpb/src ($check)"

$poll = Get-ChildItem $stage -Recurse -File -Include *.pyc,*.pyo,*.bak,*.bak.* -ErrorAction SilentlyContinue
if ($poll) { Fail "Pollution found in stage: $($poll.Count) files" }
Ok "no bytecode/backup pollution in stage"

# --- 6. Pack --------------------------------------------------------------
Step "Packing (from mcpb/)"
if (-not (Test-Path (Split-Path $OutFile))) {
    New-Item -ItemType Directory -Force -Path (Split-Path $OutFile) | Out-Null
}
Push-Location $MCPB
try {
    & $MCPB_CMD @MCPB_ARGS pack "." $OutFile 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { Fail "mcpb pack failed" }
} finally {
    Pop-Location
}
if (-not (Test-Path $OutFile)) { Fail "output not produced" }
Ok "packed: $OutFile ($([Math]::Round((Get-Item $OutFile).Length/1MB,2)) MB)"

# Note: 'mcpb pack' already validates the manifest and lists archive contents;
# there is no separate 'inspect' subcommand in current mcpb CLI versions.
Write-Host ""
Write-Host "Build complete: $OutFile" -ForegroundColor Green
