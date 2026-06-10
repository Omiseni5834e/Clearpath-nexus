import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LoadProfile } from '../types/loadProfile';
import { createLoadProfile, readLoadProfiles, writeLoadProfiles } from '../types/loadProfile';
import { colors } from '../theme/colors';

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
  const [view, setView] = useState<'list' | 'create'>('create');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const stored = await readLoadProfiles();
    setProfiles(stored);
    if (stored.length > 0) {
      setView('list');
      if (!selectedId || !stored.some((p) => p.id === selectedId)) {
        onSelect(stored[0]);
      }
    } else {
      setView('create');
      onSelect(null);
    }
    setLoading(false);
  }, [onSelect, selectedId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async () => {
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
  };

  const handleDelete = (profile: LoadProfile) => {
    Alert.alert(
      'Delete load profile?',
      `Are you sure you want to delete "${profile.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, delete',
          style: 'destructive',
          onPress: async () => {
            const next = profiles.filter((p) => p.id !== profile.id);
            await writeLoadProfiles(next);
            setProfiles(next);
            if (selectedId === profile.id) {
              onSelect(next[0] ?? null);
              if (next.length === 0) setView('create');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>LOAD PROFILES</Text>
        {view === 'list' ? (
          <Pressable
            onPress={() => {
              setView('create');
              setForm(EMPTY_FORM);
              setFormError(null);
            }}
          >
            <Text style={styles.addLink}>+ Add new load profile</Text>
          </Pressable>
        ) : null}
      </View>

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
            placeholder="Hazmat isolation, weight distribution, multi-commodity manifest…"
            placeholderTextColor={colors.muted}
            multiline
          />
          <Text style={styles.helper}>
            Compartments affect how cargo is distributed across wagons for clearance and loading plans.
          </Text>

          <Field label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          <View style={styles.actions}>
            {profiles.length > 0 ? (
              <Pressable style={styles.secondaryBtn} onPress={() => setView('list')}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryText}>Save load profile</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        profiles.map((p) => {
          const active = p.id === selectedId;
          return (
            <View key={p.id} style={[styles.card, active && styles.cardActive]}>
              <Pressable onPress={() => onSelect(p)}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.cardMeta}>
                  {p.height}m × {p.width}m · {p.weight}T · {p.compartments} compartment
                  {p.compartments === 1 ? '' : 's'}
                </Text>
                {p.compartmentPurpose ? (
                  <Text style={styles.cardPurpose} numberOfLines={2}>
                    {p.compartmentPurpose}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable onPress={() => handleDelete(p)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          );
        })
      )}

      {selectedId && view === 'list' && onContinue ? (
        <Pressable style={styles.continueBtn} onPress={onContinue}>
          <Text style={styles.continueText}>Continue to routing</Text>
        </Pressable>
      ) : null}
    </ScrollView>
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
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { color: colors.textLight, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  addLink: { color: colors.approved, fontSize: 10, fontFamily: 'monospace', fontWeight: '600' },
  formBox: {
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 12,
    gap: 10,
  },
  hint: { color: colors.muted, fontSize: 11, fontFamily: 'monospace' },
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
  textArea: { minHeight: 56, textAlignVertical: 'top' },
  helper: { color: colors.muted, fontSize: 10, fontFamily: 'monospace', marginTop: -4 },
  actions: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: { color: colors.white, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryText: { color: colors.textLight, fontFamily: 'monospace', fontSize: 12 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.panel,
    gap: 6,
  },
  cardActive: { borderColor: colors.accent, backgroundColor: 'rgba(49,130,206,0.12)' },
  cardTitle: { color: colors.white, fontWeight: '700', fontSize: 14 },
  cardMeta: { color: colors.muted, fontSize: 11, fontFamily: 'monospace' },
  cardPurpose: { color: colors.muted, fontSize: 10, fontFamily: 'monospace', marginTop: 4 },
  deleteBtn: { alignSelf: 'flex-end' },
  deleteText: { color: colors.blocked, fontSize: 10, fontFamily: 'monospace' },
  continueBtn: {
    borderWidth: 1,
    borderColor: colors.approved,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(56,161,105,0.12)',
  },
  continueText: { color: colors.approved, fontFamily: 'monospace', fontSize: 12, fontWeight: '600' },
  error: { color: colors.blocked, fontSize: 12, fontFamily: 'monospace' },
});
