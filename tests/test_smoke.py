"""Smoke tests for butterchurn-mcp (assfix 2026-10-02 - repo had no tests/)."""

import asyncio


def test_bpm_roundtrip():
    from butterchurn_mcp.server import get_bpm, set_bpm

    assert asyncio.run(set_bpm(128)) == {"success": True, "bpm": 128}
    assert asyncio.run(get_bpm())["bpm"] == 128
    bad = asyncio.run(set_bpm(1))
    assert bad["success"] is False


def test_shutdown_requires_confirm():
    from butterchurn_mcp.server import butterchurn_shutdown

    msg = asyncio.run(butterchurn_shutdown())
    assert "confirmed" in msg


def test_health_and_capabilities():
    from fastapi.testclient import TestClient

    from butterchurn_mcp.app import app

    client = TestClient(app)
    assert client.get("/api/health").status_code == 200
    cap = client.get("/api/capabilities")
    assert cap.status_code == 200
    assert "butterchurn" in cap.text
