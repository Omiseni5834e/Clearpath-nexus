from pydantic import BaseModel, Field


class MapConditionPoint(BaseModel):
    lat: float
    lon: float
    id: str | None = None


class MapConditionsRequest(BaseModel):
    points: list[MapConditionPoint] = Field(..., min_length=1)
    destination_code: str | None = None


class MapConditionResponse(BaseModel):
    id: str
    type: str
    category: str
    lat: float
    lon: float
    reading: str | None = None
    detail: str | None = None


class MapConditionsResponse(BaseModel):
    conditions: list[MapConditionResponse]
    source: str = "open-meteo"
