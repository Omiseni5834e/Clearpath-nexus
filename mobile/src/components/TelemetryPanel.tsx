import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RouteSuggestResponse } from '../types/route';
import { colors } from '../theme/colors';
import ThreatSimulator from './ThreatSimulator';
import TrackIntelPanel from './TrackIntelPanel';

interface Props {
  result: RouteSuggestResponse | null;
  stormSeverity: number;
  solarKp: number;
  portCongestion: number;
  simLoading: boolean;
  simulatedScore?: number;
  simAlerts: string[];
  onStormChange: (v: number) => void;
  onSolarChange: (v: number) => void;
  onPortChange: (v: number) => void;
  onSimulate: () => void;
}

function MetricBar({ label, value, barColor }: { label: string; value: number; barColor: string }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <Text style={styles.breakdownVal}>{Math.round(value)}</Text>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export default function TelemetryPanel({
  result,
  stormSeverity,
  solarKp,
  portCongestion,
  simLoading,
  simulatedScore,
  simAlerts,
  onStormChange,
  onSolarChange,
  onPortChange,
  onSimulate,
}: Props) {
  const statusColor =
    result?.status === 'HARD_BLOCKED' ? colors.blocked : result?.status === 'APPROVED' ? colors.approved : colors.muted;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>TELEMETRY BOARD</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>ROUTE RELIABILITY INDEX</Text>
        <Text style={[styles.score, { color: statusColor }]}>{result?.reliability_score ?? '—'}</Text>
        {result?.status ? <Text style={[styles.status, { color: statusColor }]}>{result.status}</Text> : null}
        {result?.estimated_hours != null ? (
          <Text style={styles.meta}>Est. transit: {result.estimated_hours}h</Text>
        ) : null}
      </View>

      {result?.score_breakdown ? (
        <View style={[styles.card, styles.breakdownCard]}>
          <Text style={styles.breakdownTitle}>SCORE BREAKDOWN</Text>
          <MetricBar label="Weather" value={result.score_breakdown.weather} barColor="#38BDF8" />
          <MetricBar label="Port" value={result.score_breakdown.port} barColor="#818CF8" />
          <MetricBar label="Congestion" value={result.score_breakdown.congestion} barColor="#FBBF24" />
          <MetricBar label="Historical" value={result.score_breakdown.historical} barColor="#34D399" />
        </View>
      ) : null}

      {result?.environmental_alerts && result.environmental_alerts.length > 0 ? (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertHeading}>ENVIRONMENTAL ALERTS</Text>
          {result.environmental_alerts.map((a) => (
            <Text key={a} style={styles.alertText}>⚠ {a}</Text>
          ))}
        </View>
      ) : null}

      <TrackIntelPanel
        trainPosition={result?.train_position}
        remainingKm={result?.remaining_km}
        etaHours={result?.eta_hours}
        nextStation={result?.next_station}
        trackDetails={result?.track_details ?? []}
        alternateRoutes={result?.alternate_routes ?? []}
      />

      <ThreatSimulator
        stormSeverity={stormSeverity}
        solarKp={solarKp}
        portCongestion={portCongestion}
        loading={simLoading}
        simulatedScore={simulatedScore}
        alerts={simAlerts}
        onStormChange={onStormChange}
        onSolarChange={onSolarChange}
        onPortChange={onPortChange}
        onSimulate={onSimulate}
      />

      {result?.status === 'APPROVED' ? (
        <Pressable style={styles.dispatchBtn}>
          <Text style={styles.dispatchText}>Finalize and Dispatch Route</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  heading: { color: colors.textLight, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, gap: 4, backgroundColor: 'rgba(15,23,42,0.5)' },
  cardLabel: { color: colors.muted, fontSize: 11, fontFamily: 'monospace' },
  score: { fontSize: 48, fontWeight: '700', fontFamily: 'monospace' },
  status: { fontSize: 14, fontFamily: 'monospace', fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, fontFamily: 'monospace' },
  breakdownCard: { gap: 10 },
  breakdownTitle: { color: colors.muted, fontSize: 10, fontFamily: 'monospace', marginBottom: 4 },
  metric: { gap: 4 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  metricTrack: { height: 8, borderRadius: 4, backgroundColor: '#1e293b', overflow: 'hidden' },
  metricFill: { height: '100%', borderRadius: 4 },
  breakdownLabel: { color: colors.muted, fontSize: 10, fontFamily: 'monospace' },
  breakdownVal: { color: colors.textLight, fontSize: 12, fontFamily: 'monospace' },
  alertCard: { borderColor: colors.blocked },
  alertHeading: { color: colors.blocked, fontSize: 11, fontFamily: 'monospace' },
  alertText: { color: colors.blocked, fontSize: 12, fontFamily: 'monospace', marginTop: 4 },
  dispatchBtn: { backgroundColor: colors.accent, padding: 14, borderRadius: 8, alignItems: 'center' },
  dispatchText: { color: colors.white, fontWeight: '600' },
});
