import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utilities & Hooks
import ErrorBoundary from './src/components/ErrorBoundary';
import ToastProvider, { useToast } from './src/components/ToastProvider';
import { validateConfig } from './src/config';
import { initDatabase, saveRouteHistory, getRouteHistoryList, getLoadProfilesList, saveLoadProfile, deleteLoadProfile, clearRouteHistory } from './src/services/database';
import { evaluateRoute } from './src/services/routeService';
import { getNearbyStations, getRailwayTrackGeometry } from './src/services/stationService';
import { useLocation } from './src/hooks/useLocation';
import { useWeather } from './src/hooks/useWeather';
import { useTheme } from './src/hooks/useTheme';
import { useOffline } from './src/hooks/useOffline';
import { hapticFeedback } from './src/utils/haptics';

// Screens
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { MapScreen } from './src/screens/MapScreen';
import { RoutingPanel } from './src/screens/RoutingPanel';
import { TelemetryScreen } from './src/screens/TelemetryScreen';
import { ProfilesScreen } from './src/screens/ProfilesScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { GlassCard } from './src/components/GlassCard';
import type { Station } from './src/types';

// Components
import { OfflineBanner } from './src/components/OfflineBanner';

type Tab = 'onboarding' | 'map' | 'routing' | 'telemetry' | 'profiles' | 'history' | 'settings';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </ErrorBoundary>
  );
}

function MainApp() {
  validateConfig();

  const { showToast } = useToast();
  const { theme, isDark, toggleTheme } = useTheme();
  const { location: userLocation, error: locationError, permissionDenied: locPermissionDenied, refresh: refreshLocation } = useLocation();
  const { isOffline, wasOffline } = useOffline();

  const [tab, setTab] = useState<Tab>('map');
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // States
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  const [fromStation, setFromStation] = useState<any | null>(null);
  const [waypoints, setWaypoints] = useState<Array<any | null>>([]);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [trackGeometry, setTrackGeometry] = useState<any[]>([]);
  const [routeApproved, setRouteApproved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);

  // Initialize DB and fetch local caches
  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        const profilesList = await getLoadProfilesList();
        setProfiles(profilesList);
        if (profilesList.length > 0) {
          setSelectedProfile(profilesList[0]);
        }

        const hist = await getRouteHistoryList();
        setHistory(hist);

        const ob = await AsyncStorage.getItem('onboarding_complete');
        if (ob === 'true') {
          setOnboardingComplete(true);
        } else {
          setTab('onboarding');
        }
      } catch (e) {
        showToast('Database init failed', 'error');
      }
    }
    init();
  }, [showToast]);

  // Handle Offline Status Toast alerts
  useEffect(() => {
    if (wasOffline) {
      showToast('Back online — data refreshed', 'success');
      hapticFeedback.success();
    }
  }, [wasOffline, showToast]);

  // Combine stations into evaluating list
  const activeStations = useMemo(() => {
    const list: any[] = [];
    if (fromStation) list.push(fromStation);
    waypoints.forEach((w) => {
      if (w) list.push(w);
    });
    return list;
  }, [fromStation, waypoints]);

  const activeCodes = useMemo(() => activeStations.map((s) => s.code), [activeStations]);
  const { weatherMap, refresh: refreshWeather } = useWeather(activeCodes, activeStations);

  const handleCreateProfile = async (p: any) => {
    try {
      const saved = await saveLoadProfile(p);
      setProfiles((prev) => [saved, ...prev]);
      setSelectedProfile(saved);
      showToast('Profile saved successfully', 'success');
    } catch (e) {
      showToast('Failed to create profile', 'error');
    }
  };

  const handleDeleteProfile = async (id: number) => {
    try {
      await deleteLoadProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedProfile?.id === id) {
        setSelectedProfile(null);
      }
      showToast('Profile deleted', 'success');
    } catch (e) {
      showToast('Delete failed', 'error');
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearRouteHistory();
      setHistory([]);
      showToast('Route history cleared', 'success');
    } catch (e) {
      showToast('Clear failed', 'error');
    }
  };

  const handleEvaluate = async () => {
    if (activeStations.length < 2) {
      showToast('Add at least an origin and a destination stop.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const evalResult = await evaluateRoute(activeStations);
      setEvaluation(evalResult);
      setRouteApproved(false);

      // Fetch track geometries inside BBOX
      const lats = activeStations.map((s) => s.lat);
      const lons = activeStations.map((s) => s.lon);
      const minLat = Math.min(...lats) - 0.5;
      const maxLat = Math.max(...lats) + 0.5;
      const minLon = Math.min(...lons) - 0.5;
      const maxLon = Math.max(...lons) + 0.5;

      const tracks = await getRailwayTrackGeometry(minLat, minLon, maxLat, maxLon);
      setTrackGeometry(tracks);

      if (evalResult.status === 'APPROVED') {
        await hapticFeedback.success();
      } else if (evalResult.status === 'CAUTION') {
        await hapticFeedback.warning();
      } else {
        await hapticFeedback.heavy();
      }
    } catch (e) {
      showToast('Evaluation failed', 'error');
      await hapticFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  const triggerApproveModal = () => {
    if (!evaluation) {
      showToast('Evaluate route first.', 'warning');
      return;
    }
    if (evaluation.status !== 'APPROVED') {
      showToast('Route must be APPROVED to dispatch.', 'error');
      return;
    }
    setApproveModalVisible(true);
  };

  const handleApproveConfirm = async () => {
    if (!evaluation) return;
    try {
      const payload = {
        ...evaluation,
        approvedAt: new Date().toISOString(),
      };
      await saveRouteHistory(payload);
      setRouteApproved(true);
      setHistory((prev) => [payload, ...prev]);
      setApproveModalVisible(false);
      showToast('Route approved successfully', 'success');
      await hapticFeedback.success();
    } catch (e) {
      showToast('Failed to save approval.', 'error');
    }
  };

  const handleAutoLocate = async () => {
    if (!userLocation) {
      showToast('Obtaining location coordinates...', 'info');
      refreshLocation();
      return;
    }
    try {
      const list = await getNearbyStations(userLocation.latitude, userLocation.longitude, 20);
      if (list.length === 0) {
        showToast('No station found nearby (20km)', 'warning');
      } else if (list.length === 1) {
        setFromStation(list[0]);
        showToast(`Location found: ${list[0].name}`, 'success');
      } else {
        // Automatically select the nearest
        setFromStation(list[0]);
        showToast(`Selected nearest: ${list[0].name}`, 'success');
      }
    } catch (e) {
      showToast('Failed to locate nearby stations', 'error');
    }
  };

  const handleAddWaypoint = () => {
    setWaypoints((prev) => [...prev, null]);
  };

  const handleUpdateWaypoint = (index: number, station: Station) => {
    setWaypoints((prev) => {
      const next = [...prev];
      next[index] = station;
      return next;
    });
  };

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />

        {/* Global Banner for Location Permission Warning */}
        {locPermissionDenied && (
          <View style={styles.amberWarning}>
            <Text style={styles.warningText}>
              ⚠️ Enable location to auto-detect your nearest station
            </Text>
          </View>
        )}

        <View style={styles.body}>
          {tab === 'onboarding' ? (
            <OnboardingScreen
              onComplete={() => {
                setOnboardingComplete(true);
                setTab('map');
              }}
            />
          ) : null}

          {tab === 'map' ? (
            <MapScreen
              evaluation={evaluation}
              stations={activeStations}
              weatherMap={weatherMap}
              trackGeometry={trackGeometry}
              userLocation={userLocation}
              isOffline={isOffline}
              onLocateUser={handleAutoLocate}
              onApproveRoute={triggerApproveModal}
              routeApproved={routeApproved}
            />
          ) : null}

          {tab === 'routing' ? (
            <RoutingPanel
              fromStation={fromStation}
              waypoints={waypoints}
              loadProfiles={profiles}
              selectedProfile={selectedProfile}
              onSetFrom={setFromStation}
              onAddWaypoint={handleAddWaypoint}
              onUpdateWaypoint={handleUpdateWaypoint}
              onRemoveWaypoint={handleRemoveWaypoint}
              onSelectProfile={setSelectedProfile}
              onEvaluate={handleEvaluate}
              onApproveRoute={triggerApproveModal}
              loading={loading}
              evaluation={evaluation}
              routeApproved={routeApproved}
            />
          ) : null}

          {tab === 'telemetry' ? (
            <TelemetryScreen
              evaluation={evaluation}
              weatherMap={weatherMap}
              onRefresh={async () => {
                setRefreshing(true);
                await refreshWeather();
                setRefreshing(false);
              }}
              refreshing={refreshing}
            />
          ) : null}

          {tab === 'profiles' ? (
            <ProfilesScreen
              profiles={profiles}
              onCreateProfile={handleCreateProfile}
              onDeleteProfile={handleDeleteProfile}
              onSelectProfile={setSelectedProfile}
              onRefresh={async () => {
                setRefreshing(true);
                const list = await getLoadProfilesList();
                setProfiles(list);
                setRefreshing(false);
              }}
              refreshing={refreshing}
            />
          ) : null}

          {tab === 'history' ? (
            <HistoryScreen
              history={history}
              onRefresh={async () => {
                setRefreshing(true);
                const list = await getRouteHistoryList();
                setHistory(list);
                setRefreshing(false);
              }}
              refreshing={refreshing}
            />
          ) : null}

          {tab === 'settings' ? (
            <SettingsScreen
              onClearHistory={handleClearHistory}
              onApproveRoute={triggerApproveModal}
              hasActiveRoute={!!evaluation}
            />
          ) : null}
        </View>

        {tab !== 'onboarding' && (
          <View style={styles.tabs}>
            {(
              [
                ['map', 'Map'],
                ['routing', 'Routing'],
                ['telemetry', 'Telemetry'],
                ['profiles', 'Profiles'],
                ['history', 'History'],
                ['settings', 'Settings'],
              ] as const
            ).map(([t, label]) => (
              <Pressable
                key={t}
                onPress={() => {
                  hapticFeedback.light();
                  setTab(t);
                }}
                style={[styles.tab, tab === t && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <OfflineBanner visible={isOffline} />

        {/* Confirmation Approve Modal */}
        <Modal visible={approveModalVisible} transparent animationType="fade">
          <View style={styles.modalBg}>
            <GlassCard size="large" style={styles.modalCard}>
              <Text style={styles.modalTitle}>Approve Route</Text>
              <Text style={styles.modalDesc}>
                Approve this route for cargo dispatch?
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setApproveModalVisible(false)}
                  style={styles.modalCancel}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleApproveConfirm} style={styles.modalConfirm}>
                  <Text style={styles.confirmText}>Confirm</Text>
                </Pressable>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  body: {
    flex: 1,
  },
  amberWarning: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderColor: 'rgba(255, 140, 0, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 12,
  },
  warningText: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#0F1623',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00FF88',
  },
  tabText: {
    color: '#8892A4',
    fontSize: 10,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00FF88',
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 20, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F0F4FF',
  },
  modalDesc: {
    fontSize: 14,
    color: '#8892A4',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  modalCancel: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    width: '45%',
    alignItems: 'center',
  },
  modalConfirm: {
    backgroundColor: '#00FF88',
    borderRadius: 14,
    paddingVertical: 12,
    width: '45%',
    alignItems: 'center',
  },
  cancelText: {
    color: '#F0F4FF',
    fontWeight: '600',
  },
  confirmText: {
    color: '#070B14',
    fontWeight: '700',
  },
});
