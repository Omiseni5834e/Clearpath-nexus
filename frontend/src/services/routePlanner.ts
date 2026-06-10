import type { RouteSuggestResponse, TrainLocationInput } from '../types/route'
import { evaluateRoute, suggestRoute } from '../services/api'

function mergeRouteResults(legs: RouteSuggestResponse[]): RouteSuggestResponse {
  if (legs.length === 0) {
    throw new Error('No route legs to merge.')
  }

  const merged = { ...legs[legs.length - 1] }
  const seen = new Set<string>()
  const segments = legs.flatMap((leg) =>
    leg.segments.filter((seg) => {
      if (seen.has(seg.id)) return false
      seen.add(seg.id)
      return true
    }),
  )

  merged.segments = segments
  merged.remaining_km = legs.reduce((sum, leg) => sum + (leg.remaining_km ?? 0), 0)
  merged.estimated_hours = legs.reduce((sum, leg) => sum + (leg.estimated_hours ?? 0), 0)
  merged.track_details = legs.flatMap((leg) => leg.track_details ?? [])
  merged.environmental_alerts = [...new Set(legs.flatMap((leg) => leg.environmental_alerts ?? []))]
  merged.train_position = legs[0].train_position
  merged.reliability_score = Math.min(...legs.map((leg) => leg.reliability_score))

  if (merged.status === 'APPROVED') {
    merged.status = legs.every((leg) => leg.status === 'APPROVED') ? 'APPROVED' : 'HARD_BLOCKED'
  }

  return merged
}

export async function suggestRouteThroughWaypoints(payload: {
  cargo: { height: number; width: number; weight: number }
  destinationCodes: string[]
  location: TrainLocationInput
  trainArrivalHours: number
}): Promise<RouteSuggestResponse> {
  const codes = payload.destinationCodes.map((c) => c.toUpperCase()).filter(Boolean)
  if (codes.length === 0) {
    throw new Error('Add at least one destination.')
  }

  let location = payload.location
  const legs: RouteSuggestResponse[] = []

  for (const destinationCode of codes) {
    try {
      const data = await suggestRoute({
        cargo: payload.cargo,
        destination_code: destinationCode,
        location,
        train_arrival_hours: payload.trainArrivalHours,
      })
      legs.push(data)
    } catch {
      const fallback = (await evaluateRoute({
        cargo: payload.cargo,
        source_code:
          location.mode === 'station' && location.station_code
            ? location.station_code
            : 'NGP',
        dest_code: destinationCode,
        train_arrival_hours: payload.trainArrivalHours,
      })) as RouteSuggestResponse
      legs.push(fallback)
    }

    location = { mode: 'station', station_code: destinationCode }
  }

  return mergeRouteResults(legs)
}
