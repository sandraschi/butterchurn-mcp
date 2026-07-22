"""PyInstaller entry point — dual transport."""
import os
import sys

sys.path.insert(0, "src")

port = os.environ.get("MCP_PORT") or os.environ.get("PORT")
if port:
    host = os.environ.get("MCP_HOST", "127.0.0.1")
    sys.argv = ["run_server.py", "--serve", "--host", host, "--port", str(port)]

from butterchurn_mcp.__main__ import main

main()
