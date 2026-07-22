set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

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
    uv run butterchurn-mcp --serve

stdio:
    uv run butterchurn-mcp

install:
    uv sync

install-web:
    Set-Location '{{justfile_directory()}}\web_sota'
    bun install

web:
    Set-Location '{{justfile_directory()}}\web_sota'
    bun run dev

health:
    curl.exe -s http://127.0.0.1:11124/health

clean:
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, build, .ruff_cache, .pytest_cache, web_sota/node_modules, web_sota/dist
    Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host 'Cleaned.'
