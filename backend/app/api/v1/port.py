from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.route import PortBerth
from app.schemas.port import PortBerthResponse, PortSyncStatus
from app.services.port_sync import compute_port_sync_score, fetch_port_schedule

router = APIRouter()


@router.get("/berths", response_model=list[PortBerthResponse])
async def list_berths(db: AsyncSession = Depends(get_db)) -> list[PortBerthResponse]:
    result = await db.execute(select(PortBerth))
    return list(result.scalars().all())


@router.get("/sync-status", response_model=PortSyncStatus)
async def port_sync_status(
    port_id: str = "JNPT_MUMBAI",
    vessel_id: str = "MAERSK_X26",
    train_arrival_hours: float = 24.0,
) -> PortSyncStatus:
    data = await fetch_port_schedule(port_id, vessel_id)
    score, warning = compute_port_sync_score(train_arrival_hours, data["loading_window"])
    start = datetime.fromisoformat(data["loading_window"]["start_time"].replace("Z", "+00:00"))
    end = datetime.fromisoformat(data["loading_window"]["end_time"].replace("Z", "+00:00"))
    return PortSyncStatus(
        aligned=score >= 60 and warning is None,
        berth_id=data["berth_id"],
        vessel_status=data["vessel_status"],
        loading_window_start=start,
        loading_window_end=end,
        sync_score=round(score, 1),
        warning=warning,
    )
