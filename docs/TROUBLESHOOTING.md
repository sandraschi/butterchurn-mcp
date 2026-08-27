# Troubleshooting

## Launcher (`start.ps1`) never returns / no browser opens
**Cause**: Both servers are detached background processes, so the script returns
immediately by design. If nothing opens, a server crashed during startup.
**Fix**: Check the ports are listening:
`Get-NetTCPConnection -LocalPort 10878,10879`. Then run the backend in a terminal
to see its traceback: `uv run butterchurn-mcp --serve`.

## Backend crashes with `ModuleNotFoundError: No module named 'dotenv'`
**Cause**: The venv is out of sync with `pyproject.toml` (`python-dotenv` declared
but not installed).
**Fix**: `uv sync --reinstall-package python-dotenv`.

## Frontend blank / Vite never starts from the launcher
**Cause**: `start.ps1` launches vite via a detached shell that can't find `bun` if
it isn't on the machine/user PATH.
**Fix**: Ensure `bun` is on PATH or present at `~\.bun\bin\bun.exe`, then start it
manually: `cd webapp; bun run dev`.

## Webapp loads but shows "Backend offline"
**Cause**: The frontend can't reach `/api/health` on the backend.
**Fix**: Confirm the backend is up on `:10878` (health check above). The Vite dev
server proxies `/api/*` and `/health` to `127.0.0.1:10878` — verify the proxy
target matches the running backend port.

## Presets gallery shows gradients, not animated previews
**Cause**: Thumbnails render live only when visible and only up to ~12 concurrent
WebGL contexts (browser limit). Off-screen cards fall back to a static gradient.
**Fix**: Not an error — scroll to activate. If cards never animate, WebGL may be
disabled or the GPU context limit hit; close other WebGL tabs/apps.

## `get_bpm` / `set_bpm` not available in my client
**Cause**: The server entry isn't configured, or the client caches tool lists.
**Fix**: Add the `butterchurn-mcp` entry to `claude_desktop_config.json` (see
INSTALL.md Option C), then restart the client.

## Port 10878 or 10879 already in use
**Cause**: A previous instance is still running.
**Fix**: Stop the stale processes, then relaunch:
`Get-NetTCPConnection -LocalPort 10878,10879 | % { Stop-Process -Id $_.OwningProcess -Force }`.

## BPM won't go above 200
**Cause**: `set_bpm` clamps input to 60–200.
**Fix**: Use a value in that range.
