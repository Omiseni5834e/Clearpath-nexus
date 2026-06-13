/**
 * useRouteWeather.ts
 * Hook that fetches live per-point weather data from Open-Meteo for all
 * sampled points along the active route. Powers the Route Weather Database panel.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SegmentPath, Station } from '../types/route'
import { sampleRoutePoints } from '../services/weatherConditions'

export interface RouteWeatherPoint {
  id: string
  label: string
  lat: number
  lon: number
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDirection: number
  visibility: number // metres
  uvIndex: number
  weatherCode: number
  weatherLabel: string
  precipMm: number
  condition: 'clear' | 'rain' | 'storm' | 'snow' | 'fog' | 'cloudy' | 'windy'
}

const POLL_MS = 10 * 60 * 1000 // 10 minutes

const OPEN_METEO_BASE =
  'https://api.open-meteo.com/v1/forecast?current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility,uv_index,precipitation&timezone=auto'

function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45) return 'Foggy'
  if (code === 48) return 'Icy fog'
  if (code >= 51 && code <= 55) return 'Drizzle'
  if (code >= 56 && code <= 57) return 'Freezing drizzle'
  if (code >= 61 && code <= 65) return code >= 63 ? 'Heavy rain' : 'Moderate rain'
  if (code >= 66 && code <= 67) return 'Freezing rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code >= 85 && code <= 86) return 'Snow showers'
  if (code >= 95 && code <= 99) return code >= 96 ? 'Hail storm' : 'Thunderstorm'
  return 'Cloudy'
}

function weatherCodeToCondition(code: number): RouteWeatherPoint['condition'] {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2 || code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

function idToLabel(id: string, stations: Station[]): string {
  // Try to match a station code like "st-NGP"
  const stMatch = id.match(/^st-(.+)$/)
  if (stMatch) {
    const code = stMatch[1]
    const station = stations.find((s) => s.code === code)
    if (station) return `${station.code} — ${station.name}`
    return code
  }
  // Segment midpoints like "seg-xxx-mid"
  if (id.endsWith('-mid')) return 'Route midpoint'
  if (id.endsWith('-start')) return 'Segment start'
  if (id.endsWith('-end')) return 'Segment end'
  return id
}

async function fetchPointWeather(
  lat: number,
  lon: number,
  id: string,
  stations: Station[],
): Promise<RouteWeatherPoint> {
  const url = `${OPEN_METEO_BASE}&latitude=${lat}&longitude=${lon}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Open-Meteo ${resp.status} for ${id}`)
  const json = await resp.json()
  const c = json.current

  return {
    id,
    label: idToLabel(id, stations),
    lat,
    lon,
    temperature: Math.round(c.temperature_2m * 10) / 10,
    feelsLike: Math.round(c.apparent_temperature * 10) / 10,
    humidity: Math.round(c.relative_humidity_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    windDirection: Math.round(c.wind_direction_10m),
    visibility: c.visibility ?? 10000,
    uvIndex: Math.round(c.uv_index * 10) / 10,
    weatherCode: c.weather_code,
    weatherLabel: weatherCodeToLabel(c.weather_code),
    precipMm: Math.round(c.precipitation * 10) / 10,
    condition: weatherCodeToCondition(c.weather_code),
  }
}

export function useRouteWeather(
  segments: SegmentPath[],
  stations: Station[],
  enabled = true,
) {
  const [points, setPoints] = useState<RouteWeatherPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || (segments.length === 0 && stations.length === 0)) return
    setLoading(true)
    setError(null)

    try {
      // Sample up to 8 points across the route
      const sampled = sampleRoutePoints(segments, stations, 8)

      if (sampled.length === 0) {
        setPoints([])
        return
      }

      const results = await Promise.allSettled(
        sampled.map((p) => fetchPointWeather(p.lat, p.lon, p.id, stations)),
      )

      const fetched: RouteWeatherPoint[] = []
      const errors: string[] = []

      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          fetched.push(r.value)
        } else {
          errors.push(`Point ${sampled[i]?.id}: ${r.reason}`)
        }
      })

      setPoints(fetched)
      setLastUpdated(new Date())
      if (errors.length > 0) {
        setError(`${errors.length} point(s) failed to fetch weather.`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Weather fetch failed')
    } finally {
      setLoading(false)
    }
  }, [segments, stations, enabled])

  useEffect(() => {
    refresh()
    timerRef.current = setInterval(refresh, POLL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  return { points, loading, lastUpdated, error, refresh }
}
