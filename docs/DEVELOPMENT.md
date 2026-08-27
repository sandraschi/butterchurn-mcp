# Development Setup

> Onboarding: **N/A** — butterchurn-mcp wraps no host application and needs no
> online account. Install + run is all that's required (see INSTALL.md).

## Tools Required

Install all of these before continuing:

```powershell
# Windows (winget)
winget install astral-sh.uv
winget install Git.Git
winget install Casey.Just
```

Bun is required for the webapp (not available via winget on all machines):
install from https://bun.sh/docs/installation — the fleet standard location is
`C:\Users\<you>\.bun\bin\bun.exe`.

Verify:

```powershell
uv --version
git --version
just --version
& "$env:USERPROFILE\.bun\bin\bun.exe" --version
```

## Setup

```powershell
git clone https://github.com/sandraschi/butterchurn-mcp
cd butterchurn-mcp
uv sync
cd webapp; bun install; cd ..
```

## Running

```powershell
just serve     # backend :10878 (FastAPI + MCP at /mcp)
just web       # Vite dev server :10879 (separate terminal)
# or
.\start.ps1    # both, opens browser, returns
```

## Common Tasks

```powershell
just lint       # ruff check src/
just check      # ruff check + ruff format --check
just fmt        # ruff format src/
just test       # pytest -v
just build-web  # cd webapp; bun run build
just clean      # remove dist, caches, node_modules
```

The webapp uses **Biome** for JS/TS lint + format:
`cd webapp; bun run biome check --write src/`.

## Project layout

```
src/butterchurn_mcp/   Python package (server, app, config, bpm, logs)
webapp/src/            React + Vite + Tailwind frontend
  ├── pages/           Dashboard, Toolbox, Presets, Visualizer, Tools, ...
  ├── components/      PresetPreview, PresetThumb, Visualizer, modals
  ├── hooks/           usePresetCanvas, usePresetSlot, useAudioEngine
  ├── lib/             presets, PresetsContext, types, provider
  └── visualizers/     shader scenes + engine registry
```

## Code Standards

Follow the fleet standards in
[`mcp-central-docs`](https://github.com/sandraschi/mcp-central-docs):

- FastMCP 3.4+ tool design and portmanteau patterns
- React + Vite + Tailwind (dark theme) webapp conventions
- ruff (Python) and Biome (JS/TS) linting
