"""Seed the ClearPath Nexus database with demo corridor data."""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from geoalchemy2 import WKTElement
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine
from app.models.route import Base, LineSegment, PortBerth, Station


STATIONS = [
    ("Nagpur Junction", "NGP", 21.1458, 79.0882),
    ("Bhusaval Junction", "BSL", 21.0455, 75.7849),
    ("Manmad Junction", "MMR", 20.2500, 74.4333),
    ("Kalyan Junction", "KYN", 19.2433, 73.1305),
    ("Mumbai Port (JNPT)", "JNPT", 18.9497, 72.9512),
    ("Pune Junction", "PUNE", 18.5285, 73.8740),
]

SEGMENTS = [
    ("NGP", "BSL", 5.5, 3.5, 150.0, 1.2, 0.5, [(21.1458, 79.0882), (21.0455, 75.7849)]),
    ("BSL", "MMR", 5.0, 3.2, 140.0, 1.0, 0.3, [(21.0455, 75.7849), (20.2500, 74.4333)]),
    ("MMR", "KYN", 4.8, 3.2, 130.0, 1.5, 0.8, [(20.2500, 74.4333), (19.2433, 73.1305)]),
    ("KYN", "JNPT", 4.5, 3.0, 120.0, 1.8, 1.2, [(19.2433, 73.1305), (18.9497, 72.9512)]),
    ("NGP", "PUNE", 5.2, 3.4, 135.0, 1.1, 0.4, [(21.1458, 79.0882), (18.5285, 73.8740)]),
    ("PUNE", "KYN", 4.6, 3.1, 125.0, 1.3, 0.6, [(18.5285, 73.8740), (19.2433, 73.1305)]),
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        station_map: dict[str, Station] = {}
        for name, code, lat, lon in STATIONS:
            station = Station(
                id=uuid.uuid4(),
                name=name,
                code=code,
                coordinates=WKTElement(f"POINT({lon} {lat})", srid=4326),
            )
            session.add(station)
            station_map[code] = station
        await session.flush()

        for src, dst, h, w, wt, cong, delay, coords in SEGMENTS:
            line_wkt = "LINESTRING(" + ", ".join(f"{lon} {lat}" for lat, lon in coords) + ")"
            segment = LineSegment(
                id=uuid.uuid4(),
                source_station_id=station_map[src].id,
                dest_station_id=station_map[dst].id,
                max_height_clearance=h,
                max_width_clearance=w,
                max_weight_capacity=wt,
                congestion_factor=cong,
                historical_delay_hours=delay,
                geom_path=WKTElement(line_wkt, srid=4326),
            )
            session.add(segment)

        now = datetime.now(timezone.utc)
        berth = PortBerth(
            id=uuid.uuid4(),
            port_name="JNPT Mumbai",
            berth_identifier="T2-P4",
            vessel_name="MAERSK_X26",
            window_start=now + timedelta(hours=12),
            window_end=now + timedelta(hours=48),
        )
        session.add(berth)
        await session.commit()
        print("Database seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
