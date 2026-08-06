"""FastMCP 3.4+ — butterchurn visualizer host with BPM sync."""

from __future__ import annotations

import time

from fastmcp import FastMCP

from butterchurn_mcp.bpm_state import read_bpm, write_bpm
from butterchurn_mcp.log_buffer import append_log

_start_time = time.time()

mcp = FastMCP(
    "butterchurn-mcp",
    instructions=(
        "MilkDrop-style audio-reactive WebGL visualizer via butterchurn. "
        "Use get_bpm to read the current BPM, set_bpm to sync the beat "
        "(e.g. from mixx-dj-mcp during a DJ set)."
    ),
)


def _uptime() -> float:
    return time.time() - _start_time


@mcp.tool()
async def get_bpm() -> dict:
    """Get the current BPM driving the visualizer."""
    return {"success": True, "bpm": read_bpm()}


@mcp.tool()
async def set_bpm(bpm: int) -> dict:
    """Set the BPM for visualizer beat sync.

    Accepts BPM values between 60 and 200. Used by mixx-dj-mcp to sync
    the visualizer to a DJ set's beat.
    """
    if not (60 <= bpm <= 200):
        return {"success": False, "error": "BPM must be between 60 and 200"}
    write_bpm(bpm)
    append_log(level="INFO", kind="bpm", detail=f"BPM set to {bpm} via MCP tool")
    return {"success": True, "bpm": read_bpm()}
