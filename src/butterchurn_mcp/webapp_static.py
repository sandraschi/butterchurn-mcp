"""Resolve built webapp assets (webapp/dist) for FastAPI static mount."""

from __future__ import annotations

import sys
from pathlib import Path


def repo_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent.parent.parent


def webapp_dist_dir() -> Path | None:
    import os

    override = os.environ.get("BUTTERCHURN_WEBAPP_DIR", "").strip()
    if override:
        path = Path(override)
        return path if (path / "index.html").is_file() else None

    candidate = repo_root() / "webapp" / "dist"
    if (candidate / "index.html").is_file():
        return candidate
    return None
