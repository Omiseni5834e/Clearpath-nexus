import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MAP_SYMBOL_GUIDE, type MapSymbolEntry } from '../maps/mapSymbolGuide';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<MapSymbolEntry['category'], string> = {
  markers: 'Map markers',
  routes: 'Route lines',
  weather: 'Weather conditions (blue)',
  environmental: 'Environmental alerts (orange)',
  operational: 'Operational status (green)',
  zones: 'Zone overlays',
};

export default function MapSymbolGuidePopup({ visible, onClose }: Props) {
  const categories = ['markers', 'routes', 'weather', 'environmental', 'operational', 'zones'] as const;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Rail route symbol palette</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Live markers update from Open-Meteo and NOAA K-index. Tap any marker for details.
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {categories.map((cat) => (
              <View key={cat} style={styles.section}>
                <Text style={styles.sectionTitle}>{CATEGORY_LABELS[cat]}</Text>
                {MAP_SYMBOL_GUIDE.filter((e) => e.category === cat).map((entry) => (
                  <View key={entry.title} style={styles.row}>
                    <Text style={styles.icon}>{entry.icon}</Text>
                    <View style={styles.copy}>
                      <Text style={styles.rowTitle}>{entry.title}</Text>
                      <Text style={styles.rowDesc}>{entry.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    maxHeight: '82%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { color: colors.white, fontSize: 18, fontWeight: '700' },
  close: { color: colors.muted, fontSize: 20, padding: 4 },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: 'monospace',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  icon: { fontSize: 22, width: 32, textAlign: 'center' },
  copy: { flex: 1, gap: 2 },
  rowTitle: { color: colors.white, fontSize: 13, fontWeight: '600' },
  rowDesc: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
