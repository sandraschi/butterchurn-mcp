"""CLI: stdio or HTTP."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import subprocess
import sys
import time

import uvicorn

from butterchurn_mcp.config import load_settings
from butterchurn_mcp.server import mcp

_start_time = time.time()


def _clear_port(port: int) -> None:
    """Kill any process listening on `port` (stale/background server)."""
    if os.name != "nt":
        return
    try:
        out = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout
    except Exception:
        return
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        try:
            local = parts[1]
            pid = int(parts[4])
        except (ValueError, IndexError):
            continue
        if local.endswith(f":{port}") and parts[3] == "LISTENING" and pid not in (0, 4):
            try:
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, timeout=10)
                print(f"[butterchurn-mcp] cleared stale listener on port {port} (pid {pid})")
            except Exception:
                continue


def _configure_logging(*, debug: bool) -> None:
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(level=level, format="%(message)s", stream=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="butterchurn-mcp (FastMCP 3.4+)")
    parser.add_argument("--serve", action="store_true", help="Run FastAPI + MCP HTTP")
    parser.add_argument("--stdio", action="store_true", help="MCP stdio (default)")
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--host", default=None, help="Bind host")
    parser.add_argument("--port", type=int, default=None, help="Bind port")
    args, _ = parser.parse_known_args()

    _configure_logging(debug=args.debug)

    transport = os.getenv("MCP_TRANSPORT", "").lower()
    use_http = args.serve or transport in {"http", "streamable"}
    if use_http and args.stdio:
        parser.error("Choose either --serve or --stdio, not both.")

    settings = load_settings()
    host = args.host or settings.host
    port = args.port or settings.port

    if use_http:
        if args.serve:
            _clear_port(port)
        uvicorn.run(
            "butterchurn_mcp.app:app",
            host=host,
            port=port,
            log_level="debug" if args.debug else "info",
        )
        return

    asyncio.run(mcp.run_stdio_async())


if __name__ == "__main__":
    main()
