import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { palette } from '../theme';
import { colors } from '../theme/colors';
import type { LoadProfile } from '../types/loadProfile';
import { createLoadProfile, readLoadProfiles, writeLoadProfiles } from '../types/loadProfile';
import { LoadProfileSkeletons } from './Skeleton';
import { useToast } from './ToastProvider';

interface Props {
  selectedId: string | null;
  onSelect: (profile: LoadProfile | null) => void;
  onContinue?: () => void;
}

const EMPTY_FORM = {
  name: '',
  height: '4.5',
  width: '3.0',
  weight: '120',
  compartments: '1',
  compartmentPurpose: '',
  notes: '',
};

export default function LoadProfilePanel({ selectedId, onSelect, onContinue }: Props) {
  const [profiles, setProfiles] = useState<LoadProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'list' | 'create'>('create');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    try {
      const stored = await readLoadProfiles();
      setProfiles(stored);
      if (stored.length > 0) {
        if (view !== 'create') setView('list');
        if (!selectedId || !stored.some((p) => p.id === selectedId)) onSelect(stored[0]);
      } else {
        setView('create');
        onSelect(null);
      }
      setLastUpdated(new Date());
    } catch {
      setFormError('Unable to refresh profiles.');
      showToast('Unable to refresh profiles', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onSelect, selectedId, showToast, view]);

  useEffect(() => {
    let active = true;
    void refresh().finally(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void refresh();
  }, [refresh]);

  const handleSave = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const height = parseFloat(form.height);
    const width = parseFloat(form.width);
    const weight = parseFloat(form.weight);
    const compartments = parseInt(form.compartments, 10);

    if (!form.name.trim()) {
      setFormError('Profile name is required.');
      return;
    }
    if ([height, width, weight].some((n) => Number.isNaN(n) || n <= 0)) {
      setFormError('Height, width, and weight must be positive numbers.');
      return;
    }
    if (Number.isNaN(compartments) || compartments < 1) {
      setFormError('Compartment count must be at least 1.');
      return;
    }

    try {
      const profile = createLoadProfile({
        name: form.name.trim(),
        height,
        width,
        weight,
        compartments,
        compartmentPurpose: form.compartmentPurpose.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      const next = [...profiles, profile];
      await writeLoadProfiles(next);
      setProfiles(next);
      onSelect(profile);
      setForm(EMPTY_FORM);
      setFormError(null);
      setView('list');
      setLastUpdated(new Date());
      showToast('Profile saved', 'success');
    } catch {
      setFormError('Unable to save profile.');
      showToast('Unable to save profile', 'error');
    }
  }, [form, onSelect, profiles, showToast]);

  const handleDelete = useCallback((profile: LoadProfile) => {
    Alert.alert(
      'Delete Load Profile?',
      `Are you sure you want to delete "${profile.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              const next = profiles.filter((p) => p.id !== profile.id);
              await writeLoadProfiles(next);
              setProfiles(next);
              setLastUpdated(new Date());
              if (selectedId === profile.id) {
                onSelect(next[0] ?? null);
                if (next.length === 0) setView('create');
              }
              showToast('Profile deleted', 'info');
            } catch {
              showToast('Unable to delete profile', 'error');
            }
          },
        },
      ],
    );
  }, [onSelect, profiles, selectedId, showToast]);

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadProfileSkeletons />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.approved} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.heading}>LOAD PROFILES</Text>
          {view === 'list' ? (
            <Pressable
              testID="create-profile-button"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setView('create');
                setForm(EMPTY_FORM);
                setFormError(null);
              }}
            >
              <Text style={styles.addLink}>+ Add new load profile</Text>
            </Pressable>
          ) : null}
        </View>
        {lastUpdated ? <Text style={styles.updated}>Updated {lastUpdated.toLocaleTimeString()}</Text> : null}

        {view === 'create' ? (
          <View style={styles.formBox}>
            <Text style={styles.hint}>Define cargo dimensions before routing.</Text>

            <Field label="Profile name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />

            <View style={styles.row}>
              <Field label="Height (m)" value={form.height} onChange={(v) => setForm((f) => ({ ...f, height: v }))} numeric />
              <Field label="Width (m)" value={form.width} onChange={(v) => setForm((f) => ({ ...f, width: v }))} numeric />
              <Field label="Weight (T)" value={form.weight} onChange={(v) => setForm((f) => ({ ...f, weight: v }))} numeric />
            </View>

            <Field
              label="Number of compartments"
              value={form.compartments}
              onChange={(v) => setForm((f) => ({ ...f, compartments: v }))}
              numeric
            />

            <Text style={styles.label}>Why does compartment count matter for this load?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.compartmentPurpose}
              onChangeText={(v) => setForm((f) => ({ ...f, compartmentPurpose: v }))}
              placeholder="Hazmat isolation, weight distribution, multi-commodity manifest"
              placeholderTextColor={colors.disabled}
              multiline
              returnKeyType="next"
            />
            <Text style={styles.helper}>
              Compartments affect cargo distribution across wagons for clearance and loading plans.
            </Text>

            <Field label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <View style={styles.actions}>
              {profiles.length > 0 ? (
                <Pressable testID="cancel-load-profile-button" style={styles.secondaryBtn} onPress={() => setView('list')}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
              ) : null}
              <Pressable testID="save-load-profile-button" style={styles.primaryBtn} onPress={handleSave}>
                <Text style={styles.primaryText}>Save load profile</Text>
              </Pressable>
            </View>
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>BOX</Text>
            <Text style={styles.emptyTitle}>No load profiles yet</Text>
            <Text style={styles.emptySubtitle}>Create your first cargo profile to get started</Text>
            <Pressable testID="empty-create-profile-button" style={styles.secondaryBtn} onPress={() => setView('create')}>
              <Text style={styles.secondaryText}>Create Profile</Text>
            </Pressable>
          </View>
        ) : (
          profiles.map((p) => {
            const active = p.id === selectedId;
            return (
              <View key={p.id} style={[styles.card, active && styles.cardActive]}>
                <Pressable testID={`select-profile-${p.id}`} onPress={() => onSelect(p)}>
                  <Text style={styles.cardTitle}>{p.name}</Text>
                  <Text style={styles.cardMeta}>
                    {p.height}m x {p.width}m / {p.weight}T / {p.compartments} compartment
                    {p.compartments === 1 ? '' : 's'}
                  </Text>
                  {p.compartmentPurpose ? (
                    <Text style={styles.cardPurpose} numberOfLines={2}>
                      {p.compartmentPurpose}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable testID={`delete-profile-${p.id}`} onPress={() => handleDelete(p)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            );
          })
        )}

        {selectedId && view === 'list' && onContinue ? (
          <Pressable testID="continue-to-routing-button" style={styles.continueBtn} onPress={onContinue}>
            <Text style={styles.continueText}>Continue to routing</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        placeholderTextColor={colors.disabled}
        returnKeyType={numeric ? 'next' : 'done'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'stretch', justifyContent: 'center', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  addLink: { color: colors.approved, fontSize: 10, fontWeight: '700' },
  updated: { color: colors.muted, fontSize: 11 },
  formBox: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    padding: 14,
    gap: 10,
  },
  hint: { color: colors.muted, fontSize: 11 },
  row: { flexDirection: 'row', gap: 8 },
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
  textArea: { minHeight: 56, textAlignVertical: 'top' },
  helper: { color: colors.muted, fontSize: 10, marginTop: -4 },
  actions: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.approved,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { color: palette.base, fontWeight: '800' },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    backgroundColor: palette.buttonSecondary,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryText: { color: colors.textLight, fontSize: 12, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: 20,
    padding: 14,
    backgroundColor: colors.panel,
    gap: 8,
  },
  cardActive: { borderColor: colors.approved, backgroundColor: palette.glowGreen },
  cardTitle: { color: colors.textLight, fontWeight: '800', fontSize: 15 },
  cardMeta: { color: colors.muted, fontSize: 11 },
  cardPurpose: { color: colors.muted, fontSize: 11, marginTop: 4 },
  deleteBtn: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: palette.destructiveBorder,
    backgroundColor: palette.destructiveBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: { color: colors.blocked, fontSize: 11, fontWeight: '800' },
  continueBtn: {
    borderWidth: 1,
    borderColor: colors.approved,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    backgroundColor: palette.glowGreen,
  },
  continueText: { color: colors.approved, fontSize: 12, fontWeight: '800' },
  error: { color: colors.blocked, fontSize: 12 },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    backgroundColor: colors.panel,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { color: colors.approved, fontSize: 24, fontWeight: '900' },
  emptyTitle: { color: colors.textLight, fontSize: 16, fontWeight: '800' },
  emptySubtitle: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
