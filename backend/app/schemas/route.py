from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CargoDimensions(BaseModel):
    height: float = Field(..., gt=0, description="Cargo height in meters")
    width: float = Field(..., gt=0, description="Cargo width in meters")
    weight: float = Field(..., gt=0, description="Cargo weight in tons")


class RouteEvaluateRequest(BaseModel):
    cargo: CargoDimensions
    source_code: str = Field(..., min_length=2, max_length=10)
    dest_code: str = Field(..., min_length=2, max_length=10)
    port_id: str = "JNPT_MUMBAI"
    vessel_id: str = "MAERSK_X26"
    train_arrival_hours: float = Field(24.0, gt=0, description="Expected train arrival offset in hours")


class TrainLocationInput(BaseModel):
    mode: str = Field(..., pattern="^(station|coordinates|live)$")
    station_code: str | None = None
    lat: float | None = None
    lon: float | None = None


class RouteSuggestRequest(BaseModel):
    cargo: CargoDimensions
    destination_code: str = Field(..., min_length=2, max_length=10)
    location: TrainLocationInput
    port_id: str = "JNPT_MUMBAI"
    vessel_id: str = "MAERSK_X26"
    train_arrival_hours: float = Field(24.0, gt=0)


class TrackSegmentDetail(BaseModel):
    id: UUID
    label: str
    phase: str
    distance_km: float
    progress_pct: int | None = None
    max_height: float
    max_width: float
    max_weight: float
    congestion: float
    historical_delay_hours: float
    clearance_status: str
    advisory: str | None = None


class AlternateRoute(BaseModel):
    label: str
    reliability_score: int
    segment_ids: list[UUID]
    estimated_hours: float | None = None
    weather_score: float | None = None


class TrainPosition(BaseModel):
    lat: float
    lon: float
    mode: str
    snapped_track: str | None = None
    offset_km: float | None = None
    station_code: str | None = None


class ScoreBreakdown(BaseModel):
    weather: float
    port: float
    congestion: float
    historical: float


class SegmentPathPoint(BaseModel):
    lat: float
    lon: float


class SegmentPathResponse(BaseModel):
    id: UUID
    status: str
    coordinates: list[list[float]]
    phase: str | None = None
    label: str | None = None


class RouteEvaluateResponse(BaseModel):
    route_id: UUID
    status: str
    reliability_score: int
    blocking_segment_id: UUID | None = None
    estimated_hours: float | None = None
    score_breakdown: ScoreBreakdown | None = None
    segments: list[SegmentPathResponse] = []
    environmental_alerts: list[str] = []


class RouteSuggestResponse(RouteEvaluateResponse):
    train_position: TrainPosition
    remaining_km: float
    eta_hours: float | None = None
    track_details: list[TrackSegmentDetail] = []
    alternate_routes: list[AlternateRoute] = []
    next_station: str | None = None


class StationResponse(BaseModel):
    id: UUID
    name: str
    code: str
    lat: float
    lon: float

    model_config = {"from_attributes": True}


class ThreatSimulationRequest(BaseModel):
    storm_severity: float = Field(0.0, ge=0, le=100)
    solar_kp_index: int = Field(0, ge=0, le=9)
    port_congestion: float = Field(0.0, ge=0, le=100)


class ThreatSimulationResponse(BaseModel):
    original_score: int
    simulated_score: int
    degradation_pct: float
    alerts: list[str]
