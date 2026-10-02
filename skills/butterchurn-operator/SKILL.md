---
name: butterchurn-operator
description: Operate the butterchurn-mcp visualizer backend (BPM sync, health, shutdown) and its Vite dashboard. Use when starting, probing, or driving the MilkDrop/WebGL visualizer for a DJ set or demo.
---

# Butterchurn Operator

## Backend (FastAPI + MCP, default :10878)

- Health: `GET /api/health` -> `{"status": "ok", ...}`
- Capabilities: `GET /api/capabilities` (tool surface + versions)
- MCP endpoint: `/mcp` (streamable HTTP)

## MCP tools

- `get_bpm` (read-only): current beat driving the visualizer.
- `set_bpm(bpm)`: 60..200. Called by mixx-dj-mcp during a DJ set.
- `butterchurn_shutdown(confirmed=true)`: terminate the server (destructive).

## Dashboard (Vite, default :10879)

Pages: Dashboard, Toolbox (engine picker), Presets, Visualizer (`/visualizer?engine=shader&scene=gyroid-pulse`), Tools, Settings, Logs, Help.

## Launch

`just serve` (backend) + `just web` (frontend), or the fleet `start.ps1`.
Health-gate any scripted launch: poll `/api/health` until 200, then open the dashboard.
