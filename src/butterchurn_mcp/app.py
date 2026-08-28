"""FastAPI app - health, BPM endpoint, MCP HTTP mount, fleet webapp APIs."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from butterchurn_mcp.bpm_state import read_bpm, write_bpm
from butterchurn_mcp.config import load_settings
from butterchurn_mcp.llm_detect import detect, detect_gpu
from butterchurn_mcp.log_buffer import append_log, clear_logs, list_logs, log_stats
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
        "http://localhost:10879",
        "http://127.0.0.1:10879",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_origin_regex=r"https?://(?:[a-zA-Z0-9-]+\.ts\.net|.*?\.tail-[a-f0-9]+\.ts\.net|tauri\.localhost|localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$|^tauri://localhost$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _request_logger(request, call_next):
    import time as _t

    start = _t.time()
    try:
        response = await call_next(request)
    except Exception:
        append_log(level="ERROR", kind="http", detail=f"{request.method} {request.url.path} failed")
        raise
    dur_ms = round((_t.time() - start) * 1000, 1)
    path = request.url.path
    if path.startswith("/api/") and path != "/api/logs":
        append_log(
            level="INFO" if response.status_code < 400 else "WARNING",
            kind="http",
            detail=f"{request.method} {path} -> {response.status_code} ({dur_ms}ms)",
            meta={"method": request.method, "path": path, "status": response.status_code, "ms": dur_ms},
        )
    return response


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
        "ports": {"backend": settings.port, "frontend": 10879},
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


@app.get("/api/llm/gpus")
async def api_llm_gpus():
    """Enumerate NVIDIA GPUs (index, name, vramMb) for target-GPU placement."""
    import subprocess

    gpus = []
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=index,name,memory.total",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5,
        )
        if out.returncode == 0:
            for line in out.stdout.strip().splitlines():
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 3:
                    try:
                        gpus.append({
                            "index": int(parts[0]),
                            "name": parts[1],
                            "vramMb": int(parts[2]),
                        })
                    except (ValueError, IndexError):
                        continue
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return {"gpus": gpus, "count": len(gpus)}


@app.get("/api/llm/detect")
async def api_llm_detect():
    """Local LLM detection + recommendation (GPU tier, installed + loaded Ollama models)."""
    import json as _json
    import urllib.request

    gpu = detect_gpu()
    result = detect()

    # Loaded (resident) models from Ollama /api/ps - probed server-side to avoid
    # browser CORS hangs against localhost.
    loaded: list[str] = []
    try:
        with urllib.request.urlopen("http://localhost:11434/api/ps", timeout=3) as resp:
            ps = _json.loads(resp.read())
        loaded = [m.get("name", "") for m in ps.get("models", []) if m.get("name")]
    except Exception:
        loaded = []

    return {
        "gpu": {
            "available": gpu.available,
            "name": gpu.name,
            "vramMb": gpu.vram_mb,
            "vramGb": gpu.vram_gb,
            "tierLabel": gpu.tier_label,
        },
        "ollama": {
            "available": result.ollama.available,
            "models": result.ollama.models,
            "loaded": loaded,
        },
        "mode": result.mode,
    }


@app.get("/api/logs")
async def api_logs(
    limit: int = Query(default=100, ge=1, le=500),
    level: str = Query(default=""),
    kind: str = Query(default=""),
    search: str = Query(default=""),
    sort: str = Query(default="desc"),
    after_id: str = Query(default=""),
):
    entries = list_logs(
        limit=limit, level=level, kind=kind, search=search, sort=sort, after_id=after_id
    )
    stats = log_stats()
    return {
        "entries": entries,
        "count": len(entries),
        "total": stats["entries"],
        "limit": limit,
        "max_entries": stats["max_entries"],
        "sort": sort,
    }


@app.get("/api/logs/stats")
async def api_logs_stats():
    return log_stats()


@app.get("/api/logs/export")
async def api_logs_export(
    level: str = Query(default=""),
    kind: str = Query(default=""),
    search: str = Query(default=""),
    format: str = Query(default="json"),
):
    import json as _json

    entries = list_logs(limit=2000, level=level, kind=kind, search=search, sort="desc")
    if format == "csv":
        import csv
        import io

        buf = io.StringIO()
        writer = csv.DictWriter(
            buf, fieldnames=["timestamp", "level", "kind", "detail", "meta"]
        )
        writer.writeheader()
        for e in entries:
            writer.writerow(
                {
                    "timestamp": e["timestamp"],
                    "level": e["level"],
                    "kind": e["kind"],
                    "detail": e["detail"],
                    "meta": _json.dumps(e.get("meta", {})),
                }
            )
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=butterchurn-logs.csv"},
        )
    return Response(
        content=_json.dumps({"entries": entries}, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=butterchurn-logs.json"},
    )


@app.delete("/api/logs")
async def api_logs_clear():
    cleared = clear_logs()
    append_log(level="INFO", kind="server", detail=f"Log buffer cleared ({cleared} entries)")
    return {"cleared": cleared}


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
