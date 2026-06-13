export interface CargoDimensions {
  height: number
  width: number
  weight: number
}

export type LocationMode = 'station' | 'coordinates' | 'live'

export interface TrainLocationInput {
  mode: LocationMode
  station_code?: string
  lat?: number
  lon?: number
}

export type SegmentPhase = 'TRAVERSED' | 'CURRENT' | 'UPCOMING'

export interface SegmentPath {
  id: string
  status: 'APPROVED' | 'HARD_BLOCKED'
  coordinates: [number, number][]
  phase?: SegmentPhase
  label?: string
}

export interface TrackSegmentDetail {
  id: string
  label: string
  phase: SegmentPhase
  distance_km: number
  progress_pct?: number
  max_height: number
  max_width: number
  max_weight: number
  congestion: number
  historical_delay_hours: number
  clearance_status: 'APPROVED' | 'HARD_BLOCKED'
  advisory?: string
}

export interface AlternateRoute {
  label: string
  reliability_score: number
  segment_ids: string[]
  estimated_hours?: number
  weather_score?: number
}

export interface TrainPosition {
  lat: number
  lon: number
  mode: LocationMode
  snapped_track?: string
  offset_km?: number
  station_code?: string
}

export interface ScoreBreakdown {
  weather: number
  port: number
  congestion: number
  historical: number
}

export interface RouteEvaluateResponse {
  route_id: string
  status: 'APPROVED' | 'HARD_BLOCKED'
  reliability_score: number
  blocking_segment_id?: string
  estimated_hours?: number
  score_breakdown?: ScoreBreakdown
  segments: SegmentPath[]
  environmental_alerts: string[]
}

export interface RouteSuggestResponse extends RouteEvaluateResponse {
  train_position: TrainPosition
  remaining_km: number
  eta_hours?: number
  track_details: TrackSegmentDetail[]
  alternate_routes: AlternateRoute[]
  next_station?: string
}

export interface Station {
  id: string
  name: string
  code: string
  lat: number
  lon: number
}

export interface ThreatSimulationResponse {
  original_score: number
  simulated_score: number
  degradation_pct: number
  alerts: string[]
}

import type { ConditionCategory, ConditionType } from '../maps/conditionSymbols'

export interface EnvironmentalZone {
  id: string
  type: ConditionType | 'storm' | 'dust' | 'solar' | 'fog' | 'cloud'
  coordinates: [number, number][]
}

export interface MapCondition {
  id: string
  type: ConditionType
  category: ConditionCategory
  lat: number
  lon: number
  reading?: string
  detail?: string
}
