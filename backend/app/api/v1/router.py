from fastapi import APIRouter

from app.api.v1 import planner, port, weather

api_router = APIRouter()
api_router.include_router(planner.router, prefix="/planner", tags=["planner"])
api_router.include_router(port.router, prefix="/port", tags=["port"])
api_router.include_router(weather.router, prefix="/weather", tags=["weather"])
