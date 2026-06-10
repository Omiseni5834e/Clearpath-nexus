/** Geographic helpers for snapping a train position onto corridor track geometry. */

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function segmentLengthKm(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  }
  return Math.round(total * 10) / 10;
}

export function interpolatePoint(
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export interface SnapResult {
  segmentId: string;
  sourceCode: string;
  destCode: string;
  fraction: number;
  lat: number;
  lon: number;
  offsetKm: number;
}

/** Project a lat/lon point onto the nearest track segment in the network. */
export function snapToTrack(
  lat: number,
  lon: number,
  segments: { id: string; sourceCode: string; destCode: string; coordinates: [number, number][] }[],
): SnapResult | null {
  let best: SnapResult | null = null;

  for (const seg of segments) {
    const [start, end] = seg.coordinates;
    const dx = end[1] - start[1];
    const dy = end[0] - start[0];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const t = Math.max(0, Math.min(1, ((lon - start[1]) * dx + (lat - start[0]) * dy) / lenSq));
    const snapLat = start[0] + t * dy;
    const snapLon = start[1] + t * dx;
    const offsetKm = haversineKm(lat, lon, snapLat, snapLon);

    if (!best || offsetKm < best.offsetKm) {
      best = {
        segmentId: seg.id,
        sourceCode: seg.sourceCode,
        destCode: seg.destCode,
        fraction: t,
        lat: snapLat,
        lon: snapLon,
        offsetKm: Math.round(offsetKm * 100) / 100,
      };
    }
  }

  return best;
}
