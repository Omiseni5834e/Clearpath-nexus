import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Station } from '../types/route';
import { colors } from '../theme/colors';

interface Props {
  label: string;
  value: string;
  codes: string[];
  stations: Station[];
  onChange: (code: string) => void;
  excludeCode?: string;
  hint?: string;
}

export default function StationPicker({
  label,
  value,
  codes,
  stations,
  onChange,
  excludeCode,
  hint,
}: Props) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const list = codes.filter((c) => c !== excludeCode);
    return list.map((code) => {
      const station = stations.find((s) => s.code === code);
      return { code, name: station?.name ?? code };
    });
  }, [codes, stations, excludeCode]);

  const selected = stations.find((s) => s.code === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.trigger, !value && styles.triggerEmpty]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}`}
      >
        <Text style={styles.triggerText}>
          {value ? `${value} — ${selected?.name ?? value}` : 'Tap to choose station'}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.list}>
              {options.map((opt) => (
                <Pressable
                  key={opt.code}
                  style={[styles.option, opt.code === value && styles.optionActive]}
                  onPress={() => {
                    onChange(opt.code);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionCode, opt.code === value && styles.optionCodeActive]}>
                    {opt.code}
                  </Text>
                  <Text style={styles.optionName}>{opt.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { color: colors.muted, fontSize: 11, fontFamily: 'monospace' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.panel,
  },
  triggerEmpty: { borderColor: colors.accent },
  triggerText: { color: colors.white, fontFamily: 'monospace', fontSize: 12, flex: 1 },
  chevron: { color: colors.muted, fontSize: 10, marginLeft: 8 },
  hint: { color: colors.muted, fontSize: 10, fontFamily: 'monospace' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.panel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { color: colors.white, fontWeight: '700', fontSize: 16 },
  close: { color: colors.accent, fontFamily: 'monospace', fontSize: 12 },
  list: { paddingHorizontal: 8, paddingBottom: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    marginVertical: 2,
  },
  optionActive: { backgroundColor: 'rgba(49,130,206,0.2)' },
  optionCode: { color: colors.white, fontFamily: 'monospace', fontWeight: '700', width: 48 },
  optionCodeActive: { color: colors.accent },
  optionName: { color: colors.textLight, fontSize: 13, flex: 1 },
});
