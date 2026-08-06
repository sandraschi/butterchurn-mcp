"""Shared BPM state for MCP tools and REST API."""

from __future__ import annotations

from butterchurn_mcp.config import load_settings

_current_bpm: int = load_settings().default_bpm


def read_bpm() -> int:
    return _current_bpm


def write_bpm(val: int) -> int:
    global _current_bpm
    _current_bpm = val
    return _current_bpm
