export interface Station {
  id: string;
  name: string;
  code: string;
  lat: number;
  lon: number;
}

export type LocationMode = 'station' | 'coordinates' | 'live';

export interface TrainLocationInput {
  mode: LocationMode;
  stationCode?: string;
  lat?: number;
  lon?: number;
}

export type SegmentPhase = 'TRAVERSED' | 'CURRENT' | 'UPCOMING';
export type RouteStatus = 'APPROVED' | 'CAUTION' | 'HARD_BLOCKED';

export interface SegmentPath {
  id: string;
  status: RouteStatus;
  coordinates: [number, number][];
  phase?: SegmentPhase;
  label?: string;
}

export interface TrackSegmentDetail {
  id: string;
  label: string;
  phase: SegmentPhase;
  distanceKm: number;
  progressPct?: number;
  maxHeight: number;
  maxWidth: number;
  maxWeight: number;
  congestion: number;
  historicalDelayHours: number;
  clearanceStatus: RouteStatus;
  advisory?: string;
}

export interface AlternateRoute {
  label: string;
  reliabilityScore: number;
  segmentIds: string[];
  estimatedHours?: number;
}

export interface TrainPosition {
  lat: number;
  lon: number;
  mode: LocationMode;
  snappedTrack?: string;
  offsetKm?: number;
  stationCode?: string;
}

export interface ScoreBreakdown {
  weather: number;
  port: number;
  congestion: number;
  historical: number;
}

export interface RouteEvaluateResponse {
  route_id: string;
  status: RouteStatus;
  reliability_score: number;
  blocking_segment_id?: string;
  estimated_hours?: number;
  score_breakdown?: ScoreBreakdown;
  segments: SegmentPath[];
  environmental_alerts: string[];
}

export interface RouteSuggestResponse extends RouteEvaluateResponse {
  train_position: TrainPosition;
  remaining_km: number;
  eta_hours?: number;
  track_details: TrackSegmentDetail[];
  alternate_routes: AlternateRoute[];
  next_station?: string;
}

export interface ThreatSimulationResponse {
  original_score: number;
  simulated_score: number;
  degradation_pct: number;
  alerts: string[];
}

import type { ConditionCategory, ConditionType } from '../maps/conditionSymbols';

export interface EnvironmentalZone {
  id: string;
  type: ConditionType | 'storm' | 'dust' | 'solar' | 'fog' | 'cloud';
  coordinates: [number, number][];
}

export interface MapCondition {
  id: string;
  type: ConditionType;
  category: ConditionCategory;
  lat: number;
  lon: number;
  reading?: string;
  detail?: string;
}
