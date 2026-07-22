"""Settings from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    mcp_http_path: str
    default_bpm: int

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            host=os.getenv("BUTTERCHURN_MCP_HOST", "127.0.0.1"),
            port=int(os.getenv("BUTTERCHURN_MCP_PORT", "11124")),
            mcp_http_path=os.getenv("BUTTERCHURN_MCP_HTTP_PATH", "/mcp"),
            default_bpm=int(os.getenv("BUTTERCHURN_MCP_DEFAULT_BPM", "128")),
        )


def load_settings() -> Settings:
    return Settings.from_env()
