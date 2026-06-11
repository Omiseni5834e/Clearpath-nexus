import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { palette } from '../theme';
import { colors } from '../theme/colors';
import type { LoadProfile } from '../types/loadProfile';
import type { LocationMode, Station } from '../types/route';
import { findNearestStation } from '../utils/nearestStation';
import StationPicker from './StationPicker';

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
  locatingNearest?: boolean;
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
  locatingNearest = false,
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
  const canApprove = hasResult && resultApproved && !routeApproved;

  const tap = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateDestination = useCallback((index: number, code: string) => {
    onDestinationsChange(destinations.map((d, i) => (i === index ? code : d)));
  }, [destinations, onDestinationsChange]);

  const addDestination = useCallback(() => {
    void tap();
    if (destinations.length >= 5) return;
    const used = new Set(destinations);
    if (excludeOrigin) used.add(excludeOrigin);
    const next = codes.find((c) => !used.has(c));
    if (next) onDestinationsChange([...destinations, next]);
  }, [codes, destinations, excludeOrigin, onDestinationsChange, tap]);

  const confirmRemoveDestination = useCallback((index: number) => {
    if (destinations.length <= 1) return;
    Alert.alert('Remove this stop from route?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void tap();
          onDestinationsChange(destinations.filter((_, i) => i !== index));
        },
      },
    ]);
  }, [destinations, onDestinationsChange, tap]);

  const moveDestination = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= destinations.length) return;
    const next = [...destinations];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    onDestinationsChange(next);
  }, [destinations, onDestinationsChange]);

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>ROUTE CONFIG</Text>

        {loadProfile ? (
          <View style={styles.profileBox}>
            <View style={styles.profileHeader}>
              <Text style={styles.profileLabel}>ACTIVE LOAD PROFILE</Text>
              <Pressable testID="change-profile-button" onPress={onChangeProfile}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
            <Text style={styles.profileName}>{loadProfile.name}</Text>
            <Text style={styles.profileMeta}>
              {loadProfile.height}m x {loadProfile.width}m / {loadProfile.weight}T / {loadProfile.compartments} compartment
              {loadProfile.compartments === 1 ? '' : 's'}
            </Text>
          </View>
        ) : (
          <Pressable testID="missing-profile-button" style={styles.missingProfile} onPress={onChangeProfile}>
            <Text style={styles.missingText}>Select a load profile first</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>FROM</Text>
        <View style={styles.modeRow}>
          {([
            ['station', 'Station'],
            ['coordinates', 'Coords'],
            ['live', 'Live GPS'],
          ] as const).map(([mode, label]) => (
            <Pressable
              testID={`location-mode-${mode}`}
              key={mode}
              style={[styles.modeBtn, locationMode === mode && styles.modeBtnActive]}
              onPress={() => {
                void tap();
                onLocationModeChange(mode);
              }}
            >
              <Text style={[styles.modeText, locationMode === mode && styles.modeTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {locationMode === 'station' ? (
          <View style={styles.originRow}>
            <View style={styles.originPicker}>
              <StationPicker
                label="Current station"
                value={locationStation}
                codes={codes}
                stations={stations}
                onChange={onLocationStationChange}
              />
            </View>
            <Pressable
              testID="use-my-location-button"
              style={styles.locationPill}
              onPress={() => {
                void tap();
                onUseGpsOnce();
              }}
            >
              <Text style={styles.locationPillText}>{locatingNearest ? 'Locating...' : 'Use My Location'}</Text>
            </Pressable>
          </View>
        ) : null}

        {locationMode === 'coordinates' ? (
          <View style={styles.row}>
            <Field label="Latitude" value={locationLat} onChange={onLocationLatChange} returnKeyType="next" />
            <Field label="Longitude" value={locationLon} onChange={onLocationLonChange} returnKeyType="done" />
          </View>
        ) : null}

        {locationMode === 'live' ? (
          <View style={styles.liveBox}>
            <Pressable testID="capture-gps-button" style={styles.secondaryBtn} onPress={onUseGpsOnce}>
              <Text style={styles.secondaryText}>{locatingNearest ? 'Locating nearest station...' : 'Use My Location'}</Text>
            </Pressable>
            <Pressable
              testID="toggle-live-tracking-button"
              style={[styles.secondaryBtn, liveTracking && styles.liveActive]}
              onPress={onToggleLiveTracking}
            >
              <Text style={[styles.secondaryText, liveTracking && styles.liveActiveText]}>
                {liveTracking ? 'Live tracking ON' : 'Start live tracking'}
              </Text>
            </Pressable>
            <Text style={styles.gpsCoords}>Last fix: {locationLat || '-'}, {locationLon || '-'}</Text>
          </View>
        ) : null}

        {nearest ? (
          <View style={styles.nearestBox}>
            <Text style={styles.nearestLabel}>NEAREST RAILWAY STATION</Text>
            <Text style={styles.nearestValue}>{nearest.station.code} - {nearest.station.name}</Text>
            <Text style={styles.nearestMeta}>{nearest.distanceKm} km from current fix</Text>
          </View>
        ) : null}

        <View style={styles.destHeader}>
          <Text style={styles.sectionTitle}>STOPS</Text>
          <Pressable testID="add-stop-button" onPress={addDestination} disabled={destinations.length >= 5}>
            <Text style={[styles.addStop, destinations.length >= 5 && styles.disabledText]}>Add Stop +</Text>
          </Pressable>
        </View>

        {destinations.map((dest, index) => (
          <View key={`${index}-${dest}`} style={styles.destCard}>
            <View style={styles.dragColumn}>
              <Pressable testID={`move-stop-${index}-up`} onPress={() => moveDestination(index, -1)} disabled={index === 0}>
                <Text style={[styles.dragText, index === 0 && styles.disabledText]}>UP</Text>
              </Pressable>
              <Text style={styles.destIndex}>{index + 1}</Text>
              <Pressable
                testID={`move-stop-${index}-down`}
                onPress={() => moveDestination(index, 1)}
                disabled={index === destinations.length - 1}
              >
                <Text style={[styles.dragText, index === destinations.length - 1 && styles.disabledText]}>DN</Text>
              </Pressable>
            </View>
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
              <Pressable testID={`remove-stop-${index}`} onPress={() => confirmRemoveDestination(index)} style={styles.removeBtn}>
                <Text style={styles.removeText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {destConflict ? <Text style={styles.error}>Destination cannot match current origin.</Text> : null}

        <Text style={styles.label}>Train Arrival (hours from now)</Text>
        <TextInput
          testID="train-hours-input"
          style={styles.input}
          value={trainHours}
          onChangeText={onTrainHoursChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholderTextColor={colors.disabled}
        />

        <Pressable
          testID="evaluate-route-button"
          style={[styles.primaryBtn, (loading || !loadProfile || destConflict) && styles.buttonDisabled]}
          onPress={onEvaluate}
          disabled={loading || !loadProfile || destConflict}
        >
          {loading ? <ActivityIndicator color={palette.base} /> : <Text style={styles.primaryText}>Evaluate Route</Text>}
        </Pressable>

        <Pressable
          testID="approve-route-panel-button"
          style={[styles.approveBtn, routeApproved && styles.approveBtnDone, !canApprove && styles.buttonDisabled]}
          onPress={onApproveRoute}
          disabled={!canApprove}
        >
          <Text style={[styles.approveText, routeApproved && styles.approveTextDone]}>
            {routeApproved ? 'Route Approved' : 'Approve Route'}
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  returnKeyType: 'next' | 'done';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        returnKeyType={returnKeyType}
        placeholderTextColor={colors.disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  heading: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sectionTitle: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  profileBox: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    padding: 14,
    gap: 5,
  },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileLabel: { color: colors.approved, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  changeLink: { color: colors.textLight, fontSize: 12, fontWeight: '700' },
  profileName: { color: colors.textLight, fontWeight: '800', fontSize: 15 },
  profileMeta: { color: colors.muted, fontSize: 11 },
  missingProfile: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.blocked,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  missingText: { color: colors.blocked, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  originRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  originPicker: { flex: 1 },
  field: { flex: 1 },
  label: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: palette.input,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: 12,
    padding: 10,
    color: colors.textLight,
  },
  modeRow: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    alignItems: 'center',
    backgroundColor: palette.buttonSecondary,
  },
  modeBtnActive: { borderColor: colors.approved, backgroundColor: palette.glowGreen },
  modeText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  modeTextActive: { color: colors.approved },
  locationPill: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    backgroundColor: palette.buttonSecondary,
  },
  locationPillText: { color: colors.textLight, fontSize: 11, fontWeight: '800' },
  liveBox: { gap: 8 },
  secondaryBtn: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    alignItems: 'center',
    backgroundColor: palette.buttonSecondary,
  },
  secondaryText: { color: colors.textLight, fontSize: 12, fontWeight: '800' },
  liveActive: { borderColor: colors.approved, backgroundColor: palette.glowGreen },
  liveActiveText: { color: colors.approved },
  gpsCoords: { color: colors.muted, fontSize: 11 },
  nearestBox: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 20,
    padding: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    gap: 3,
  },
  nearestLabel: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  nearestValue: { color: colors.textLight, fontSize: 13, fontWeight: '800' },
  nearestMeta: { color: colors.muted, fontSize: 11 },
  destHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addStop: { color: colors.approved, fontSize: 12, fontWeight: '800' },
  disabledText: { color: colors.disabled },
  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    backgroundColor: colors.panel,
    padding: 10,
  },
  dragColumn: { width: 28, alignItems: 'center', gap: 4 },
  dragText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  destIndex: { color: colors.textLight, fontSize: 14, fontWeight: '900' },
  destPicker: { flex: 1 },
  removeBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.destructiveBorder,
    backgroundColor: palette.destructiveBg,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeText: { color: colors.blocked, fontSize: 11, fontWeight: '800' },
  primaryBtn: {
    backgroundColor: colors.approved,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: palette.base, fontWeight: '900' },
  approveBtn: {
    borderWidth: 1,
    borderColor: colors.approved,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: palette.glowGreen,
  },
  approveBtnDone: { backgroundColor: colors.approved, borderColor: colors.approved },
  approveText: { color: colors.approved, fontWeight: '900', fontSize: 13 },
  approveTextDone: { color: palette.base },
  buttonDisabled: { opacity: 0.42 },
  error: { color: colors.blocked, fontSize: 12 },
});
