# Changelog

All notable changes to butterchurn-mcp are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Server logging (fleet WEBAPP_LOGS_PAGE)**: backend logs every `/api/*`
  request (kind `http`) via middleware, MCP tool calls (`tool_call`), BPM changes
  (`bpm`), and startup (`server`). Adds `GET /api/logs/stats`, `GET /api/logs/export`
  (JSON/CSV), `DELETE /api/logs`; ring buffer raised to 2000 with `meta`, `kind`,
  `sort`, and `after_id` support. Logs page gains a kind filter and server-side export.
- **Local Intelligence (fleet standard)**: Settings auto-detects Ollama/LM Studio/
  vLLM, resolves the default model resident-first (never evicting a loaded model,
  via `/api/ps` + `/api/tags`), and on multi-GPU machines routes local models to
  the secondary card via a GPU selector. New backend `GET /api/llm/gpus` and
  `GET /api/llm/detect`; canonical `llm_detect.py` + `model-preference.ts` helpers.
- **projectM presets**: bundled MilkDrop presets from projectM's packs, converted to
  butterchurn JSON. `ProjectM Original` (513) loads eagerly; the large
  `ProjectM Cream Geo` (996) and `ProjectM Cream Particles` (375) packs lazy-load
  only when browsed, keeping the initial page load lean (code-split chunks).
- **Live preset gallery**: the Presets page now renders each butterchurn visualizer
  as its own animated thumbnail. Cards animate while visible (capped at ~16
  concurrent WebGL contexts via a slot pool), with search, category/author filters,
  favorites, slideshow, and one-click fullscreen.

### Fixed
- **Preset cards rendered black / stopped animating**: each card created its own
  `AudioContext`, which browsers suspend without a user gesture (autoplay policy),
  so the visualizer produced no audio and rendered black. Cards now share one
  app-lifetime AudioContext resumed on first user interaction; captured stills are
  correct, and cards keep animating while visible (still is a fallback layer).
- **Logs page only ever showed the startup entry**: no request logging existed.
  Added request-middleware + tool-call logging so `/logs` shows real activity.
- **Launcher hang**: `start.ps1` blocked forever on `Receive-Job -Wait` (the vite dev
  server never exits). The frontend now launches as a detached background process and
  the script returns immediately.
- **Frontend never started**: `bun` was not on the detached shell's PATH, so the
  hidden `pwsh` could not find it and vite never launched. `start.ps1` now resolves
  the full bun path (`~\.bun\bin\bun.exe` fallback).
- **Backend crash on start**: the venv was missing `python-dotenv` (declared in
  `pyproject.toml` but not installed), causing a `ModuleNotFoundError` on import.

## [0.1.0] - 2026-07-22

### Added
- FastMCP 3.4+ server with stdio and HTTP (`/mcp`) transports.
- `get_bpm` / `set_bpm` MCP tools for mixx-dj-mcp beat sync.
- Butterchurn MilkDrop visualizer engine (500+ community presets).
- GLSL Shader engine (6 bundled WebGL2 scenes) in the webapp Toolbox.
- Full-screen Vite dashboard with Toolbox, Presets, Visualizer, Chat, Settings,
  Logs, and Help pages.
- REST API: `/health`, `/api/capabilities`, `/api/visualizers`, `/api/dashboard`,
  `/api/tools`, `/api/skills`, `/api/logs`, `/api/bpm`.
- `start.ps1` one-shot launcher for backend + frontend.
