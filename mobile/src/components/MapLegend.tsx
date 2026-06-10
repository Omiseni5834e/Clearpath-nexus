import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CONDITION_SYMBOLS, CATEGORY_COLORS, type ConditionCategory, type ConditionType } from '../maps/conditionSymbols';
import { colors } from '../theme/colors';
import { ConditionIconVector } from './ConditionIcon';

interface Props {
  routeLabel?: string;
  conditionCount?: number;
  liveWeatherUpdated?: Date | null;
  collapsed?: boolean;
  onToggle?: () => void;
}

const CATEGORY_ORDER: ConditionCategory[] = ['weather', 'environmental', 'operational'];

const CATEGORY_LABELS: Record<ConditionCategory, string> = {
  weather: 'Weather conditions',
  environmental: 'Environmental alerts',
  operational: 'Operational status',
};

export default function MapLegend({
  routeLabel,
  conditionCount = 0,
  liveWeatherUpdated,
  collapsed = false,
  onToggle,
}: Props) {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: Object.entries(CONDITION_SYMBOLS).filter(([, s]) => s.category === cat),
  }));

  if (collapsed) {
    return (
      <View style={styles.collapsed}>
        <Pressable style={styles.expandBtn} onPress={onToggle} accessibilityLabel="Expand symbol legend">
          <Text style={styles.expandIcon}>?</Text>
        </Pressable>
        <Text style={styles.collapsedLabel}>LEGEND</Text>
      </View>
    );
  }

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE OVERLAY</Text>
          </View>
          <Pressable onPress={onToggle} hitSlop={8}>
            <Text style={styles.hideBtn}>Hide</Text>
          </Pressable>
        </View>
        <Text style={styles.liveSub}>
          {liveWeatherUpdated
            ? `Updated ${liveWeatherUpdated.toLocaleTimeString()}`
            : 'Fetching conditions…'}
        </Text>
        {routeLabel ? (
          <View style={styles.routeBox}>
            <Text style={styles.routeLabel}>CORRIDOR</Text>
            <Text style={styles.routeValue} numberOfLines={2}>{routeLabel}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.legendTitle}>SYMBOL PALETTE</Text>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
        <View style={styles.routeSection}>
          <Text style={styles.sectionTitle}>Route lines</Text>
          <LegendLine color={colors.approved} label="Approved segment" />
          <LegendLine color={colors.blocked} label="Blocked segment" />
          <LegendLine color="#63B3ED" label="Current segment" />
        </View>

        {grouped.map(({ cat, items }) => (
          <View key={cat} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat].dot }]} />
              <Text style={[styles.sectionTitle, { color: CATEGORY_COLORS[cat].stroke }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </View>
            {items.map(([type, sym]) => (
              <View key={type} style={styles.symbolRow}>
                <ConditionIconVector type={type as ConditionType} size={22} />
                <View style={styles.symbolCopy}>
                  <Text style={styles.symbolTitle}>{sym.label}</Text>
                  <Text style={styles.symbolDesc} numberOfLines={2}>{sym.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {conditionCount > 0 ? (
        <Text style={styles.footer}>
          {conditionCount} live marker{conditionCount === 1 ? '' : 's'} on map
        </Text>
      ) : null}
    </View>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.lineRow}>
      <View style={[styles.lineSwatch, { backgroundColor: color }]} />
      <Text style={styles.lineLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    width: 36,
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(100, 116, 139, 0.35)',
    alignItems: 'center',
    paddingTop: 10,
    gap: 12,
  },
  expandBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIcon: { color: colors.textLight, fontWeight: '700', fontSize: 12 },
  collapsedLabel: {
    color: colors.muted,
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
    transform: [{ rotate: '90deg' }],
    width: 48,
    textAlign: 'center',
  },
  sidebar: {
    width: 200,
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(100, 116, 139, 0.35)',
    paddingTop: 8,
    paddingBottom: 4,
  },
  header: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100,116,139,0.25)',
    gap: 4,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.approved },
  liveText: { color: '#6EE7B7', fontSize: 8, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 0.5 },
  hideBtn: { color: colors.muted, fontSize: 9, fontFamily: 'monospace' },
  liveSub: { color: colors.muted, fontSize: 8, fontFamily: 'monospace' },
  routeBox: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(100,116,139,0.2)' },
  routeLabel: { color: colors.textLight, fontSize: 8, fontFamily: 'monospace' },
  routeValue: { color: colors.white, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  legendTitle: {
    color: colors.muted,
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scroll: { flex: 1 },
  routeSection: { paddingHorizontal: 10, marginBottom: 12, gap: 4 },
  section: { paddingHorizontal: 10, marginBottom: 12, gap: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 9, fontFamily: 'monospace', fontWeight: '700', textTransform: 'uppercase' },
  symbolRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  symbolCopy: { flex: 1, gap: 1 },
  symbolTitle: { color: colors.white, fontSize: 10, fontWeight: '600' },
  symbolDesc: { color: colors.muted, fontSize: 8, lineHeight: 11 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  lineSwatch: { width: 18, height: 3, borderRadius: 2 },
  lineLabel: { color: colors.textLight, fontSize: 9, fontFamily: 'monospace' },
  footer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100,116,139,0.25)',
    color: colors.muted,
    fontSize: 8,
    fontFamily: 'monospace',
  },
});
