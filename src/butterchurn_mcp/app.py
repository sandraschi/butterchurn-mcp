"""FastAPI app — health, BPM endpoint, MCP HTTP mount."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from butterchurn_mcp.config import load_settings
from butterchurn_mcp.server import _uptime, mcp

_start_time = time.time()
_current_bpm_val: int = load_settings().default_bpm


def _update_bpm(val: int) -> None:
    global _current_bpm_val
    _current_bpm_val = val


def _read_bpm() -> int:
    return _current_bpm_val


class BpmPayload(BaseModel):
    bpm: int


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="butterchurn-mcp",
    version="0.1.0",
    lifespan=lifespan,
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


@app.get("/health")
async def health():
    settings = load_settings()
    return {
        "status": "ok",
        "server": "butterchurn-mcp",
        "version": "0.1.0",
        "uptime_seconds": _uptime(),
        "bpm": _read_bpm(),
        "port": settings.port,
    }


@app.get("/api/bpm")
async def get_bpm():
    return {"bpm": _read_bpm()}


@app.post("/api/bpm")
async def set_bpm(payload: BpmPayload):
    if not (60 <= payload.bpm <= 200):
        raise HTTPException(status_code=400, detail="BPM must be between 60 and 200")
    _update_bpm(payload.bpm)
    return {"bpm": _read_bpm()}


mcp_http = mcp.http_app(path="/")
app.mount("/mcp", mcp_http)
