"""In-memory log ring buffer for /api/logs."""

from __future__ import annotations

import time
import uuid
from collections import deque
from dataclasses import asdict, dataclass

_MAX = 500
_entries: deque[dict] = deque(maxlen=_MAX)


@dataclass(frozen=True)
class LogEntry:
    id: str
    timestamp: str
    level: str
    kind: str
    detail: str


def append_log(*, level: str, kind: str, detail: str) -> None:
    _entries.append(
        asdict(
            LogEntry(
                id=str(uuid.uuid4()),
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
                level=level.upper(),
                kind=kind,
                detail=detail,
            )
        )
    )


def list_logs(*, limit: int = 100, level: str = "", search: str = "") -> list[dict]:
    items = list(_entries)
    if level:
        items = [e for e in items if e["level"] == level.upper()]
    if search:
        needle = search.lower()
        items = [e for e in items if needle in e["detail"].lower() or needle in e["kind"].lower()]
    return items[-limit:]
