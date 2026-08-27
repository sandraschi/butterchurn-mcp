# butterchurn-mcp — Product Requirements Document

**Status:** Active (alpha) | **Version:** 0.1.0 | **Date:** 2026-08-27

---

## 1. Executive Summary

butterchurn-mcp is a FastMCP 3.4+ server that delivers **audio-reactive WebGL
visualizations** in a full-screen browser dashboard. It ships two engines:

1. **GLSL Shaders** — modern WebGL2 scenes (6 bundled) for a clean, contemporary look.
2. **Butterchurn / MilkDrop** — the classic Winamp-style preset engine with
   **500+ community presets** for retro nostalgia.

It doubles as the **visual output arm** of the fleet's music stack: a BPM clock
(`get_bpm` / `set_bpm`, REST `/api/bpm`) lets [mixx-dj-mcp] sync the visualizer's
beat to a live DJ set.

**Runtime:** backend `:10878` (FastAPI + MCP HTTP at `/mcp`), frontend `:10879`
(Vite SPA). All rendering happens client-side in WebGL; Python serves data + the
beat clock. No external account or host app required.

---

## 2. Goals

| Goal | Success metric |
|------|----------------|
| Full-screen MilkDrop visualizer | `/visualizer` renders preset at 60fps in browser |
| Browse every visualizer | `/presets` gallery lists all 500+ presets |
| See visualizers without launching each | Live animated thumbnails in the gallery |
| DJ beat sync | `set_bpm` / `POST /api/bpm` drives the beat generator |
| One-shot local launch | `start.ps1` brings up backend + frontend, opens browser |
| Dual transport | stdio (MCP clients) and HTTP (`--serve`) |

---

## 3. MCP tool surface

### BPM control (2 tools)

| Tool | Purpose |
|------|---------|
| `get_bpm` | Read current BPM |
| `set_bpm(bpm)` | Set BPM (60–200); logs the change |

Small surface by design — the product's value is the visualizer + gallery, not a
tool sprawl.

---

## 4. Key requirements

1. Backend healthy before frontend waits; `start.ps1` must not hang.
2. `bun` resolvable by the detached launcher (full-path fallback).
3. Gallery renders every preset with a **live animated thumbnail** (up to ~12
   concurrent WebGL contexts, cards activate on scroll).
4. Presets load client-side from `butterchurn-presets` (Main, Extra, Extra 2,
   MD1, Minimal, Non-Minimal packs).
5. BPM clamps to 60–200; state is in-memory (default 128).
6. Secrets never persisted in the UI or logs; no API keys required.

---

## 5. Non-goals

- No audio synthesis / playback (drives visuals only).
- No frame streaming from Python (client-side WebGL only).
- No cloud/account dependency.

---

## 6. Status

| Area | State |
|------|-------|
| MCP BPM tools (2) | Implemented |
| Butterchurn engine | Implemented |
| GLSL Shader engine (6 scenes) | Implemented |
| Presets gallery (500+) | Implemented |
| Live gallery thumbnails | Implemented |
| REST API + `/mcp` | Implemented |
| Webapp (full route set) | Implemented |
| `start.ps1` launcher | Fixed (no-hang, bun resolution) |

---

*See [README](../README.md) for quick start, [ARCHITECTURE](./ARCHITECTURE.md) for
design, [TOOLS](./TOOLS.md) for the tool/API reference.*

[mixx-dj-mcp]: https://github.com/sandraschi/mixx-dj-mcp
