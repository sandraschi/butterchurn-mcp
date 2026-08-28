"""In-memory log ring buffer for /api/logs (fleet WEBAPP_LOGS_PAGE standard)."""

from __future__ import annotations

import os
import time
import uuid
from collections import deque
from dataclasses import asdict, dataclass, field

_MAX = int(os.getenv("BUTTERCHURN_LOG_MAX_ENTRIES", "2000"))
_entries: deque[dict] = deque(maxlen=_MAX)


@dataclass(frozen=True)
class LogEntry:
    id: str
    timestamp: str
    level: str
    kind: str
    detail: str
    meta: dict = field(default_factory=dict)


def append_log(*, level: str, kind: str, detail: str, meta: dict | None = None) -> None:
    _entries.append(
        asdict(
            LogEntry(
                id=f"{time.time():.6f}-{uuid.uuid4().hex[:6]}",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
                level=level.upper(),
                kind=kind,
                detail=detail,
                meta=meta or {},
            )
        )
    )


def list_logs(
    *,
    limit: int = 100,
    level: str = "",
    kind: str = "",
    search: str = "",
    sort: str = "desc",
    after_id: str = "",
) -> list[dict]:
    items = list(_entries)
    if level:
        items = [e for e in items if e["level"] == level.upper()]
    if kind:
        items = [e for e in items if e["kind"] == kind]
    if search:
        needle = search.lower()
        items = [
            e
            for e in items
            if needle in e["detail"].lower()
            or needle in e["kind"].lower()
            or needle in str(e.get("meta", {})).lower()
        ]
    if after_id:
        try:
            after_ts = float(after_id.split("-")[0])
        except (ValueError, IndexError):
            after_ts = 0.0
        items = [e for e in items if float(e["id"].split("-")[0]) > after_ts]
    items.sort(key=lambda e: e["timestamp"], reverse=(sort == "desc"))
    return items[:limit]


def log_stats() -> dict:
    return {"entries": len(_entries), "max_entries": _MAX}


def clear_logs() -> int:
    n = len(_entries)
    _entries.clear()
    return n
