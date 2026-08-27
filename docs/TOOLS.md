# Tools Reference

butterchurn-mcp exposes a small MCP tool surface (BPM control) plus a REST API
and a browser webapp. The visualizer engines run client-side; the MCP tools
drive the beat clock that mixx-dj-mcp (or any agent) uses to sync a DJ set.

## MCP tools

### `get_bpm`

Read the current BPM driving the visualizer's beat generator.

**Returns**

```json
{ "success": true, "bpm": 128 }
```

### `set_bpm`

Set the BPM for visualizer beat sync.

**Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `bpm` | int | yes | 60–200. Values outside the range are rejected. |

**Returns**

```json
{ "success": true, "bpm": 140 }
```

On invalid input:

```json
{ "success": false, "error": "BPM must be between 60 and 200" }
```

## REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` · `/api/health` · `/api/v1/health` | GET | Status, version, uptime, current BPM, ports |
| `/api/capabilities` | GET | Tool surface, features, inventory, runtime |
| `/api/visualizers` | GET | Engine catalog (shader scenes + butterchurn) |
| `/api/dashboard` | GET | BPM, uptime, preset library, engines, companion |
| `/api/tools` | GET | MCP tool list |
| `/api/skills` | GET | Bundled skills (if any) |
| `/api/logs` | GET | Recent log entries; filters `limit`, `level`, `search` |
| `/api/bpm` | GET | Current BPM |
| `/api/bpm` | POST | Body `{"bpm": 140}`; set BPM (60–200) |

## Webapp routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard (BPM, uptime, links) |
| `/toolbox` | Engine picker, scene grid, live preview |
| `/presets` | Live gallery of every butterchurn visualizer |
| `/visualizer` | Fullscreen canvas (`?engine=…&scene=…` or `?engine=butterchurn&i=N`) |
| `/tools` | Tool reference |
| `/skills` | Bundled skills |
| `/chat` | Chat page |
| `/settings` | Settings (LLM provider) |
| `/logs` | Server logs |
| `/help` | Help page |
