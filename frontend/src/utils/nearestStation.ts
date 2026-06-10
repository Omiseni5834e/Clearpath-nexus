import type { Station } from '../types/route'

export interface NearestStationResult {
  station: Station
  distanceKm: number
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findNearestStation(stations: Station[], lat: number, lon: number): NearestStationResult | null {
  if (stations.length === 0 || Number.isNaN(lat) || Number.isNaN(lon)) return null

  let best: NearestStationResult | null = null
  for (const station of stations) {
    const distanceKm = haversineKm(lat, lon, station.lat, station.lon)
    if (!best || distanceKm < best.distanceKm) {
      best = { station, distanceKm: Math.round(distanceKm * 10) / 10 }
    }
  }
  return best
}
