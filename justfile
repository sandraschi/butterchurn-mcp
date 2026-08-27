set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]

import 'scripts/just/fleet.just'

default:
    @just --list

version := "0.1.0"
name := "butterchurn-mcp"

lint:
    uv run ruff check src/

fix:
    uv run ruff check src/ --fix --unsafe-fixes
    uv run ruff format src/

fmt:
    uv run ruff format src/

check:
    uv run ruff check src/
    uv run ruff format --check src/

test:
    uv run pytest -v

serve:
    powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 10878 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
    uv run butterchurn-mcp --serve

stdio:
    uv run butterchurn-mcp

install:
    uv sync

install-web:
    Set-Location '{{justfile_directory()}}\webapp'
    bun install

web:
    Set-Location '{{justfile_directory()}}\webapp'
    bun run dev

build-web:
    Set-Location '{{justfile_directory()}}\webapp'
    bun run build

health:
    curl.exe -s http://127.0.0.1:10878/api/health

clean:
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, build, .ruff_cache, .pytest_cache, webapp/node_modules, webapp/dist
    Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host 'Cleaned.'

# Bootstrap: install dev deps + pre-commit hook
bootstrap:
    uv sync --group dev
    uv run pre-commit install
    Write-Host "Pre-commit hooks installed." -ForegroundColor Green