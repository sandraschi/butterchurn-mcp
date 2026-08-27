# Configuration

butterchurn-mcp reads its settings from environment variables. Copy
`.env.example` to `.env` at the repo root (or set the variables in your MCP
client config) to customize behavior.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BUTTERCHURN_MCP_HOST` | `127.0.0.1` | Bind host for the HTTP/FastAPI server |
| `BUTTERCHURN_MCP_PORT` | `10878` | Backend port (webapp frontend stays on `10879`) |
| `BUTTERCHURN_MCP_HTTP_PATH` | `/mcp` | Mount path for the MCP HTTP endpoint |
| `BUTTERCHURN_MCP_DEFAULT_BPM` | `128` | Initial BPM until a `set_bpm` call updates it |

## Setting Variables

### For a standalone backend run

```powershell
$env:BUTTERCHURN_MCP_DEFAULT_BPM = "140"
uv run butterchurn-mcp --serve
```

### For an MCP client

Add an `env` block to the server entry in your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "butterchurn-mcp": {
      "command": "uv",
      "args": ["--directory", "C:\\path\\to\\butterchurn-mcp", "run", "butterchurn-mcp"],
      "env": {
        "BUTTERCHURN_MCP_DEFAULT_BPM": "140",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

## Webapp-local settings

Some preferences live only in the browser and are persisted to
`localStorage` (not environment):

- **Favorites** — keys under `butterchurn:favorites`
- **Last selected preset** — `butterchurn:lastPreset`
- **Audio URL** for streamed input — `viz:audioUrl`
- **Light mode** — `butterchurn-light-mode`
