# butterchurn-mcp

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/jberg/butterchurn"><img src="https://img.shields.io/badge/butterchurn-2.6-ff6b35?style=flat-square" alt="Butterchurn"></a>
</p>

> MilkDrop-style audio-reactive WebGL visualizer, powered by [butterchurn](https://github.com/jberg/butterchurn). FastMCP 3.4+ server with a full-screen React webapp and an OSC-ready BPM sync endpoint for [mixx-dj-mcp](https://github.com/sandraschi/mixx-dj-mcp).

## How it works

The webapp fills the entire browser window with a WebGL canvas running MilkDrop preset visualizations. The built-in beat generator pulses to the current BPM (default 128). Presets cycle through the butterchurn library — click or use arrow keys to switch.

**mixx-dj-mcp integration:** Send `POST /api/bpm { "bpm": 140 }` to the backend at 11124 to sync the visualizer's beat to a DJ set.

## Quick start

```powershell
uv sync
cd web_sota && bun install && cd ..
just serve     # backend on :11124 + MCP HTTP at /mcp
```

In another terminal:
```powershell
just web       # Vite dev on :11125
```

Or use `start.ps1` for both at once.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status, version, uptime |
| `/api/bpm` | GET | Current BPM value |
| `/api/bpm` | POST `{ "bpm": 140 }` | Set BPM (mixx-dj-mcp sync) |

## MCP tools

| Tool | Description |
|------|-------------|
| `get_bpm` | Read current BPM |
| `set_bpm` | Set BPM for visualizer sync |

## Ports

| Role | Port |
|------|------|
| Backend (FastAPI + MCP HTTP) | 11124 |
| Frontend (Vite dev) | 11125 |
