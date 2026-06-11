import type {
  AlternateRoute,
  RouteEvaluateResponse,
  RouteSuggestResponse,
  RouteStatus,
  SegmentPath,
  SegmentPhase,
  Station,
  ThreatSimulationResponse,
  TrackSegmentDetail,
  TrainLocationInput,
  TrainPosition,
} from '../types/route';
import { haversineKm, interpolatePoint, segmentLengthKm, snapToTrack } from './trackUtils';
import { findNearestStation } from '../utils/nearestStation';

interface DemoSegment {
  id: string;
  sourceCode: string;
  destCode: string;
  maxHeight: number;
  maxWidth: number;
  maxWeight: number;
  congestion: number;
  historicalDelay: number;
  coordinates: [number, number][];
}

const STATIONS: Station[] = [
  { id: 's-ngp', name: 'Nagpur Junction', code: 'NGP', lat: 21.1458, lon: 79.0882 },
  { id: 's-bsl', name: 'Bhusaval Junction', code: 'BSL', lat: 21.0455, lon: 75.7849 },
  { id: 's-mmr', name: 'Manmad Junction', code: 'MMR', lat: 20.25, lon: 74.4333 },
  { id: 's-kyn', name: 'Kalyan Junction', code: 'KYN', lat: 19.2433, lon: 73.1305 },
  { id: 's-jnpt', name: 'Mumbai Port (JNPT)', code: 'JNPT', lat: 18.9497, lon: 72.9512 },
  { id: 's-pune', name: 'Pune Junction', code: 'PUNE', lat: 18.5285, lon: 73.874 },
];

const SEGMENTS: DemoSegment[] = [
  { id: 'seg-1', sourceCode: 'NGP', destCode: 'BSL', maxHeight: 5.5, maxWidth: 3.5, maxWeight: 150, congestion: 1.2, historicalDelay: 0.5, coordinates: [[21.1458, 79.0882], [21.0455, 75.7849]] },
  { id: 'seg-2', sourceCode: 'BSL', destCode: 'MMR', maxHeight: 5.0, maxWidth: 3.2, maxWeight: 140, congestion: 1.0, historicalDelay: 0.3, coordinates: [[21.0455, 75.7849], [20.25, 74.4333]] },
  { id: 'seg-3', sourceCode: 'MMR', destCode: 'KYN', maxHeight: 4.8, maxWidth: 3.2, maxWeight: 130, congestion: 1.5, historicalDelay: 0.8, coordinates: [[20.25, 74.4333], [19.2433, 73.1305]] },
  { id: 'seg-4', sourceCode: 'KYN', destCode: 'JNPT', maxHeight: 4.5, maxWidth: 3.0, maxWeight: 120, congestion: 1.8, historicalDelay: 1.2, coordinates: [[19.2433, 73.1305], [18.9497, 72.9512]] },
  { id: 'seg-5', sourceCode: 'NGP', destCode: 'PUNE', maxHeight: 5.2, maxWidth: 3.4, maxWeight: 135, congestion: 1.1, historicalDelay: 0.4, coordinates: [[21.1458, 79.0882], [18.5285, 73.874]] },
  { id: 'seg-6', sourceCode: 'PUNE', destCode: 'KYN', maxHeight: 4.6, maxWidth: 3.1, maxWeight: 125, congestion: 1.3, historicalDelay: 0.6, coordinates: [[18.5285, 73.874], [19.2433, 73.1305]] },
];

export function getStations(): Station[] {
  return STATIONS;
}

export function getSegments(): DemoSegment[] {
  return SEGMENTS;
}

/** Legacy full-corridor evaluate from origin station. */
export function evaluateRoute(
  height: number,
  width: number,
  weight: number,
  sourceCode: string,
  destCode: string,
  trainArrivalHours: number,
): RouteEvaluateResponse {
  return suggestRouteFromTrainLocation(height, width, weight, destCode, trainArrivalHours, {
    mode: 'station',
    stationCode: sourceCode,
  });
}

/** Real-time route suggestion from the train's current position to destination. */
export function suggestRouteFromTrainLocation(
  height: number,
  width: number,
  weight: number,
  destCode: string,
  trainArrivalHours: number,
  location: TrainLocationInput,
): RouteSuggestResponse {
  const dest = destCode.toUpperCase();
  if (!STATIONS.some((s) => s.code === dest)) {
    throw new Error('Destination station is outside the mapped corridor.');
  }

  const resolved = resolveTrainPosition(location);
  if (!resolved) {
    throw new Error('Could not resolve train location on the rail network.');
  }

  const { position, routingStart, partialSegment, currentSegmentId } = resolved;

  if (routingStart === dest) {
    throw new Error('Train has already reached the destination station.');
  }

  const routeSegments = findRoute(routingStart, dest);
  if (routeSegments.length === 0 && !partialSegment) {
    throw new Error('No viable track path remains to destination from current position.');
  }

  const fullRoute: { segment: DemoSegment; coords: [number, number][]; phase: SegmentPhase }[] = [];

  if (partialSegment) {
    fullRoute.push({
      segment: partialSegment.segment,
      coords: partialSegment.coords,
      phase: 'CURRENT',
    });
  }

  routeSegments.forEach((seg) => {
    fullRoute.push({
      segment: seg,
      coords: seg.coordinates,
      phase: 'UPCOMING',
    });
  });

  if (partialSegment) {
    if (fullRoute.length > 0 && fullRoute[0].segment.id === partialSegment.segment.id) {
      fullRoute.shift();
    }
  } else if (fullRoute.length > 0) {
    fullRoute[0].phase = 'CURRENT';
  }

  const demoSegments = fullRoute.map((r) => r.segment);
  const clearance = validateClearance(height, width, weight, demoSegments);
  const clearanceFailed = clearance.status === 'HARD_BLOCKED';

  const weatherScore = 82;
  const port = computePortSyncScore(trainArrivalHours);
  const congestionScore = computeCongestionScore(demoSegments);
  const historicalScore = computeHistoricalScore(demoSegments);

  const alerts: string[] = [];
  if (port.warning) alerts.push(port.warning);
  if (resolved.position.offsetKm && resolved.position.offsetKm > 5) {
    alerts.push(`Position snapped ${resolved.position.offsetKm} km from nearest track — verify GPS lock`);
  }

  const reliability = calculateReliability(
    weatherScore,
    port.score,
    congestionScore,
    historicalScore,
    clearanceFailed,
  );
  const routeStatus = statusFromScore(reliability, clearanceFailed);

  const remainingKm = fullRoute.reduce((sum, r) => sum + segmentLengthKm(r.coords), 0);
  const estimatedHours = clearanceFailed ? undefined : estimateTransitHours(demoSegments, remainingKm);
  const delayMinutes = predictDelayMinutes(demoSegments, 100 - congestionScore, 100 - weatherScore);
  if (delayMinutes > 60) {
    alerts.push(`Predicted delay overhead: ${delayMinutes} min (MEDIUM)`);
  }

  const trackDetails: TrackSegmentDetail[] = fullRoute.map(({ segment, coords, phase }) => {
    const blocked =
      clearanceFailed && segment.id === clearance.blockingSegmentId ? 'HARD_BLOCKED' : clearance.status;
    const progressPct =
      phase === 'CURRENT' && segment.id === currentSegmentId && resolved.snapFraction != null
        ? Math.round(resolved.snapFraction * 100)
        : phase === 'CURRENT'
          ? 0
          : undefined;

    let advisory: string | undefined;
    if (segment.congestion >= 1.5) advisory = 'High congestion — expect slow orders';
    else if (segment.historicalDelay >= 1.0) advisory = 'Historically delayed block';
    else if (blocked === 'HARD_BLOCKED') advisory = 'Clearance violation on this tract';

    return {
      id: segment.id,
      label: `${segment.sourceCode} → ${segment.destCode}`,
      phase,
      distanceKm: segmentLengthKm(coords),
      progressPct,
      maxHeight: segment.maxHeight,
      maxWidth: segment.maxWidth,
      maxWeight: segment.maxWeight,
      congestion: segment.congestion,
      historicalDelayHours: segment.historicalDelay,
      clearanceStatus: blocked,
      advisory,
    };
  });

  const segments: SegmentPath[] = fullRoute.map(({ segment, coords, phase }) => ({
    id: segment.id,
    status:
      clearanceFailed && segment.id === clearance.blockingSegmentId ? 'HARD_BLOCKED' : routeStatus,
    coordinates: coords,
    phase,
    label: `${segment.sourceCode} → ${segment.destCode}`,
  }));

  const alternates = findAlternateRoutes(resolved.routingStart, dest, height, width, weight, trainArrivalHours);

  const nextStation =
    fullRoute.find((r) => r.phase === 'CURRENT' || r.phase === 'UPCOMING')?.segment.destCode ??
    routeSegments[0]?.destCode;

  return {
    route_id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    status: routeStatus,
    reliability_score: reliability,
    blocking_segment_id: clearance.blockingSegmentId,
    estimated_hours: estimatedHours,
    score_breakdown: {
      weather: weatherScore,
      port: port.score,
      congestion: congestionScore,
      historical: historicalScore,
    },
    segments,
    environmental_alerts: alerts,
    train_position: position,
    remaining_km: Math.round(remainingKm * 10) / 10,
    eta_hours: estimatedHours,
    track_details: trackDetails,
    alternate_routes: alternates,
    next_station: nextStation,
  };
}

/** Route through multiple destination waypoints in order. */
export function suggestRouteWithWaypoints(
  height: number,
  width: number,
  weight: number,
  destCodes: string[],
  trainArrivalHours: number,
  location: TrainLocationInput,
): RouteSuggestResponse {
  const codes = destCodes.map((c) => c.toUpperCase()).filter(Boolean);
  if (codes.length === 0) {
    throw new Error('Add at least one destination.');
  }

  const legs: RouteSuggestResponse[] = [];
  let currentLocation = location;

  for (const destCode of codes) {
    const leg = suggestRouteFromTrainLocation(height, width, weight, destCode, trainArrivalHours, currentLocation);
    legs.push(leg);
    currentLocation = { mode: 'station', stationCode: destCode };
  }

  if (legs.length === 1) return legs[0];

  const merged = { ...legs[legs.length - 1] };
  const seen = new Set<string>();
  merged.segments = legs.flatMap((leg) =>
    leg.segments.filter((seg) => {
      if (seen.has(seg.id)) return false;
      seen.add(seg.id);
      return true;
    }),
  );
  merged.remaining_km = Math.round(legs.reduce((sum, leg) => sum + leg.remaining_km, 0) * 10) / 10;
  merged.estimated_hours = Math.round(legs.reduce((sum, leg) => sum + (leg.estimated_hours ?? 0), 0) * 100) / 100;
  merged.track_details = legs.flatMap((leg) => leg.track_details);
  merged.environmental_alerts = [...new Set(legs.flatMap((leg) => leg.environmental_alerts))];
  merged.train_position = legs[0].train_position;
  merged.reliability_score = Math.round(legs.reduce((sum, leg) => sum + leg.reliability_score, 0) / legs.length);
  merged.status = legs.some((leg) => leg.status === 'HARD_BLOCKED')
    ? 'HARD_BLOCKED'
    : merged.reliability_score >= 65
      ? 'APPROVED'
      : 'CAUTION';
  merged.next_station = legs[0].next_station;
  return merged;
}

interface ResolvedPosition {
  position: TrainPosition;
  routingStart: string;
  partialSegment?: { segment: DemoSegment; coords: [number, number][] };
  currentSegmentId?: string;
  snapFraction?: number;
}

function resolveTrainPosition(location: TrainLocationInput): ResolvedPosition | null {
  if (location.mode === 'station') {
    const code = location.stationCode?.toUpperCase();
    const station = STATIONS.find((s) => s.code === code);
    if (!station) return null;
    return {
      position: {
        lat: station.lat,
        lon: station.lon,
        mode: location.mode,
        stationCode: station.code,
        snappedTrack: `${station.code} yard`,
        offsetKm: 0,
      },
      routingStart: station.code,
    };
  }

  const lat = location.lat;
  const lon = location.lon;
  if (lat == null || lon == null) return null;

  const nearest = findNearestStation(STATIONS, lat, lon);
  const snap = snapToTrack(lat, lon, SEGMENTS);
  if (!snap) return null;

  const segment = SEGMENTS.find((s) => s.id === snap.segmentId)!;
  const end = segment.coordinates[1];

  const position: TrainPosition = {
    lat: snap.lat,
    lon: snap.lon,
    mode: location.mode,
    snappedTrack: `${segment.sourceCode}→${segment.destCode}`,
    offsetKm: snap.offsetKm,
    stationCode: nearest?.station.code,
  };

  if (snap.fraction >= 0.95) {
    return {
      position,
      routingStart: snap.destCode,
      currentSegmentId: segment.id,
      snapFraction: snap.fraction,
    };
  }

  return {
    position,
    routingStart: snap.destCode,
    partialSegment: {
      segment,
      coords: [
        [snap.lat, snap.lon],
        end,
      ],
    },
    currentSegmentId: segment.id,
    snapFraction: snap.fraction,
  };
}

function findAlternateRoutes(
  start: string,
  dest: string,
  height: number,
  width: number,
  weight: number,
  trainArrivalHours: number,
): AlternateRoute[] {
  const allPaths = findAllRoutes(start, dest, 3);
  const scored: AlternateRoute[] = [];

  for (const path of allPaths) {
    const clearance = validateClearance(height, width, weight, path);
    if (clearance.status === 'HARD_BLOCKED') continue;

    const weatherScore = 82;
    const port = computePortSyncScore(trainArrivalHours);
    const congestionScore = computeCongestionScore(path);
    const historicalScore = computeHistoricalScore(path);
    const reliability = calculateReliability(
      weatherScore,
      port.score,
      congestionScore,
      historicalScore,
      false,
    );

    const label = path.map((s) => s.sourceCode).concat(path[path.length - 1].destCode).join(' → ');
    scored.push({
      label,
      reliabilityScore: reliability,
      segmentIds: path.map((s) => s.id),
      estimatedHours: estimateTransitHours(path),
    });
  }

  scored.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  return scored.slice(0, 2);
}

function findAllRoutes(source: string, dest: string, maxPaths: number): DemoSegment[][] {
  const results: DemoSegment[][] = [];
  const adjacency = SEGMENTS.reduce<Record<string, DemoSegment[]>>((acc, seg) => {
    (acc[seg.sourceCode] ??= []).push(seg);
    return acc;
  }, {});

  function dfs(code: string, path: DemoSegment[], visited: Set<string>) {
    if (results.length >= maxPaths) return;
    if (code === dest) {
      results.push([...path]);
      return;
    }
    for (const seg of adjacency[code] ?? []) {
      if (visited.has(seg.destCode)) continue;
      visited.add(seg.destCode);
      path.push(seg);
      dfs(seg.destCode, path, visited);
      path.pop();
      visited.delete(seg.destCode);
    }
  }

  dfs(source, [], new Set([source]));
  return results;
}

export function simulateThreat(
  stormSeverity: number,
  solarKpIndex: number,
  portCongestion: number,
): ThreatSimulationResponse {
  const base = 85;
  const { simulated, alerts } = applyThreatSimulation(
    base,
    stormSeverity,
    solarKpIndex,
    portCongestion,
  );
  return {
    original_score: base,
    simulated_score: simulated,
    degradation_pct: base > 0 ? ((base - simulated) / base) * 100 : 0,
    alerts,
  };
}

function validateClearance(
  height: number,
  width: number,
  weight: number,
  route: DemoSegment[],
): { status: RouteStatus; blockingSegmentId?: string } {
  for (const seg of route) {
    if (height > seg.maxHeight || width > seg.maxWidth || weight > seg.maxWeight) {
      return { status: 'HARD_BLOCKED', blockingSegmentId: seg.id };
    }
  }
  return { status: 'APPROVED' };
}

function findRoute(source: string, dest: string): DemoSegment[] {
  if (source === dest) return [];

  const adjacency = SEGMENTS.reduce<Record<string, DemoSegment[]>>((acc, seg) => {
    (acc[seg.sourceCode] ??= []).push(seg);
    return acc;
  }, {});

  const queue: { code: string; path: DemoSegment[] }[] = [{ code: source, path: [] }];
  const visited = new Set([source]);

  while (queue.length > 0) {
    const { code, path } = queue.shift()!;
    for (const seg of adjacency[code] ?? []) {
      const nextPath = [...path, seg];
      if (seg.destCode === dest) return nextPath;
      if (!visited.has(seg.destCode)) {
        visited.add(seg.destCode);
        queue.push({ code: seg.destCode, path: nextPath });
      }
    }
  }
  return [];
}

function computePortSyncScore(trainArrivalHours: number): { score: number; warning?: string } {
  const windowStart = 12;
  const windowEnd = 48;

  if (trainArrivalHours < windowStart) {
    const gap = windowStart - trainArrivalHours;
    return {
      score: Math.max(40, 100 - gap * 3),
      warning: `Train arrives ${gap.toFixed(1)}h early — yard dwell risk`,
    };
  }
  if (trainArrivalHours > windowEnd) {
    return { score: 0, warning: 'CRITICAL: Train misses vessel loading window' };
  }
  const windowPct = (trainArrivalHours - windowStart) / Math.max(windowEnd - windowStart, 1);
  const score = 100 - Math.abs(windowPct - 0.3) * 30;
  return { score: Math.max(60, Math.min(100, score)) };
}

function computeCongestionScore(route: DemoSegment[]): number {
  if (route.length === 0) return 50;
  const avg = route.reduce((s, r) => s + r.congestion, 0) / route.length;
  return Math.max(0, Math.min(100, 100 - (avg - 1) * 40));
}

function computeHistoricalScore(route: DemoSegment[]): number {
  if (route.length === 0) return 75;
  const avg = route.reduce((s, r) => s + r.historicalDelay, 0) / route.length;
  return Math.max(0, Math.min(100, 100 - avg * 10));
}

function estimateTransitHours(route: DemoSegment[], remainingKm?: number): number {
  const base = remainingKm != null ? remainingKm / 45 : route.length * 4.5;
  const delay = route.reduce((s, r) => s + r.historicalDelay, 0);
  return Math.round((base + delay) * 100) / 100;
}

function predictDelayMinutes(
  route: DemoSegment[],
  congestionPct: number,
  weatherRisk: number,
): number {
  if (route.length === 0) return 30;
  const baseDelay = route.reduce((s, r) => s + r.historicalDelay, 0) * 60;
  return Math.floor(baseDelay + congestionPct * 0.5 + weatherRisk * 0.8);
}

function calculateReliability(
  weather: number,
  port: number,
  congestion: number,
  historical: number,
  clearanceFailed: boolean,
): number {
  if (clearanceFailed) return 0;
  const composite = 0.4 * weather + 0.3 * port + 0.15 * congestion + 0.15 * historical;
  return Math.ceil(composite);
}

function statusFromScore(score: number, clearanceFailed: boolean): RouteStatus {
  if (clearanceFailed || score < 45) return 'HARD_BLOCKED';
  if (score < 65) return 'CAUTION';
  return 'APPROVED';
}

function applyThreatSimulation(
  baseScore: number,
  stormSeverity: number,
  solarKpIndex: number,
  portCongestion: number,
): { simulated: number; alerts: string[] } {
  const alerts: string[] = [];
  let penalty = 0;

  if (stormSeverity > 0) {
    penalty += stormSeverity * 0.35;
    alerts.push(`Heavy storm simulation active (severity ${Math.round(stormSeverity)}%)`);
  }
  if (solarKpIndex >= 7) {
    penalty += (solarKpIndex - 6) * 12;
    alerts.push(`CRITICAL: Kp-index ${solarKpIndex} — geomagnetic telemetry risk`);
  }
  if (portCongestion > 0) {
    penalty += portCongestion * 0.25;
    alerts.push(`Port gridlock simulation (congestion ${Math.round(portCongestion)}%)`);
  }

  return { simulated: Math.max(0, Math.floor(baseScore - penalty)), alerts };
}
