from fastapi import APIRouter

from app.schemas.weather import MapConditionsRequest, MapConditionsResponse
from app.services.map_conditions import fetch_map_conditions
from app.services.space_weather import space_weather_service

router = APIRouter()


@router.get("/environmental")
async def get_environmental_risks(lat: float = 21.1458, lon: float = 79.0882) -> dict:
    weather = await space_weather_service.fetch_route_environmental_risks(lat, lon)
    kp = await space_weather_service.fetch_kp_index()
    score, alerts = space_weather_service.weather_to_score(weather, kp)
    return {
        "weather": weather,
        "space_weather": kp,
        "weather_score": round(score, 1),
        "alerts": alerts,
    }


@router.post("/map-conditions", response_model=MapConditionsResponse)
async def get_map_conditions(payload: MapConditionsRequest) -> MapConditionsResponse:
    points = [p.model_dump() for p in payload.points]
    conditions = await fetch_map_conditions(points, payload.destination_code)
    return MapConditionsResponse(conditions=conditions)


@router.get("/kp-index")
async def get_kp_index() -> dict:
    return await space_weather_service.fetch_kp_index()
