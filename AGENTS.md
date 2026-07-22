# butterchurn-mcp — Agent Guide

## Overview
FastMCP 3.4+ server that hosts a MilkDrop-style audio-reactive WebGL visualizer via butterchurn. Provides an `/api/bpm` endpoint for mixx-dj-mcp to sync BPM. Mostly a webapp host.

## Entry Points
- `uv run butterchurn-mcp` → `butterchurn_mcp.__main__:main`

## Ports
| Role | Port |
|------|------|
| FastAPI + MCP HTTP | 11124 |
| Vite dev (SPA) | 11125 |

## Key Files
- `run_server.py` — dual transport entry point (PyInstaller)
- `src/butterchurn_mcp/server.py` — FastMCP instance + health + /api/bpm
- `src/butterchurn_mcp/config.py` — settings from env
- `web_sota/src/components/Visualizer.tsx` — full-screen butterchurn renderer
