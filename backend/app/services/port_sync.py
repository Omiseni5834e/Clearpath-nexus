from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

MOCK_BERTH = {
    "berth_id": "T2-P4",
    "vessel_status": "DOCKED",
    "loading_window": {
        "start_time": (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat(),
        "end_time": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat(),
    },
}


async def fetch_port_schedule(port_id: str, vessel_id: str) -> dict[str, Any]:
    url = f"{settings.MARITIME_BERTH_DATA_FEED.rstrip('/')}/berths/schedule"
    params = {"port_id": port_id, "vessel_id": vessel_id}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("Port sync fetch failed, using mock: %s", exc)
        return MOCK_BERTH


def compute_port_sync_score(train_arrival_hours: float, loading_window: dict[str, str]) -> tuple[float, str | None]:
    start = datetime.fromisoformat(loading_window["start_time"].replace("Z", "+00:00"))
    end = datetime.fromisoformat(loading_window["end_time"].replace("Z", "+00:00"))
    arrival = datetime.now(timezone.utc) + timedelta(hours=train_arrival_hours)

    if arrival < start:
        gap_hours = (start - arrival).total_seconds() / 3600
        score = max(40.0, 100.0 - gap_hours * 3)
        return score, f"Train arrives {gap_hours:.1f}h early — yard dwell risk"
    if arrival > end:
        return 0.0, "CRITICAL: Train misses vessel loading window"
    window_pct = (arrival - start).total_seconds() / max((end - start).total_seconds(), 1)
    score = 100.0 - abs(window_pct - 0.3) * 30
    return max(60.0, min(100.0, score)), None
