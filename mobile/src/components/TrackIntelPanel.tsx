import { StyleSheet, Text, View } from 'react-native';
import type { AlternateRoute, TrackSegmentDetail, TrainPosition } from '../types/route';
import { colors } from '../theme/colors';

interface Props {
  trainPosition?: TrainPosition;
  remainingKm?: number;
  etaHours?: number;
  nextStation?: string;
  trackDetails: TrackSegmentDetail[];
  alternateRoutes: AlternateRoute[];
}

const PHASE_COLORS: Record<string, string> = {
  CURRENT: colors.accent,
  UPCOMING: colors.textLight,
  TRAVERSED: colors.muted,
};

export default function TrackIntelPanel({
  trainPosition,
  remainingKm,
  etaHours,
  nextStation,
  trackDetails,
  alternateRoutes,
}: Props) {
  if (trackDetails.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>LIVE TRACT INTELLIGENCE</Text>

      {trainPosition ? (
        <View style={styles.positionCard}>
          <Text style={styles.positionLabel}>TRAIN POSITION</Text>
          <Text style={styles.positionCoords}>
            {trainPosition.lat.toFixed(4)}°N, {trainPosition.lon.toFixed(4)}°E
          </Text>
          {trainPosition.snappedTrack ? (
            <Text style={styles.positionMeta}>On track: {trainPosition.snappedTrack}</Text>
          ) : null}
          {trainPosition.stationCode ? (
            <Text style={styles.positionMeta}>At station: {trainPosition.stationCode}</Text>
          ) : null}
          <View style={styles.statsRow}>
            {remainingKm != null ? (
              <StatChip label="Remaining" value={`${remainingKm} km`} />
            ) : null}
            {etaHours != null ? <StatChip label="ETA" value={`${etaHours}h`} /> : null}
            {nextStation ? <StatChip label="Next" value={nextStation} /> : null}
          </View>
        </View>
      ) : null}

      {trackDetails.map((track) => (
        <View
          key={track.id}
          style={[
            styles.trackCard,
            track.phase === 'CURRENT' && styles.trackCurrent,
            track.clearanceStatus === 'HARD_BLOCKED' && styles.trackBlocked,
          ]}
        >
          <View style={styles.trackHeader}>
            <View style={[styles.phaseDot, { backgroundColor: PHASE_COLORS[track.phase] }]} />
            <Text style={styles.trackLabel}>{track.label}</Text>
            <Text style={[styles.phaseTag, { color: PHASE_COLORS[track.phase] }]}>{track.phase}</Text>
          </View>

          <View style={styles.trackGrid}>
            <MiniStat label="Distance" value={`${track.distanceKm} km`} />
            <MiniStat label="Clearance H" value={`${track.maxHeight}m`} />
            <MiniStat label="Clearance W" value={`${track.maxWidth}m`} />
            <MiniStat label="Capacity" value={`${track.maxWeight}T`} />
            <MiniStat label="Congestion" value={`×${track.congestion}`} />
            <MiniStat label="Hist. delay" value={`${track.historicalDelayHours}h`} />
          </View>

          {track.progressPct != null && track.phase === 'CURRENT' ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${track.progressPct}%` }]} />
              </View>
              <Text style={styles.progressText}>{track.progressPct}% through block</Text>
            </View>
          ) : null}

          {track.advisory ? <Text style={styles.advisory}>→ {track.advisory}</Text> : null}
        </View>
      ))}

      {alternateRoutes.length > 1 ? (
        <View style={styles.altCard}>
          <Text style={styles.altTitle}>ALTERNATE CORRIDORS</Text>
          {alternateRoutes.slice(1).map((alt) => (
            <View key={alt.label} style={styles.altRow}>
              <Text style={styles.altLabel}>{alt.label}</Text>
              <Text style={styles.altScore}>RI {alt.reliabilityScore}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { color: colors.textLight, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  positionCard: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    backgroundColor: 'rgba(49,130,206,0.08)',
  },
  positionLabel: { color: colors.accent, fontSize: 10, fontFamily: 'monospace' },
  positionCoords: { color: colors.white, fontSize: 16, fontFamily: 'monospace', fontWeight: '700' },
  positionMeta: { color: colors.muted, fontSize: 11, fontFamily: 'monospace' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: { color: colors.muted, fontSize: 9, fontFamily: 'monospace' },
  chipValue: { color: colors.white, fontSize: 13, fontFamily: 'monospace', fontWeight: '600' },
  trackCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  trackCurrent: { borderColor: colors.accent, backgroundColor: 'rgba(49,130,206,0.1)' },
  trackBlocked: { borderColor: colors.blocked },
  trackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  trackLabel: { flex: 1, color: colors.white, fontFamily: 'monospace', fontWeight: '600', fontSize: 13 },
  phaseTag: { fontSize: 10, fontFamily: 'monospace', fontWeight: '700' },
  trackGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniStat: { width: '30%' },
  miniLabel: { color: colors.muted, fontSize: 9, fontFamily: 'monospace' },
  miniValue: { color: colors.textLight, fontSize: 12, fontFamily: 'monospace' },
  progressWrap: { gap: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#1e293b', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  progressText: { color: colors.muted, fontSize: 10, fontFamily: 'monospace' },
  advisory: { color: colors.solar, fontSize: 11, fontFamily: 'monospace' },
  altCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, gap: 6 },
  altTitle: { color: colors.muted, fontSize: 10, fontFamily: 'monospace' },
  altRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  altLabel: { flex: 1, color: colors.textLight, fontSize: 11, fontFamily: 'monospace' },
  altScore: { color: colors.approved, fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
});
