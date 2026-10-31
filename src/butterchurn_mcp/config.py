"""Settings from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    mcp_http_path: str
    default_bpm: int
    data_dir: str = ""

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            host=os.getenv("BUTTERCHURN_MCP_HOST", "127.0.0.1"),
            port=int(os.getenv("BUTTERCHURN_MCP_PORT", "10878")),
            mcp_http_path=os.getenv("BUTTERCHURN_MCP_HTTP_PATH", "/mcp"),
            default_bpm=int(os.getenv("BUTTERCHURN_MCP_DEFAULT_BPM", "128")),
            data_dir=os.getenv("BUTTERCHURN_MCP_DATA_DIR", ""),
        )

    def resolved_data_dir(self) -> Path:
        """Writable dir for llm_settings.json + keystore. Created on demand."""
        if self.data_dir.strip():
            p = Path(self.data_dir).expanduser()
        else:
            p = Path.home() / ".butterchurn-mcp"
        p.mkdir(parents=True, exist_ok=True)
        return p


def load_settings() -> Settings:
    return Settings.from_env()
