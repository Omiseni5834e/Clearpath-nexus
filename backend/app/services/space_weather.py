from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_WEATHER = {
    "weather": [{"id": 800, "main": "Clear", "description": "clear sky"}],
    "main": {"temp": 28.0, "visibility": 10000},
    "wind": {"speed": 5.0},
}

FALLBACK_KP = {"kp_index": 2, "alert_level": "NONE", "issue_datetime": "2026-06-08 00:00:00"}


class SpaceWeatherService:
    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
            )
        return self._redis

    async def _cache_get(self, key: str) -> dict[str, Any] | None:
        try:
            redis = await self._get_redis()
            raw = await redis.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            return None

    async def _cache_set(self, key: str, payload: dict[str, Any], ttl: int = 900) -> None:
        try:
            redis = await self._get_redis()
            await redis.set(key, json.dumps(payload), ex=ttl)
        except Exception:
            pass

    async def fetch_route_environmental_risks(
        self, lat: float, lon: float
    ) -> dict[str, Any]:
        """Fetch OpenWeatherMap data for a coordinate."""
        cache_key = f"weather:{lat:.2f}:{lon:.2f}"
        cached = await self._cache_get(cache_key)
        if cached:
            return cached

        if not settings.OPENWEATHER_API_KEY:
            try:
                url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,visibility"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    current = resp.json().get("current", {})
                    owm_data = {
                        "wind": {
                            "speed": round(current.get("wind_speed_10m", 0) / 3.6, 2)  # km/h to m/s
                        },
                        "main": {
                            "temp": current.get("temperature_2m", 25.0),
                            "visibility": current.get("visibility", 10000),
                            "humidity": current.get("relative_humidity_2m", 50)
                        },
                        "weather": [
                            {
                                "id": 500 if int(current.get("weather_code", 0)) >= 51 else 800,
                                "main": "Precipitation" if int(current.get("weather_code", 0)) >= 51 else "Clear",
                                "description": "precipitation" if int(current.get("weather_code", 0)) >= 51 else "clear sky"
                            }
                        ]
                    }
                    await self._cache_set(cache_key, owm_data)
                    return owm_data
            except Exception as exc:
                logger.warning("Open-Meteo fallback risks fetch failed: %s", exc)
                return FALLBACK_WEATHER

        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {"lat": lat, "lon": lon, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                await self._cache_set(cache_key, data)
                return data
        except Exception as exc:
            logger.warning("Weather fetch failed: %s", exc)
            cached = await self._cache_get(cache_key)
            return cached or FALLBACK_WEATHER

    async def fetch_kp_index(self) -> dict[str, Any]:
        """Parse NOAA planetary Kp-index feed."""
        cache_key = "noaa:kp_index"
        cached = await self._cache_get(cache_key)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(settings.NOAA_SPACE_WEATHER_FEED_URL)
                resp.raise_for_status()
                rows = resp.json()
                if isinstance(rows, list) and len(rows) > 1:
                    latest = rows[-1]
                    kp_val = int(float(latest[1])) if len(latest) > 1 else 2
                    result = {
                        "kp_index": kp_val,
                        "alert_level": "WARNING" if kp_val >= 7 else "NONE",
                        "issue_datetime": str(latest[0]) if latest else datetime.now(timezone.utc).isoformat(),
                    }
                    await self._cache_set(cache_key, result)
                    return result
        except Exception as exc:
            logger.warning("NOAA fetch failed: %s", exc)

        cached = await self._cache_get(cache_key)
        return cached or FALLBACK_KP

    def weather_to_score(self, weather_data: dict[str, Any], kp_data: dict[str, Any]) -> tuple[float, list[str]]:
        alerts: list[str] = []
        score = 100.0

        wind = weather_data.get("wind", {}).get("speed", 0)
        visibility = weather_data.get("main", {}).get("visibility", 10000)
        weather_codes = [w.get("id", 800) for w in weather_data.get("weather", [])]

        if any(c >= 500 for c in weather_codes):
            score -= 30
            alerts.append("Heavy precipitation detected along corridor")
        if wind > 15:
            score -= 20
            alerts.append(f"High wind speeds ({wind} m/s)")
        if visibility < 5000:
            score -= 25
            alerts.append("Reduced visibility — dust/fog risk")

        kp = kp_data.get("kp_index", 0)
        if kp >= 7:
            score -= 35
            alerts.append(f"CRITICAL: Geomagnetic Kp-index {kp} — signaling telemetry risk")
        elif kp >= 5:
            score -= 10
            alerts.append(f"Elevated Kp-index {kp}")

        return max(0.0, min(100.0, score)), alerts


space_weather_service = SpaceWeatherService()
