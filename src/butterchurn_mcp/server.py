"""FastMCP 3.4+ - butterchurn visualizer host with BPM sync."""

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


@mcp.tool(annotations={"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False})
async def get_bpm() -> dict:
    """Get the current BPM driving the visualizer.

    ## Return Format
    Dict with keys: success, bpm

    ## Examples
    ```python
    await call_tool("get_bpm")
    ```
    """
    bpm = read_bpm()
    append_log(level="INFO", kind="tool_call", detail="get_bpm (ok)", meta={"tool": "get_bpm", "bpm": bpm})
    return {"success": True, "bpm": bpm}


@mcp.tool(
    annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False}
)
async def set_bpm(bpm: int) -> dict:
    """Set the BPM for visualizer beat sync.

    Accepts BPM values between 60 and 200. Used by mixx-dj-mcp to sync
    the visualizer to a DJ set's beat.

    ## Return Format
    Dict with keys: success, bpm (or success, error)

    ## Examples
    ```python
    await call_tool("set_bpm", {"bpm": 128})
    ```
    """
    if not (60 <= bpm <= 200):
        append_log(
            level="ERROR", kind="tool_call", detail=f"set_bpm invalid {bpm}", meta={"tool": "set_bpm", "bpm": bpm}
        )
        return {"success": False, "error": "BPM must be between 60 and 200"}
    write_bpm(bpm)
    append_log(level="INFO", kind="tool_call", detail=f"set_bpm -> {bpm}", meta={"tool": "set_bpm", "bpm": bpm})
    return {"success": True, "bpm": read_bpm()}


@mcp.tool(annotations={"readOnlyHint": False, "destructiveHint": True, "idempotentHint": False, "openWorldHint": False})
async def butterchurn_shutdown(confirmed: bool = False) -> str:
    """Shut down the butterchurn-mcp server process.

    ## Return Format
    Confirmation prompt or termination notice string

    ## Examples
    ```python
    await call_tool("butterchurn_shutdown", {"confirmed": True})
    ```
    """
    if not confirmed:
        return "Refusing: pass confirmed=true to terminate the butterchurn-mcp server process."
    import os
    import signal

    os.kill(os.getpid(), signal.SIGTERM)
    return "butterchurn-mcp server terminating."
