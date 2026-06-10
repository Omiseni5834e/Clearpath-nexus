import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapCondition, SegmentPath, Station } from '../types/route';
import { fetchLiveMapConditions } from '../services/weatherConditions';

const POLL_MS = 10 * 60 * 1000;

export function useLiveMapConditions(
  segments: SegmentPath[],
  stations: Station[],
  destinationCode?: string,
  enabled = true,
) {
  const [conditions, setConditions] = useState<MapCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await fetchLiveMapConditions({ segments, stations, destinationCode });
      setConditions(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [segments, stations, destinationCode, enabled]);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  return { conditions, loading, lastUpdated, refresh };
}
