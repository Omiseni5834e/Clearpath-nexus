from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.route import GeneratedRoute, LineSegment, Station
from app.schemas.route import (
    AlternateRoute,
    RouteEvaluateRequest,
    RouteEvaluateResponse,
    RouteSuggestRequest,
    RouteSuggestResponse,
    ScoreBreakdown,
    SegmentPathResponse,
    StationResponse,
    ThreatSimulationRequest,
    ThreatSimulationResponse,
    TrackSegmentDetail,
    TrainPosition,
)
from app.services.port_sync import compute_port_sync_score, fetch_port_schedule
from app.services.reliability import apply_threat_simulation, calculate_route_reliability
from app.services.router_engine import (
    build_track_detail,
    compute_congestion_score,
    compute_historical_score,
    estimate_transit_hours,
    find_all_route_segments,
    find_route_segments,
    predict_transit_delay_minutes,
    resolve_train_position,
    segment_length_km,
    validate_cargo_clearance,
)
from app.services.space_weather import space_weather_service

router = APIRouter()


@router.get("/stations", response_model=list[StationResponse])
async def list_stations(db: AsyncSession = Depends(get_db)) -> list[StationResponse]:
    result = await db.execute(select(Station))
    stations = result.scalars().all()
    out: list[StationResponse] = []
    for s in stations:
        point = to_shape(s.coordinates)
        out.append(StationResponse(id=s.id, name=s.name, code=s.code, lat=point.y, lon=point.x))
    return out


@router.post("/evaluate", response_model=RouteEvaluateResponse)
async def evaluate_route(
    payload: RouteEvaluateRequest,
    db: AsyncSession = Depends(get_db),
) -> RouteEvaluateResponse:
    src_result = await db.execute(select(Station).where(Station.code == payload.source_code.upper()))
    dst_result = await db.execute(select(Station).where(Station.code == payload.dest_code.upper()))
    source = src_result.scalar_one_or_none()
    dest = dst_result.scalar_one_or_none()

    if not source or not dest:
        raise HTTPException(status_code=404, detail="Source or destination station not found")

    seg_result = await db.execute(
        select(LineSegment).options(
            selectinload(LineSegment.source_station),
            selectinload(LineSegment.dest_station),
        )
    )
    all_segments = list(seg_result.scalars().all())
    route_segments = find_route_segments(all_segments, source.id, dest.id)

    if not route_segments:
        raise HTTPException(status_code=404, detail="No route found between stations")

    clearance = validate_cargo_clearance(
        payload.cargo.height,
        payload.cargo.width,
        payload.cargo.weight,
        route_segments,
    )
    clearance_failed = clearance["status"] == "HARD_BLOCKED"

    mid_seg = route_segments[len(route_segments) // 2]
    mid_point = to_shape(mid_seg.geom_path).interpolate(0.5, normalized=True)

    weather_data = await space_weather_service.fetch_route_environmental_risks(mid_point.y, mid_point.x)
    kp_data = await space_weather_service.fetch_kp_index()
    weather_score, env_alerts = space_weather_service.weather_to_score(weather_data, kp_data)

    port_data = await fetch_port_schedule(payload.port_id, payload.vessel_id)
    port_score, port_warning = compute_port_sync_score(
        payload.train_arrival_hours, port_data["loading_window"]
    )
    if port_warning:
        env_alerts.append(port_warning)

    congestion_score = compute_congestion_score(route_segments)
    historical_score = compute_historical_score(route_segments)

    reliability = calculate_route_reliability(
        weather_score, port_score, congestion_score, historical_score, clearance_failed
    )

    estimated = estimate_transit_hours(route_segments) if not clearance_failed else None
    delay_info = predict_transit_delay_minutes(
        route_segments, 100 - congestion_score, 100 - weather_score
    )
    if delay_info["delay_minutes"] > 60:
        env_alerts.append(f"Predicted delay overhead: {delay_info['delay_minutes']} min ({delay_info['confidence']})")

    segment_responses: list[SegmentPathResponse] = []
    for seg in route_segments:
        coords = [[c[1], c[0]] for c in to_shape(seg.geom_path).coords]
        status = "HARD_BLOCKED" if clearance_failed and seg.id == clearance.get("blocking_segment_id") else clearance["status"]
        segment_responses.append(SegmentPathResponse(id=seg.id, status=status, coordinates=coords))

    record = GeneratedRoute(
        cargo_height_requested=payload.cargo.height,
        cargo_width_requested=payload.cargo.width,
        cargo_weight_requested=payload.cargo.weight,
        source_station_code=payload.source_code.upper(),
        dest_station_code=payload.dest_code.upper(),
        status=clearance["status"],
        reliability_score=reliability,
        estimated_hours=estimated,
        blocking_segment_id=clearance.get("blocking_segment_id"),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return RouteEvaluateResponse(
        route_id=record.id,
        status=clearance["status"],
        reliability_score=reliability,
        blocking_segment_id=clearance.get("blocking_segment_id"),
        estimated_hours=estimated,
        score_breakdown=ScoreBreakdown(
            weather=round(weather_score, 1),
            port=round(port_score, 1),
            congestion=round(congestion_score, 1),
            historical=round(historical_score, 1),
        ),
        segments=segment_responses,
        environmental_alerts=env_alerts,
    )


@router.post("/simulate", response_model=ThreatSimulationResponse)
async def simulate_threat(payload: ThreatSimulationRequest) -> ThreatSimulationResponse:
    base = 85
    simulated, alerts = apply_threat_simulation(
        base, payload.storm_severity, payload.solar_kp_index, payload.port_congestion
    )
    degradation = round((base - simulated) / base * 100, 1) if base else 0
    return ThreatSimulationResponse(
        original_score=base,
        simulated_score=simulated,
        degradation_pct=degradation,
        alerts=alerts,
    )


@router.post("/suggest", response_model=RouteSuggestResponse)
async def suggest_route_from_position(
    payload: RouteSuggestRequest,
    db: AsyncSession = Depends(get_db),
) -> RouteSuggestResponse:
    stations_result = await db.execute(select(Station))
    stations = list(stations_result.scalars().all())

    dst_result = await db.execute(
        select(Station).where(Station.code == payload.destination_code.upper())
    )
    dest = dst_result.scalar_one_or_none()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination station not found")

    seg_result = await db.execute(
        select(LineSegment).options(
            selectinload(LineSegment.source_station),
            selectinload(LineSegment.dest_station),
        )
    )
    all_segments = list(seg_result.scalars().all())

    resolved = resolve_train_position(
        payload.location.mode,
        stations,
        all_segments,
        station_code=payload.location.station_code,
        lat=payload.location.lat,
        lon=payload.location.lon,
    )
    if not resolved:
        raise HTTPException(status_code=400, detail="Could not resolve train location on network")

    if resolved.routing_start_id == dest.id:
        raise HTTPException(status_code=400, detail="Train has already reached destination")

    route_segments = find_route_segments(all_segments, resolved.routing_start_id, dest.id)
    if not route_segments and not resolved.partial_coords:
        raise HTTPException(status_code=404, detail="No remaining route to destination")

    full_route: list[tuple[LineSegment, list[list[float]], str]] = []
    if resolved.partial_coords:
        seg = next(s for s in all_segments if s.id == resolved.current_segment_id)
        full_route.append((seg, resolved.partial_coords, "CURRENT"))

    for seg in route_segments:
        if full_route and full_route[0][0].id == seg.id:
            continue
        coords = [[c[1], c[0]] for c in to_shape(seg.geom_path).coords]
        full_route.append((seg, coords, "UPCOMING"))

    if full_route and not resolved.partial_coords:
        seg, coords, _ = full_route[0]
        full_route[0] = (seg, coords, "CURRENT")

    demo_segments = [item[0] for item in full_route]
    clearance = validate_cargo_clearance(
        payload.cargo.height,
        payload.cargo.width,
        payload.cargo.weight,
        demo_segments,
    )
    clearance_failed = clearance["status"] == "HARD_BLOCKED"

    mid_seg = demo_segments[len(demo_segments) // 2]
    mid_point = to_shape(mid_seg.geom_path).interpolate(0.5, normalized=True)
    weather_data = await space_weather_service.fetch_route_environmental_risks(mid_point.y, mid_point.x)
    kp_data = await space_weather_service.fetch_kp_index()
    weather_score, env_alerts = space_weather_service.weather_to_score(weather_data, kp_data)

    port_data = await fetch_port_schedule(payload.port_id, payload.vessel_id)
    port_score, port_warning = compute_port_sync_score(
        payload.train_arrival_hours, port_data["loading_window"]
    )
    if port_warning:
        env_alerts.append(port_warning)
    if resolved.offset_km > 5:
        env_alerts.append(
            f"Position snapped {resolved.offset_km} km from nearest track — verify GPS lock"
        )

    congestion_score = compute_congestion_score(demo_segments)
    historical_score = compute_historical_score(demo_segments)
    reliability = calculate_route_reliability(
        weather_score, port_score, congestion_score, historical_score, clearance_failed
    )

    remaining_km = sum(segment_length_km(coords) for _, coords, _ in full_route)
    estimated = (
        round(remaining_km / 45 + sum(float(s.historical_delay_hours) for s in demo_segments), 2)
        if not clearance_failed
        else None
    )

    track_details: list[TrackSegmentDetail] = []
    segment_responses: list[SegmentPathResponse] = []
    for seg, coords, phase in full_route:
        detail = build_track_detail(
            seg,
            coords,
            phase,
            payload.cargo.height,
            payload.cargo.width,
            payload.cargo.weight,
            clearance.get("blocking_segment_id"),
            resolved.snap_fraction,
            resolved.current_segment_id,
        )
        track_details.append(TrackSegmentDetail(**detail))
        status = (
            "HARD_BLOCKED"
            if clearance_failed and seg.id == clearance.get("blocking_segment_id")
            else clearance["status"]
        )
        segment_responses.append(
            SegmentPathResponse(
                id=seg.id,
                status=status,
                coordinates=coords,
                phase=phase,
                label=detail["label"],
            )
        )

    alternates: list[AlternateRoute] = []
    for path in find_all_route_segments(all_segments, resolved.routing_start_id, dest.id):
        alt_clearance = validate_cargo_clearance(
            payload.cargo.height,
            payload.cargo.width,
            payload.cargo.weight,
            path,
        )
        if alt_clearance["status"] == "HARD_BLOCKED":
            continue
        alt_congestion = compute_congestion_score(path)
        alt_historical = compute_historical_score(path)
        
        # Calculate specific weather score for the alternate path midpoint
        alt_mid_seg = path[len(path) // 2]
        alt_mid_point = to_shape(alt_mid_seg.geom_path).interpolate(0.5, normalized=True)
        alt_weather_data = await space_weather_service.fetch_route_environmental_risks(alt_mid_point.y, alt_mid_point.x)
        alt_weather_score, _ = space_weather_service.weather_to_score(alt_weather_data, kp_data)
        
        alt_reliability = calculate_route_reliability(
            alt_weather_score, port_score, alt_congestion, alt_historical, False
        )
        label = " → ".join([path[0].source_station.code] + [s.dest_station.code for s in path])
        alternates.append(
            AlternateRoute(
                label=label,
                reliability_score=alt_reliability,
                segment_ids=[s.id for s in path],
                estimated_hours=estimate_transit_hours(path),
                weather_score=alt_weather_score,
            )
        )
    alternates.sort(key=lambda a: a.reliability_score, reverse=True)

    next_station = full_route[0][0].dest_station.code if full_route else None

    record = GeneratedRoute(
        cargo_height_requested=payload.cargo.height,
        cargo_width_requested=payload.cargo.width,
        cargo_weight_requested=payload.cargo.weight,
        source_station_code=resolved.routing_start_code,
        dest_station_code=payload.destination_code.upper(),
        status=clearance["status"],
        reliability_score=reliability,
        estimated_hours=estimated,
        blocking_segment_id=clearance.get("blocking_segment_id"),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return RouteSuggestResponse(
        route_id=record.id,
        status=clearance["status"],
        reliability_score=reliability,
        blocking_segment_id=clearance.get("blocking_segment_id"),
        estimated_hours=estimated,
        score_breakdown=ScoreBreakdown(
            weather=round(weather_score, 1),
            port=round(port_score, 1),
            congestion=round(congestion_score, 1),
            historical=round(historical_score, 1),
        ),
        segments=segment_responses,
        environmental_alerts=env_alerts,
        train_position=TrainPosition(
            lat=resolved.lat,
            lon=resolved.lon,
            mode=payload.location.mode,
            snapped_track=resolved.snapped_track,
            offset_km=resolved.offset_km,
            station_code=resolved.station_code,
        ),
        remaining_km=round(remaining_km, 1),
        eta_hours=estimated,
        track_details=track_details,
        alternate_routes=alternates[:2],
        next_station=next_station,
    )
