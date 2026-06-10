import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LocationMode, Station } from '../types/route';
import type { LoadProfile } from '../types/loadProfile';
import { colors } from '../theme/colors';
import StationPicker from './StationPicker';
import { findNearestStation } from '../utils/nearestStation';

interface Props {
  stations: Station[];
  loadProfile: LoadProfile | null;
  locationMode: LocationMode;
  locationStation: string;
  locationLat: string;
  locationLon: string;
  liveTracking: boolean;
  destinations: string[];
  trainHours: string;
  loading: boolean;
  error: string | null;
  routeApproved: boolean;
  hasResult: boolean;
  resultApproved: boolean;
  onLocationModeChange: (v: LocationMode) => void;
  onLocationStationChange: (v: string) => void;
  onLocationLatChange: (v: string) => void;
  onLocationLonChange: (v: string) => void;
  onToggleLiveTracking: () => void;
  onUseGpsOnce: () => void;
  onDestinationsChange: (v: string[]) => void;
  onTrainHoursChange: (v: string) => void;
  onEvaluate: () => void;
  onApproveRoute: () => void;
  onChangeProfile: () => void;
}

export default function ConfigPanel({
  stations,
  loadProfile,
  locationMode,
  locationStation,
  locationLat,
  locationLon,
  liveTracking,
  destinations,
  trainHours,
  loading,
  error,
  routeApproved,
  hasResult,
  resultApproved,
  onLocationModeChange,
  onLocationStationChange,
  onLocationLatChange,
  onLocationLonChange,
  onToggleLiveTracking,
  onUseGpsOnce,
  onDestinationsChange,
  onTrainHoursChange,
  onEvaluate,
  onApproveRoute,
  onChangeProfile,
}: Props) {
  const codes = stations.length > 0 ? stations.map((s) => s.code) : ['NGP', 'BSL', 'MMR', 'KYN', 'JNPT', 'PUNE'];

  const originCode = locationMode === 'station' ? locationStation : undefined;
  const lat = parseFloat(locationLat);
  const lon = parseFloat(locationLon);
  const nearest =
    locationMode !== 'station' && !Number.isNaN(lat) && !Number.isNaN(lon)
      ? findNearestStation(stations, lat, lon)
      : null;
  const excludeOrigin = originCode ?? nearest?.station.code;
  const destConflict = !!excludeOrigin && destinations.every((d) => d === excludeOrigin);

  const updateDestination = (index: number, code: string) => {
    onDestinationsChange(destinations.map((d, i) => (i === index ? code : d)));
  };

  const addDestination = () => {
    const used = new Set(destinations);
    if (excludeOrigin) used.add(excludeOrigin);
    const next = codes.find((c) => !used.has(c));
    if (next) onDestinationsChange([...destinations, next]);
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    onDestinationsChange(destinations.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>POSITION & ROUTING</Text>

      {loadProfile ? (
        <View style={styles.profileBox}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileLabel}>ACTIVE LOAD PROFILE</Text>
            <Pressable onPress={onChangeProfile}>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>
          <Text style={styles.profileName}>{loadProfile.name}</Text>
          <Text style={styles.profileMeta}>
            {loadProfile.height}m × {loadProfile.width}m · {loadProfile.weight}T ·{' '}
            {loadProfile.compartments} compartment{loadProfile.compartments === 1 ? '' : 's'}
          </Text>
        </View>
      ) : (
        <Pressable style={styles.missingProfile} onPress={onChangeProfile}>
          <Text style={styles.missingText}>Select a load profile first</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Current train location</Text>
      <View style={styles.modeRow}>
        {(
          [
            ['station', 'At station'],
            ['coordinates', 'Coordinates'],
            ['live', 'Live GPS'],
          ] as const
        ).map(([mode, label]) => (
          <Pressable
            key={mode}
            style={[styles.modeBtn, locationMode === mode && styles.modeBtnActive]}
            onPress={() => onLocationModeChange(mode)}
          >
            <Text style={[styles.modeText, locationMode === mode && styles.modeTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {locationMode === 'station' ? (
        <StationPicker
          label="Current station"
          value={locationStation}
          codes={codes}
          stations={stations}
          onChange={onLocationStationChange}
        />
      ) : null}

      {locationMode === 'coordinates' ? (
        <View style={styles.row}>
          <Field label="Latitude" value={locationLat} onChange={onLocationLatChange} />
          <Field label="Longitude" value={locationLon} onChange={onLocationLonChange} />
        </View>
      ) : null}

      {locationMode === 'live' ? (
        <View style={styles.liveBox}>
          <Pressable style={styles.gpsBtn} onPress={onUseGpsOnce}>
            <Text style={styles.gpsBtnText}>Capture GPS now</Text>
          </Pressable>
          <Pressable
            style={[styles.gpsBtn, liveTracking && styles.gpsBtnActive]}
            onPress={onToggleLiveTracking}
          >
            <Text style={[styles.gpsBtnText, liveTracking && styles.gpsBtnTextActive]}>
              {liveTracking ? 'Live tracking ON' : 'Start live tracking'}
            </Text>
          </Pressable>
          {(locationLat || locationLon) ? (
            <Text style={styles.gpsCoords}>
              Last fix: {locationLat || '—'}, {locationLon || '—'}
            </Text>
          ) : null}
        </View>
      ) : null}

      {nearest ? (
        <View style={styles.nearestBox}>
          <Text style={styles.nearestLabel}>NEAREST RAILWAY STATION</Text>
          <Text style={styles.nearestValue}>
            {nearest.station.code} — {nearest.station.name}
          </Text>
          <Text style={styles.nearestMeta}>{nearest.distanceKm} km from current fix</Text>
        </View>
      ) : null}

      <View style={styles.destHeader}>
        <Text style={styles.label}>Destinations (in order)</Text>
        <Pressable onPress={addDestination}>
          <Text style={styles.addStop}>+ Add stop</Text>
        </Pressable>
      </View>

      {destinations.map((dest, index) => (
        <View key={`${index}-${dest}`} style={styles.destRow}>
          <Text style={styles.destIndex}>{index + 1}</Text>
          <View style={styles.destPicker}>
            <StationPicker
              label={`Stop ${index + 1}`}
              value={dest}
              codes={codes}
              stations={stations}
              onChange={(code) => updateDestination(index, code)}
              excludeCode={excludeOrigin}
            />
          </View>
          {destinations.length > 1 ? (
            <Pressable onPress={() => removeDestination(index)}>
              <Text style={styles.removeStop}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {destConflict ? (
        <Text style={styles.error}>Destination cannot match current origin.</Text>
      ) : null}

      <Text style={styles.label}>Train Arrival (hours from now)</Text>
      <TextInput
        style={styles.input}
        value={trainHours}
        onChangeText={onTrainHoursChange}
        keyboardType="decimal-pad"
      />

      <Pressable
        style={[styles.button, (loading || !loadProfile || destConflict) && styles.buttonDisabled]}
        onPress={onEvaluate}
        disabled={loading || !loadProfile || destConflict}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Suggest Remaining Route</Text>
        )}
      </Pressable>

      <Pressable
        style={[
          styles.approveBtn,
          routeApproved && styles.approveBtnDone,
          (!hasResult || !resultApproved) && styles.buttonDisabled,
        ]}
        onPress={onApproveRoute}
        disabled={!hasResult || !resultApproved}
      >
        <Text style={[styles.approveText, routeApproved && styles.approveTextDone]}>
          {routeApproved ? 'Route Approved' : 'Approve Route'}
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  heading: { color: colors.textLight, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { color: colors.accent, fontSize: 11, fontFamily: 'monospace', fontWeight: '600', marginTop: 4 },
  profileBox: {
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 12,
    gap: 4,
  },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileLabel: { color: colors.accent, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },
  changeLink: { color: colors.textLight, fontSize: 11, fontFamily: 'monospace' },
  profileName: { color: colors.white, fontWeight: '700', fontSize: 14 },
  profileMeta: { color: colors.muted, fontSize: 11, fontFamily: 'monospace' },
  missingProfile: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.blocked,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  missingText: { color: colors.blocked, fontSize: 12, fontFamily: 'monospace' },
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1 },
  label: { color: colors.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    color: colors.white,
    fontFamily: 'monospace',
  },
  modeRow: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.panel,
  },
  modeBtnActive: { borderColor: colors.accent, backgroundColor: 'rgba(49,130,206,0.15)' },
  modeText: { color: colors.muted, fontSize: 10, fontFamily: 'monospace', fontWeight: '600' },
  modeTextActive: { color: colors.accent },
  liveBox: { gap: 8 },
  gpsBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.panel,
  },
  gpsBtnActive: { borderColor: colors.approved, backgroundColor: 'rgba(56,161,105,0.12)' },
  gpsBtnText: { color: colors.textLight, fontFamily: 'monospace', fontSize: 12, fontWeight: '600' },
  gpsBtnTextActive: { color: colors.approved },
  gpsCoords: { color: colors.muted, fontSize: 11, fontFamily: 'monospace' },
  nearestBox: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgba(49,130,206,0.1)',
    gap: 2,
  },
  nearestLabel: { color: colors.accent, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },
  nearestValue: { color: colors.white, fontSize: 12, fontFamily: 'monospace', fontWeight: '600' },
  nearestMeta: { color: colors.muted, fontSize: 10, fontFamily: 'monospace' },
  destHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addStop: { color: colors.accent, fontSize: 10, fontFamily: 'monospace', fontWeight: '600' },
  destRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  destIndex: { color: colors.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 28, width: 16 },
  destPicker: { flex: 1 },
  removeStop: { color: colors.blocked, fontSize: 10, fontFamily: 'monospace', marginTop: 28 },
  button: {
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  approveBtn: {
    borderWidth: 1,
    borderColor: colors.approved,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(56,161,105,0.12)',
  },
  approveBtnDone: { backgroundColor: colors.approved, borderColor: colors.approved },
  approveText: { color: colors.approved, fontWeight: '700', fontFamily: 'monospace', fontSize: 13 },
  approveTextDone: { color: colors.white },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: '600' },
  error: { color: colors.blocked, fontSize: 12, fontFamily: 'monospace' },
});
