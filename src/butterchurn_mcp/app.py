"""FastAPI app — health, BPM endpoint, MCP HTTP mount, fleet webapp APIs."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from butterchurn_mcp.bpm_state import read_bpm, write_bpm
from butterchurn_mcp.config import load_settings
from butterchurn_mcp.log_buffer import append_log, list_logs
from butterchurn_mcp.server import _uptime, mcp
from butterchurn_mcp.webapp_static import webapp_dist_dir

__version__ = "0.1.0"
MCP_TOOLS = [
    {
        "name": "get_bpm",
        "kind": "solo",
        "description": "Read current BPM driving the visualizer beat generator",
    },
    {
        "name": "set_bpm",
        "kind": "solo",
        "description": "Set BPM (60-200) for mixx-dj-mcp sync",
    },
]


class BpmPayload(BaseModel):
    bpm: int


mcp_http = mcp.http_app(path="/")

app = FastAPI(
    title="butterchurn-mcp",
    version=__version__,
    lifespan=mcp_http.lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:11125",
        "http://127.0.0.1:11125",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_origin_regex=r"https?://(?:[a-zA-Z0-9-]+\.ts\.net|.*?\.tail-[a-f0-9]+\.ts\.net|tauri\.localhost|localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$|^tauri://localhost$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup_log() -> None:
    settings = load_settings()
    append_log(
        level="INFO",
        kind="server",
        detail=f"butterchurn-mcp v{__version__} listening on {settings.host}:{settings.port}",
    )


@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
async def health():
    settings = load_settings()
    return {
        "status": "ok",
        "server": "butterchurn-mcp",
        "version": __version__,
        "uptime_seconds": _uptime(),
        "bpm": read_bpm(),
        "ports": {"backend": settings.port, "frontend": 11125},
    }


@app.get("/api/capabilities")
async def api_capabilities():
    return {
        "status": "ok",
        "server": {"name": "butterchurn-mcp", "version": __version__, "fastmcp": "3.4+"},
        "tool_surface": {
            "total": len(MCP_TOOLS),
            "portmanteau_count": 0,
            "atomic_count": len(MCP_TOOLS),
            "portmanteau_tools": [],
            "atomic_tools": [t["name"] for t in MCP_TOOLS],
        },
        "features": {
            "sampling": False,
            "agentic_workflows": False,
            "prompts": False,
            "resources": False,
            "skills": False,
        },
        "inventory": {
            "workflow_tools": [],
            "prompt_names": [],
            "resource_uris": [],
            "skill_uris": [],
        },
        "runtime": {
            "transport": "dual",
            "surface_mode": "atomic",
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.get("/api/visualizers")
async def api_visualizers():
    return {
        "success": True,
        "toolbox": True,
        "engines": [
            {
                "id": "shader",
                "name": "GLSL Shaders",
                "era": "modern",
                "runtime": "webgl2",
                "scenes": [
                    {"id": "gyroid-pulse", "name": "Gyroid Pulse", "tags": ["raymarch", "3d", "bass"]},
                    {"id": "neon-tunnel", "name": "Neon Tunnel", "tags": ["tunnel", "neon", "bpm"]},
                    {"id": "spectrum-rings", "name": "Spectrum Rings", "tags": ["2d", "spectrum"]},
                    {"id": "plasma-flow", "name": "Plasma Flow", "tags": ["2d", "plasma"]},
                    {"id": "cosmic-bloom", "name": "Cosmic Bloom", "tags": ["noise", "ambient"]},
                    {"id": "neon-grid", "name": "Neon Grid", "tags": ["grid", "synthwave"]},
                ],
            },
            {
                "id": "butterchurn",
                "name": "Butterchurn / MilkDrop",
                "era": "legacy",
                "runtime": "webgl2-butterchurn",
                "scenes": "500+ community presets (butterchurn-presets npm)",
            },
        ],
    }


@app.get("/api/dashboard")
async def api_dashboard():
    settings = load_settings()
    return {
        "success": True,
        "bpm": read_bpm(),
        "default_bpm": settings.default_bpm,
        "uptime_seconds": round(_uptime(), 1),
        "version": __version__,
        "preset_library": "butterchurn-presets (500+)",
        "shader_scenes": 6,
        "engines": ["shader", "butterchurn"],
        "companion": "mixx-dj-mcp",
    }


@app.get("/api/tools")
async def api_tools():
    return {"tools": MCP_TOOLS, "count": len(MCP_TOOLS)}


@app.get("/api/skills")
async def api_skills():
    root = Path(__file__).parent / "skills"
    skills = []
    if root.is_dir():
        for d in sorted(root.iterdir()):
            skill_md = d / "SKILL.md"
            if d.is_dir() and skill_md.is_file():
                skills.append({"name": d.name, "content": skill_md.read_text(encoding="utf-8")})
    return {"skills": skills, "count": len(skills)}


@app.get("/api/logs")
async def api_logs(
    limit: int = Query(default=100, ge=1, le=500),
    level: str = Query(default=""),
    search: str = Query(default=""),
):
    entries = list_logs(limit=limit, level=level, search=search)
    return {"entries": entries, "count": len(entries)}


@app.get("/api/bpm")
async def get_bpm():
    return {"bpm": read_bpm()}


@app.post("/api/bpm")
async def set_bpm(payload: BpmPayload):
    if not (60 <= payload.bpm <= 200):
        raise HTTPException(status_code=400, detail="BPM must be between 60 and 200")
    write_bpm(payload.bpm)
    append_log(level="INFO", kind="bpm", detail=f"BPM set to {payload.bpm} via REST")
    return {"bpm": read_bpm()}


app.mount("/mcp", mcp_http)

_webapp_dir = webapp_dist_dir()
if _webapp_dir:
    assets_dir = _webapp_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{spa_path:path}")
    async def spa_fallback(spa_path: str):
        if spa_path.startswith(("api/", "mcp", "docs", "redoc", "openapi.json", "health")):
            return JSONResponse({"success": False, "message": "Not found"}, status_code=404)
        candidate = _webapp_dir / spa_path
        if candidate.is_file():
            return FileResponse(candidate)
        index = _webapp_dir / "index.html"
        if index.is_file():
            return FileResponse(index)
        return JSONResponse({"success": False, "message": "Webapp not built"}, status_code=404)
