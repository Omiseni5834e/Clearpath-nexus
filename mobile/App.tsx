import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ConfigPanel from './src/components/ConfigPanel';
import LoadProfilePanel from './src/components/LoadProfilePanel';
import RouteMapView from './src/components/RouteMapView';
import TelemetryPanel from './src/components/TelemetryPanel';
import { getStations, simulateThreat, suggestRouteWithWaypoints } from './src/engine/demoRouteEngine';
import { colors } from './src/theme/colors';
import type { LocationMode, RouteSuggestResponse, TrainLocationInput } from './src/types/route';
import type { LoadProfile } from './src/types/loadProfile';
import { useLiveMapConditions } from './src/hooks/useLiveMapConditions';
import { conditionsToZones } from './src/maps/mapSymbolGuide';
import { findNearestStation } from './src/utils/nearestStation';

type Tab = 'profiles' | 'configure' | 'map' | 'telemetry';

export default function App() {
  const stations = useMemo(() => getStations(), []);
  const [tab, setTab] = useState<Tab>('profiles');

  const [loadProfile, setLoadProfile] = useState<LoadProfile | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>('station');
  const [locationStation, setLocationStation] = useState('MMR');
  const [locationLat, setLocationLat] = useState('20.25');
  const [locationLon, setLocationLon] = useState('74.4333');
  const [liveTracking, setLiveTracking] = useState(false);
  const [destinations, setDestinations] = useState<string[]>(['JNPT']);
  const [trainHours, setTrainHours] = useState('24');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteSuggestResponse | null>(null);
  const [routeApproved, setRouteApproved] = useState(false);

  const [stormSeverity, setStormSeverity] = useState(0);
  const [solarKp, setSolarKp] = useState(2);
  const [portCongestion, setPortCongestion] = useState(0);
  const [simLoading, setSimLoading] = useState(false);
  const [simScore, setSimScore] = useState<number | undefined>();
  const [simAlerts, setSimAlerts] = useState<string[]>([]);

  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const originCode = locationMode === 'station' ? locationStation : undefined;
  const nearestStation = useMemo(() => {
    if (locationMode === 'station') return null;
    const lat = parseFloat(locationLat);
    const lon = parseFloat(locationLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return findNearestStation(stations, lat, lon);
  }, [locationMode, locationLat, locationLon, stations]);

  const excludeOrigin = originCode ?? nearestStation?.station.code;

  useEffect(() => {
    if (!excludeOrigin) return;
    setDestinations((prev) => {
      const filtered = prev.filter((c) => c !== excludeOrigin);
      if (filtered.length === prev.length && filtered.length > 0) return prev;
      if (filtered.length > 0) return filtered;
      const next = stations.map((s) => s.code).find((c) => c !== excludeOrigin);
      return next ? [next] : prev;
    });
  }, [excludeOrigin, stations]);

  useEffect(() => {
    setRouteApproved(false);
  }, [destinations, locationMode, locationStation, locationLat, locationLon, loadProfile?.id]);

  const buildLocationInput = useCallback((): TrainLocationInput => {
    if (locationMode === 'station') {
      return { mode: 'station', stationCode: locationStation };
    }
    if (locationMode === 'coordinates') {
      return { mode: 'coordinates', lat: parseFloat(locationLat), lon: parseFloat(locationLon) };
    }
    return {
      mode: 'live',
      lat: parseFloat(locationLat),
      lon: parseFloat(locationLon),
    };
  }, [locationMode, locationStation, locationLat, locationLon]);

  const runSuggestion = useCallback(async () => {
    if (!loadProfile) {
      setError('Select or create a load profile first.');
      setTab('profiles');
      return;
    }

    const th = parseFloat(trainHours);
    if (!th || th <= 0) {
      setError('Invalid train arrival timing.');
      return;
    }

    if (destinations.length === 0) {
      setError('Add at least one destination.');
      return;
    }

    if (excludeOrigin && destinations.every((d) => d === excludeOrigin)) {
      setError('Destination cannot be the same as the current station.');
      return;
    }

    const location = buildLocationInput();
    if (location.mode !== 'station' && (Number.isNaN(location.lat!) || Number.isNaN(location.lon!))) {
      setError('Enter valid coordinates or capture GPS.');
      return;
    }

    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 250));

    try {
      const data = suggestRouteWithWaypoints(
        loadProfile.height,
        loadProfile.width,
        loadProfile.weight,
        destinations,
        th,
        location,
      );
      setResult(data);
      setRouteApproved(false);
      setSimScore(undefined);
      setSimAlerts([]);
      setTab('map');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Route suggestion failed');
    } finally {
      setLoading(false);
    }
  }, [loadProfile, trainHours, destinations, excludeOrigin, locationMode, buildLocationInput]);

  const captureGps = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied.');
      return;
    }
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocationLat(fix.coords.latitude.toFixed(5));
    setLocationLon(fix.coords.longitude.toFixed(5));
    setLocationMode('live');
    setError(null);
  }, []);

  useEffect(() => {
    if (!liveTracking || locationMode !== 'live') {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }

    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) {
        setLiveTracking(false);
        setError('Location permission required for live tracking.');
        return;
      }

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 50 },
        (fix) => {
          setLocationLat(fix.coords.latitude.toFixed(5));
          setLocationLon(fix.coords.longitude.toFixed(5));
        },
      );
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [liveTracking, locationMode]);

  useEffect(() => {
    if (!liveTracking || locationMode !== 'live' || !result) return;

    const interval = setInterval(() => {
      runSuggestion();
    }, 30000);

    return () => clearInterval(interval);
  }, [liveTracking, locationMode, result, runSuggestion]);

  const handleSimulate = useCallback(async () => {
    setSimLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    const data = simulateThreat(stormSeverity, Math.round(solarKp), portCongestion);
    setSimScore(data.simulated_score);
    setSimAlerts(data.alerts);
    setSimLoading(false);
  }, [stormSeverity, solarKp, portCongestion]);

  const handleApproveRoute = useCallback(() => {
    if (!result) {
      setError('Suggest a route before approving.');
      return;
    }
    if (result.status !== 'APPROVED') {
      setError('Route has blocking segments — resolve before approval.');
      return;
    }
    setRouteApproved(true);
    setError(null);
  }, [result]);

  const routeLabel = result
    ? `${result.train_position.stationCode ?? nearestStation?.station.code ?? result.train_position.snappedTrack ?? 'Train'} → ${destinations.join(' → ')}`
    : undefined;

  const segments = result?.segments ?? [];
  const finalDest = destinations[destinations.length - 1];
  const { conditions: mapConditions, lastUpdated: liveWeatherUpdated } = useLiveMapConditions(
    segments,
    stations,
    finalDest,
    !!result,
  );
  const environmentalZones = useMemo(() => conditionsToZones(mapConditions), [mapConditions]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ClearPath Nexus</Text>
            <Text style={styles.subtitle}>Load profiles · live tract routing</Text>
          </View>
          <View style={styles.badges}>
            {routeApproved ? (
              <View style={styles.badgeApproved}>
                <Text style={styles.badgeText}>APPROVED</Text>
              </View>
            ) : null}
            {liveTracking ? (
              <View style={styles.badgeLive}><Text style={styles.badgeText}>LIVE GPS</Text></View>
            ) : null}
            <View style={styles.badgeVer}><Text style={styles.badgeText}>v1.2</Text></View>
          </View>
        </View>

        <View style={[styles.body, tab === 'map' && styles.bodyMap]}>
          {tab === 'profiles' ? (
            <LoadProfilePanel
              selectedId={loadProfile?.id ?? null}
              onSelect={setLoadProfile}
              onContinue={() => setTab('configure')}
            />
          ) : null}

          {tab === 'configure' ? (
            <ConfigPanel
              stations={stations}
              loadProfile={loadProfile}
              locationMode={locationMode}
              locationStation={locationStation}
              locationLat={locationLat}
              locationLon={locationLon}
              liveTracking={liveTracking}
              destinations={destinations}
              trainHours={trainHours}
              loading={loading}
              error={error}
              routeApproved={routeApproved}
              hasResult={!!result}
              resultApproved={result?.status === 'APPROVED'}
              onLocationModeChange={setLocationMode}
              onLocationStationChange={setLocationStation}
              onLocationLatChange={setLocationLat}
              onLocationLonChange={setLocationLon}
              onToggleLiveTracking={() => setLiveTracking((v) => !v)}
              onUseGpsOnce={captureGps}
              onDestinationsChange={setDestinations}
              onTrainHoursChange={setTrainHours}
              onEvaluate={runSuggestion}
              onApproveRoute={handleApproveRoute}
              onChangeProfile={() => setTab('profiles')}
            />
          ) : null}

          {tab === 'map' ? (
            <RouteMapView
              segments={result?.segments ?? []}
              stations={stations}
              environmentalZones={environmentalZones}
              mapConditions={mapConditions}
              routeLabel={routeLabel}
              trainPosition={result?.train_position}
              liveWeatherUpdated={liveWeatherUpdated}
            />
          ) : null}

          {tab === 'telemetry' ? (
            <TelemetryPanel
              result={result}
              stormSeverity={stormSeverity}
              solarKp={solarKp}
              portCongestion={portCongestion}
              simLoading={simLoading}
              simulatedScore={simScore}
              simAlerts={simAlerts}
              onStormChange={setStormSeverity}
              onSolarChange={setSolarKp}
              onPortChange={setPortCongestion}
              onSimulate={handleSimulate}
            />
          ) : null}
        </View>

        <View style={styles.tabs}>
          {(
            [
              ['profiles', 'Loads'],
              ['configure', 'Position'],
              ['map', 'Map'],
              ['telemetry', 'Tract Intel'],
            ] as const
          ).map(([t, label]) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textLight, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6 },
  badgeApproved: {
    backgroundColor: colors.approved,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeLive: {
    backgroundColor: colors.approved,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeVer: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  body: { flex: 1, backgroundColor: colors.panel },
  bodyMap: { backgroundColor: colors.canvas },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderTopWidth: 2, borderTopColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: colors.accent, fontWeight: '700' },
});
