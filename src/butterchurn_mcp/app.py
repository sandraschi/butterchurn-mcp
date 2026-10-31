"""FastAPI app - health, BPM endpoint, MCP HTTP mount, fleet webapp APIs."""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from butterchurn_mcp import llm_providers
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
    """Enumerate NVIDIA GPUs (index, name, VRAM used/total/free) for target-GPU placement.

    Shape matches the fleet template (total_mb/used_mb/free_mb); vramMb is kept
    as a compat alias for the legacy modelPreference helper.
    """
    gpus = await asyncio.to_thread(llm_providers.gpu_vram)
    compat = [
        {
            "index": g["index"],
            "name": g["name"],
            "vramMb": g["total_mb"],
            "total_mb": g["total_mb"],
            "used_mb": g["used_mb"],
            "free_mb": g["free_mb"],
        }
        for g in gpus
    ]
    return {"gpus": compat, "count": len(compat)}


class LlmSettingsWriteIn(BaseModel):
    provider: str = Field(default="ollama")
    endpoint: str = Field(default="http://127.0.0.1:11434")
    model: str = Field(default="")
    api_key: str | None = Field(default=None, description="Write-only; stored in 0600 keystore")
    select: bool = Field(
        default=True,
        description="False saves a card key without switching the active selection (BUG-043)",
    )


@app.get("/api/settings/llm")
async def api_llm_settings_get() -> dict[str, Any]:
    """Read saved LLM provider config from data dir (key bytes never returned)."""
    settings = load_settings()
    path = settings.resolved_data_dir() / "llm_settings.json"
    base: dict[str, Any] = {"provider": "ollama", "endpoint": "http://127.0.0.1:11434", "model": ""}
    if path.is_file():
        try:
            base.update(json.loads(path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            pass
    base.pop("api_key", None)
    base["keys_configured"] = llm_providers.keys_configured(settings)
    return base


@app.post("/api/settings/llm")
async def api_llm_settings_save(body: LlmSettingsWriteIn) -> dict[str, Any]:
    """Save LLM provider config; key goes to the keystore only. Never auto-picks.

    Saving an ollama selection switches VRAM (evict rest, warm chosen) so a
    leftover hog cannot keep blocking the new choice. Empty model clears the
    selection and evicts everything.
    """
    settings = load_settings()
    try:
        llm_providers.require_provider(body.provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not body.select:
        if not body.api_key:
            raise HTTPException(status_code=400, detail="api_key required when select is false") from None
        try:
            llm_providers.save_key(body.provider, body.api_key, settings)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"success": True, "key_saved": True, "select": False}
    payload = {"provider": body.provider, "endpoint": body.endpoint, "model": body.model}
    path = settings.resolved_data_dir() / "llm_settings.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    key_saved = False
    if body.api_key:
        try:
            llm_providers.save_key(body.provider, body.api_key, settings)
            key_saved = True
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    switch: dict[str, Any] = {}
    if body.provider == "ollama":
        # Empty model = kick-out: evict everything, warm nothing.
        switch = await llm_providers.switch_ollama_model(body.model.strip(), body.endpoint)
    return {"success": True, **payload, "key_saved": key_saved, "switch": switch}


@app.delete("/api/settings/llm/key")
async def api_llm_key_delete(provider: str = Query(...)) -> dict[str, Any]:
    """Delete one stored cloud API key."""
    try:
        removed = llm_providers.delete_key(provider, load_settings())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "provider": provider, "removed": removed}


class LlmUnloadIn(BaseModel):
    provider: str = Field(default="ollama")
    endpoint: str = Field(default="http://127.0.0.1:11434")


@app.post("/api/llm/unload")
async def api_llm_unload(body: LlmUnloadIn) -> dict[str, Any]:
    """Kick every loaded model out of the local engine (full VRAM release)."""
    if body.provider != "ollama":
        raise HTTPException(status_code=400, detail="unload needs the ollama provider")
    switch = await llm_providers.switch_ollama_model("", body.endpoint)
    if not switch.get("engine"):
        raise HTTPException(status_code=502, detail="Ollama engine unreachable - start it first")
    return {"success": True, "provider": body.provider, **switch}


@app.get("/api/llm/loaded")
async def api_llm_loaded(provider: str = Query(...), endpoint: str = Query(default="")) -> dict[str, Any]:
    """Models currently resident on the local engine (name + VRAM + expiry)."""
    if provider != "ollama":
        raise HTTPException(status_code=400, detail="loaded residents need the ollama provider")
    base = endpoint.rstrip("/") or "http://127.0.0.1:11434"
    return {"success": True, "provider": provider, **await llm_providers.ollama_loaded(base)}


@app.get("/api/llm/providers")
async def api_llm_providers() -> dict[str, Any]:
    """Provider registry with live local detection + cloud key flags (no key bytes)."""
    settings = load_settings()
    infos = llm_providers.public_provider_info(settings)
    locals_ = [i for i in infos if i["kind"] == "local"]
    probes = await asyncio.gather(*(llm_providers.probe_local(i["id"]) for i in locals_))
    for info, (reachable, models) in zip(locals_, probes, strict=True):
        info["detected"] = reachable
        info["models"] = models
    for info in infos:
        if info["kind"] == "cloud":
            info["detected"] = info["configured"]
            info["models"] = []
    return {"providers": infos}


@app.get("/api/llm/models")
async def api_llm_models(provider: str = Query(...)) -> dict[str, Any]:
    """Model list for one provider: live when reachable/keyed, else curated."""
    try:
        return await llm_providers.list_models(provider, load_settings())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


class LlmTestIn(BaseModel):
    provider: str = Field(...)
    api_key: str | None = Field(default=None, description="Typed-but-unsaved key; validated only, never stored")
    endpoint: str = Field(default="")


@app.post("/api/llm/test")
async def api_llm_test(body: LlmTestIn) -> dict[str, Any]:
    """Validate a provider without saving anything.

    ok is True only for a live list -- curated names without a key come back
    ok:false with key_missing so the UI never reports them as success (BUG-042).
    """
    try:
        result = await llm_providers.list_models(body.provider, load_settings(), body.api_key or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    ok = result.get("source") == "live" and len(result.get("models", [])) > 0
    return {"success": True, "ok": ok, **result}


class LlmChatIn(BaseModel):
    provider: str = Field(...)
    model: str = Field(..., min_length=1)
    messages: list[dict[str, Any]] = Field(..., min_length=1)


@app.post("/api/llm/chat")
async def api_llm_chat(body: LlmChatIn) -> dict[str, Any]:
    """Non-streaming chat via the backend proxy (keys never leave the server)."""
    try:
        content = await llm_providers.chat_complete(body.provider, body.model, body.messages, load_settings())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"provider": body.provider, "model": body.model, "content": content}


@app.post("/api/llm/chat/stream")
async def api_llm_chat_stream(body: LlmChatIn) -> StreamingResponse:
    """Streaming chat (SSE, OpenAI-style chunks) via the backend proxy."""
    settings = load_settings()
    try:
        llm_providers.require_provider(body.provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not body.model.strip():
        raise HTTPException(status_code=400, detail="Empty model name")
    gen = llm_providers.chat_stream(body.provider, body.model, body.messages, settings)
    return StreamingResponse(gen, media_type="text/event-stream")


@app.get("/api/llm/onboarding")
async def api_llm_onboarding() -> dict[str, Any]:
    """Fresh-install starter facts: what exists, what can be installed, best path."""
    return llm_providers.onboarding_state(load_settings())


class LlmInstallIn(BaseModel):
    engine: str = Field(...)


@app.post("/api/llm/install")
async def api_llm_install(body: LlmInstallIn) -> dict[str, Any]:
    """Start a fixed-command engine install (allowlist: ollama)."""
    try:
        return llm_providers.start_install(body.engine.strip().lower())
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/llm/install/status")
async def api_llm_install_status(engine: str = Query(...)) -> dict[str, Any]:
    """Poll a background engine install: idle | running | done | error."""
    try:
        return llm_providers.install_status(engine.strip().lower())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/llm/detect")
async def api_llm_detect():
    """Local LLM detection + recommendation (GPU tier, installed + loaded Ollama models)."""
    import json as _json
    import urllib.request

    gpu = await asyncio.to_thread(detect_gpu)
    result = detect()

    # Loaded (resident) models from Ollama /api/ps - probed server-side to avoid
    # browser CORS hangs against localhost.
    loaded: list[str] = []
    try:
        with await asyncio.to_thread(urllib.request.urlopen, "http://127.0.0.1:11434/api/ps", timeout=3) as resp:
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
    entries = list_logs(limit=limit, level=level, kind=kind, search=search, sort=sort, after_id=after_id)
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
        writer = csv.DictWriter(buf, fieldnames=["timestamp", "level", "kind", "detail", "meta"])
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
if _webapp_dir is not None:
    assets_dir = _webapp_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{spa_path:path}")
    async def spa_fallback(spa_path: str, _root: Path = _webapp_dir):
        if spa_path.startswith(("api/", "mcp", "docs", "redoc", "openapi.json", "health")):
            return JSONResponse({"success": False, "message": "Not found"}, status_code=404)
        candidate = _root / spa_path
        if candidate.is_file():
            return FileResponse(candidate)
        index = _root / "index.html"
        if index.is_file():
            return FileResponse(index)
        return JSONResponse({"success": False, "message": "Webapp not built"}, status_code=404)
