import Slider from '@react-native-community/slider';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  stormSeverity: number;
  solarKp: number;
  portCongestion: number;
  loading: boolean;
  simulatedScore?: number;
  alerts: string[];
  onStormChange: (v: number) => void;
  onSolarChange: (v: number) => void;
  onPortChange: (v: number) => void;
  onSimulate: () => void;
}

export default function ThreatSimulator({
  stormSeverity,
  solarKp,
  portCongestion,
  loading,
  simulatedScore,
  alerts,
  onStormChange,
  onSolarChange,
  onPortChange,
  onSimulate,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>THREAT SIMULATION CENTER</Text>

      <Text style={styles.label}>Storm Severity ({Math.round(stormSeverity)}%)</Text>
      <Slider minimumValue={0} maximumValue={100} value={stormSeverity} onValueChange={onStormChange} minimumTrackTintColor={colors.solar} thumbTintColor={colors.solar} />

      <Text style={styles.label}>Solar Kp-Index ({Math.round(solarKp)})</Text>
      <Slider minimumValue={0} maximumValue={9} step={1} value={solarKp} onValueChange={onSolarChange} minimumTrackTintColor={colors.solar} thumbTintColor={colors.solar} />

      <Text style={styles.label}>Port Congestion ({Math.round(portCongestion)}%)</Text>
      <Slider minimumValue={0} maximumValue={100} value={portCongestion} onValueChange={onPortChange} minimumTrackTintColor={colors.solar} thumbTintColor={colors.solar} />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={onSimulate} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>INJECT THREAT</Text>}
      </Pressable>

      {simulatedScore !== undefined ? (
        <Text style={styles.simScore}>Simulated Score: {simulatedScore}</Text>
      ) : null}

      {alerts.map((a) => (
        <Text key={a} style={styles.alert}>⚠ {a}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  heading: { color: colors.solar, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  label: { color: colors.muted, fontSize: 12, fontFamily: 'monospace' },
  button: {
    backgroundColor: colors.solar,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: '700', fontFamily: 'monospace' },
  simScore: { color: colors.solar, fontFamily: 'monospace', fontSize: 14 },
  alert: { color: colors.blocked, fontSize: 12, fontFamily: 'monospace' },
});
