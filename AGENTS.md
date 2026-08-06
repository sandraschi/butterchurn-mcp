# butterchurn-mcp — Agent Guide

## Overview
Universal visualizer toolbox (FastMCP 3.4+). Pluggable engines: **GLSL Shaders** (modern WebGL2) and **Butterchurn/MilkDrop** (legacy presets). BPM sync for mixx-dj-mcp.

## Entry Points
- `uv run butterchurn-mcp` → `butterchurn_mcp.__main__:main`

## Ports
| Role | Port |
|------|------|
| FastAPI + MCP HTTP | 11124 |
| Vite dev (SPA) | 11125 |

## Visualizer engines
| Engine | Era | Runtime |
|--------|-----|---------|
| `shader` | modern | WebGL2 GLSL (6 bundled scenes) |
| `butterchurn` | legacy | butterchurn + 500+ MilkDrop presets |

## Key Files
- `webapp/src/pages/ToolboxPage.tsx` — engine picker + scene grid + live preview
- `webapp/src/visualizers/shader/scenes.ts` — bundled GLSL fragment shaders
- `webapp/src/visualizers/shader/ShaderCanvas.tsx` — WebGL2 renderer
- `webapp/src/visualizers/registry.ts` — engine catalog
- `webapp/src/components/Visualizer.tsx` — butterchurn fullscreen
- `src/butterchurn_mcp/app.py` — `/api/visualizers`, `/api/bpm`

## Webapp routes
Dashboard · **Toolbox** · Presets · Visualizer · Tools · Settings · Logs · Help

Fullscreen: `/visualizer?engine=shader&scene=gyroid-pulse` or `?engine=butterchurn&i=42`

## Launch
```powershell
just serve
just web
```
