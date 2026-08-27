# Installing butterchurn-mcp

butterchurn-mcp runs entirely locally: a FastMCP server (`:10878`) plus a
full-screen Vite webapp (`:10879`) that renders MilkDrop visualizations in your
browser. No external account or host app is required.

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Git | Clone the repo (Option C/D only) | `winget install Git.Git` |
| Python + uv | Run the server (Option C/D only) | `winget install astral-sh.uv` |
| Bun | Run the webapp dev server (Option C/D only) | see [bun.sh](https://bun.sh/docs/installation) |

> Windows: installs via [winget](https://learn.microsoft.com/windows/package-manager/winget/)
> macOS: use `brew install` equivalents · Linux: use your distro package manager

## Option A — Quickest (local source, no packaging)

```powershell
git clone https://github.com/sandraschi/butterchurn-mcp
cd butterchurn-mcp
uv sync
cd webapp; bun install; cd ..
```

Then start everything at once:

```powershell
.\start.ps1
```

This starts the backend (`:10878`) and the Vite dev server (`:10879`) as detached
background processes, opens the webapp, and returns immediately.

## Option B — Run servers separately

```powershell
uv run butterchurn-mcp --serve   # backend on :10878 + MCP HTTP at /mcp
```

```powershell
cd webapp; bun run dev            # Vite dev on :10879
```

## Option C — Manual configuration (MCP client)

Add to your MCP client config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "butterchurn-mcp": {
      "command": "uv",
      "args": ["--directory", "C:\\path\\to\\butterchurn-mcp", "run", "butterchurn-mcp"],
      "env": { "PYTHONUNBUFFERED": "1" }
    }
  }
}
```

Config file locations:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Option D — Developer Mode

For contributing or running with live reload, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Verify installation

Start the server, then open the webapp:

```
http://127.0.0.1:10879
```

You should see a full-screen animated visualizer. Via MCP, ask your client for
the current BPM (`get_bpm`); it should return `128` by default.

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues, including
the "backend or frontend never starts" launcher checks.
