# butterchurn-mcp

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/jberg/butterchurn"><img src="https://img.shields.io/badge/butterchurn-2.6-ff6b35?style=flat-square" alt="Butterchurn"></a>
</p>

> Universal visualizer toolbox — modern WebGL2 GLSL shaders + legacy MilkDrop presets (butterchurn). FastMCP server with BPM sync for [mixx-dj-mcp](https://github.com/sandraschi/mixx-dj-mcp).

## Engines

| Engine | What | When to use |
|--------|------|-------------|
| **GLSL Shaders** | 6 bundled WebGL2 scenes (gyroid, tunnel, plasma, …) | Modern look, no `.milk` baggage |
| **Butterchurn** | 500+ community MilkDrop presets | Retro Winamp nostalgia |

Open **Toolbox** in the webapp to switch engines, preview, and go fullscreen.

The **Presets** page is a live gallery of every visualizer: each thumbnail
renders its own animated preview (up to ~12 WebGL contexts at once, cards activate as
you scroll) with search, category/author filters, favorites, a slideshow mode, and a
one-click fullscreen view.

**Preset library:** besides the bundled butterchurn packs (Main/Extra/MD1/Minimal/…),
it ships **projectM's MilkDrop presets** — the classic "threads of light" particle
and geometric look. `ProjectM Original` (513) loads eagerly; the large
`ProjectM Cream Geo` (996) and `ProjectM Cream Particles` (375) packs lazy-load only
when you browse them.

The **Settings** page auto-detects local LLM engines (Ollama / LM Studio / vLLM),
picks a model resident-first (never evicting a loaded one), and on multi-GPU
machines routes local models to the secondary card via a GPU selector.

## How it works

The webapp fills the entire browser window with a WebGL canvas running MilkDrop preset visualizations. The built-in beat generator pulses to the current BPM (default 128). Presets cycle through the butterchurn library — click or use arrow keys to switch.

**mixx-dj-mcp integration:** Send `POST /api/bpm { "bpm": 140 }` to the backend at 10878 to sync the visualizer's beat to a DJ set.

## Quick start

```powershell
git clone https://github.com/sandraschi/butterchurn-mcp
cd butterchurn-mcp
uv sync
cd webapp; bun install; cd ..
just serve     # backend on :10878 + MCP HTTP at /mcp
```

In another terminal:
```powershell
just web       # Vite dev on :10879
```

Or use `start.ps1` for both at once. It starts the backend (`:10878`) and the Vite
dev server (`:10879`) as detached background processes, opens the webapp, and returns
immediately — no hanging terminal. Requires `bun` on PATH (or auto-detects the default
`~\.bun\bin\bun.exe`).

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status, version, uptime |
| `/api/bpm` | GET | Current BPM value |
| `/api/bpm` | POST `{ "bpm": 140 }` | Set BPM (mixx-dj-mcp sync) |
| `/api/logs` | GET | Recent server log entries |
| `/api/llm/gpus` | GET | Enumerate NVIDIA GPUs (index, name, VRAM) for target-GPU placement |
| `/api/llm/detect` | GET | Local LLM detection: GPU tier + installed Ollama models |

## MCP tools

| Tool | Description |
|------|-------------|
| `get_bpm` | Read current BPM |
| `set_bpm` | Set BPM for visualizer sync |

## Ports

| Role | Port |
|------|------|
| Backend (FastAPI + MCP HTTP) | 10878 |
| Frontend (Vite dev) | 10879 |

## Documentation

| Doc | Contents |
|-----|----------|
| [Installation](INSTALL.md) | All install methods, prerequisites |
| [Product Requirements](docs/PRD.md) | Goals, requirements, status |
| [Architecture](docs/ARCHITECTURE.md) | System architecture, data flow, ports |
| [Configuration](docs/CONFIGURATION.md) | Env vars, config options |
| [Tool Reference](docs/TOOLS.md) | All available tools |
| [Development](docs/DEVELOPMENT.md) | Contributing, local setup |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues |

## Requirements

- Windows / macOS / Linux
- Python 3.12+ and [uv](https://docs.astral.sh/uv/) (Option A/C)
- [Bun](https://bun.sh) for the webapp dev server (Option A)
- A WebGL2-capable browser (Chrome, Edge, Firefox, Safari)

## License

MIT
