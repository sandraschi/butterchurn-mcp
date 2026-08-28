# Architecture

butterchurn-mcp is a FastMCP 3.4+ server that hosts an audio-reactive WebGL
visualizer. The heavy lifting (MilkDrop rendering via butterchurn) happens in
the browser; the Python backend serves APIs and a BPM clock for beat sync.

## Component diagram

```
┌─────────────────────────── browser ───────────────────────────┐
│                                                               │
│  Vite SPA (:10879)                                            │
│   ├── butterchurn WebGL canvas  (MilkDrop presets)            │
│   ├── GLSL Shader canvas       (6 WebGL2 scenes)              │
│   ├── beat generator           (AudioContext, BPM-timed)      │
│   └── polls /api/bpm every 2s                                 │
└──────────────────────────────┬───────────────────────────────┘
                               │  /api/*  /health  /mcp   (Vite proxy)
                               ▼
┌─────────────────────────── Python (:10878) ──────────────────┐
│                                                               │
│  FastAPI app                                                  │
│   ├── /api/bpm  GET/POST   → bpm_state (in-memory int)        │
│   ├── /api/logs GET/DELETE → log_buffer (in-memory ring, 2000)│
│   ├── /api/logs/stats|export → ring stats / JSON·CSV download │
│   ├── /api/capabilities    → tool surface + features           │
│   ├── /api/visualizers     → engine catalog                   │
│   ├── /api/llm/gpus        → nvidia-smi GPU enumeration        │
│   ├── /api/llm/detect      → GPU tier + installed/loaded models│
│   ├── request middleware   → logs every /api/* call            │
│   ├── /mcp                 → FastMCP HTTP endpoint            │
│   └── (stdio when run without --serve)                        │
└───────────────────────────────────────────────────────────────┘
```

## Data flow

1. **BPM state** is a single in-memory integer (default from
   `BUTTERCHURN_MCP_DEFAULT_BPM`, default `128`).
2. `set_bpm` (MCP tool or `POST /api/bpm`) writes it; `get_bpm` / `GET /api/bpm`
   reads it. Values clamp to 60–200.
3. The webapp polls `/api/bpm` every 2s and re-times its built-in AudioContext
   beat generator, which drives the visualizer's waveform.
4. **No video frames cross the wire** — butterchurn renders client-side.
5. **Local Intelligence**: the webapp probes Ollama/LM Studio/vLLM on mount,
   resolves the default model **resident-first** (never evicting a loaded model,
   via `/api/ps` + `/api/tags`), and on multi-GPU machines routes local models to
   the secondary card via `GET /api/llm/gpus` + the Settings GPU selector.
6. **Logging**: a request middleware logs every `/api/*` call (kind `http`);
   MCP tool calls log as `tool_call`; startup and BPM changes log as `server` /
   `bpm`. All land in the in-memory ring buffer (2000 max, `BUTTERCHURN_LOG_MAX_ENTRIES`).

## Module layout (`src/butterchurn_mcp/`)

| Module | Responsibility |
|--------|----------------|
| `server.py` | FastMCP instance + `get_bpm` / `set_bpm` tools |
| `app.py` | FastAPI app, REST endpoints, `/mcp` mount, SPA fallback |
| `config.py` | `Settings` from environment |
| `llm_detect.py` | Canonical GPU detection + Ollama model tiering (fleet template) |
| `bpm_state.py` | In-memory BPM read/write |
| `log_buffer.py` | In-memory ring of log entries |
| `webapp_static.py` | Locates the built webapp `dist/` for static serving |

## Ports

| Role | Port | Notes |
|------|------|-------|
| Backend (FastAPI + MCP HTTP) | 10878 | Configurable via `BUTTERCHURN_MCP_PORT` |
| Frontend (Vite dev) | 10879 | Adjacent-pair per fleet standard |

## Transports

- **stdio** (default): `uv run butterchurn-mcp`
- **HTTP**: `uv run butterchurn-mcp --serve` — FastAPI hosting the MCP endpoint
  at `/mcp`, plus the REST API and (when built) the static webapp.

## Engines

| Engine | Runtime | Content |
|--------|---------|---------|
| `shader` | WebGL2 GLSL | 6 bundled scenes (see `webapp/src/visualizers/shader/scenes.ts`) |
| `butterchurn` | butterchurn + MilkDrop | ~2,000 presets: `butterchurn-presets` packs (Main/Extra/Extra2/MD1/Minimal/Non-Minimal) + **projectM** Original (513, eager) + Cream Geo (996, lazy) + Cream Particles (375, lazy); loaded client-side |
