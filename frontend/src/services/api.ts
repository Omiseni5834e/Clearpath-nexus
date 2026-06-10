import axios from 'axios'
import type {
  RouteEvaluateResponse,
  RouteSuggestResponse,
  Station,
  ThreatSimulationResponse,
  TrainLocationInput,
} from '../types/route'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
})

export async function fetchStations(): Promise<Station[]> {
  const { data } = await api.get<Station[]>('/planner/stations')
  return data
}

export async function suggestRoute(payload: {
  cargo: { height: number; width: number; weight: number }
  destination_code: string
  location: TrainLocationInput
  train_arrival_hours: number
}): Promise<RouteSuggestResponse> {
  const { data } = await api.post<RouteSuggestResponse>('/planner/suggest', payload)
  return data
}

export async function evaluateRoute(payload: {
  cargo: { height: number; width: number; weight: number }
  source_code: string
  dest_code: string
  train_arrival_hours: number
}): Promise<RouteEvaluateResponse> {
  const { data } = await api.post<RouteEvaluateResponse>('/planner/evaluate', payload)
  return data
}

export async function simulateThreat(payload: {
  storm_severity: number
  solar_kp_index: number
  port_congestion: number
}): Promise<ThreatSimulationResponse> {
  const { data } = await api.post<ThreatSimulationResponse>('/planner/simulate', payload)
  return data
}

export async function fetchMapConditions(payload: {
  points: { lat: number; lon: number; id?: string }[]
  destination_code?: string
}) {
  const { data } = await api.post('/weather/map-conditions', payload)
  return data
}
