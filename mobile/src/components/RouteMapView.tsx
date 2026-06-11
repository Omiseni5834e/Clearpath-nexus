import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { EnvironmentalZone, MapCondition, SegmentPath, SegmentPhase, Station, TrainPosition } from '../types/route';
import { CONDITION_SYMBOLS } from '../maps/mapSymbolGuide';
import { ZONE_COLORS } from '../maps/darkMapStyle';
import { colors } from '../theme/colors';
import { ConditionIconVector } from './ConditionIcon';
import { MapLegend } from './MapLegend';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: colors.approved,
  HARD_BLOCKED: colors.blocked,
};

const PHASE_STYLE: Record<SegmentPhase, { width: number; opacity: number }> = {
  CURRENT: { width: 7, opacity: 1 },
  UPCOMING: { width: 5, opacity: 0.85 },
  TRAVERSED: { width: 4, opacity: 0.35 },
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
];

interface Props {
  segments: SegmentPath[];
  stations: Station[];
  environmentalZones: EnvironmentalZone[];
  mapConditions?: MapCondition[];
  routeLabel?: string;
  trainPosition?: TrainPosition;
  liveWeatherUpdated?: Date | null;
}

export default function RouteMapView({
  segments,
  stations,
  environmentalZones,
  mapConditions = [],
  routeLabel,
  trainPosition,
  liveWeatherUpdated,
}: Props) {
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const region = useMemo(() => {
    const points = [
      ...segments.flatMap((s) => s.coordinates),
      ...(trainPosition ? [[trainPosition.lat, trainPosition.lon] as [number, number]] : []),
    ];
    if (points.length === 0) {
      return { latitude: 21.1458, longitude: 79.0882, latitudeDelta: 8, longitudeDelta: 8 };
    }
    const lats = points.map((p) => p[0]);
    const lons = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.6, 2),
      longitudeDelta: Math.max((maxLon - minLon) * 1.6, 2),
    };
  }, [segments, trainPosition]);

  return (
    <View style={styles.wrap}>
      <MapLegend
        routeLabel={routeLabel}
        conditionCount={mapConditions.length}
        liveWeatherUpdated={liveWeatherUpdated}
        collapsed={legendCollapsed}
        onToggle={() => setLegendCollapsed((v) => !v)}
      />

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          region={segments.length > 0 || trainPosition ? region : undefined}
          customMapStyle={DARK_MAP_STYLE}
          mapType="standard"
          showsCompass
          showsScale
        >
          {mapConditions.map((cond) => {
            const meta = CONDITION_SYMBOLS[cond.type];
            if (!meta) return null;
            return (
              <Marker
                key={`cond-${cond.id}`}
                coordinate={{ latitude: cond.lat, longitude: cond.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <ConditionIconVector type={cond.type} size={24} />
                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{meta.label}</Text>
                    <Text style={styles.calloutBody}>{cond.detail ?? meta.detail}</Text>
                    {cond.reading ? <Text style={styles.calloutHint}>Live: {cond.reading}</Text> : null}
                  </View>
                </Callout>
              </Marker>
            );
          })}

          {environmentalZones.map((zone) => {
            const zoneStyle = ZONE_COLORS[zone.type] ?? ZONE_COLORS.dust;
            return (
              <Polygon
                key={zone.id}
                coordinates={zone.coordinates.map(([lat, lon]) => ({ latitude: lat, longitude: lon }))}
                fillColor={zoneStyle.fill}
                strokeColor={zoneStyle.stroke}
                strokeWidth={2}
              />
            );
          })}

          {segments.map((seg) => {
            const phase = seg.phase ?? 'UPCOMING';
            const style = PHASE_STYLE[phase];
            const baseColor = STATUS_COLORS[seg.status] ?? colors.accent;
            return (
              <Polyline
                key={seg.id}
                coordinates={seg.coordinates.map(([lat, lon]) => ({ latitude: lat, longitude: lon }))}
                strokeColor={phase === 'CURRENT' ? '#63B3ED' : baseColor}
                strokeWidth={style.width}
                lineCap="round"
                lineJoin="round"
                zIndex={phase === 'CURRENT' ? 3 : 1}
              />
            );
          })}

          {stations.map((s) => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat, longitude: s.lon }}
              pinColor={colors.accent}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{s.code}</Text>
                  <Text style={styles.calloutBody}>{s.name}</Text>
                  <Text style={styles.calloutHint}>Station marker — corridor junction</Text>
                </View>
              </Callout>
            </Marker>
          ))}

          {trainPosition ? (
            <Marker coordinate={{ latitude: trainPosition.lat, longitude: trainPosition.lon }} pinColor="#63B3ED">
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>Train position</Text>
                  <Text style={styles.calloutBody}>
                    {trainPosition.snappedTrack ?? trainPosition.stationCode ?? 'Live coordinates'}
                  </Text>
                  <Text style={styles.calloutHint}>Snapped to nearest track segment</Text>
                </View>
              </Callout>
            </Marker>
          ) : null}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', padding: 8, gap: 0 },
  mapContainer: { flex: 1 },
  map: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 8 },
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    }),
  },
  callout: { minWidth: 180, maxWidth: 240, padding: 4, gap: 4 },
  calloutTitle: { fontWeight: '700', fontSize: 14 },
  calloutBody: { fontSize: 12, lineHeight: 16 },
  calloutHint: { fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
});
