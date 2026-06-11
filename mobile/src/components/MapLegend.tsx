import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Pressable } from 'react-native';
import { GlassCard } from './GlassCard';

interface MapLegendProps {
  routeLabel?: string;
  conditionCount?: number;
  liveWeatherUpdated?: Date | null;
  collapsed?: boolean;
  onToggle?: () => void;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  routeLabel,
  conditionCount = 0,
  liveWeatherUpdated,
  collapsed,
  onToggle,
}) => {
  const [localExpanded, setLocalExpanded] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;
  const expanded = collapsed == null ? localExpanded : !collapsed;

  const toggleLegend = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animationValue, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
    if (onToggle) onToggle();
    else setLocalExpanded(!expanded);
  };

  const height = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 160],
  });

  return (
    <Animated.View style={[styles.container, { height }]}>
      <GlassCard size="small" style={styles.card}>
        <Pressable onPress={toggleLegend} style={styles.header}>
          <Text style={styles.headerText}>Legend {expanded ? '▼' : '▲'}</Text>
        </Pressable>
        {expanded && (
          <View style={styles.content}>
            <View style={styles.row}>
              <View style={[styles.colorBox, { backgroundColor: '#00FF88' }]} />
              <Text style={styles.legendText}>Approved</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.colorBox, { backgroundColor: '#FF8C00' }]} />
              <Text style={styles.legendText}>Caution</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.colorBox, { backgroundColor: '#FF3B5C' }]} />
              <Text style={styles.legendText}>Hard Blocked</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.weatherScale}>Weather: 1.0 (Optimal) - 0.2 (Storm)</Text>
            {routeLabel ? <Text style={styles.weatherScale}>{routeLabel}</Text> : null}
            {liveWeatherUpdated ? <Text style={styles.weatherScale}>Updated {liveWeatherUpdated.toLocaleTimeString()}</Text> : null}
            {conditionCount > 0 ? <Text style={styles.weatherScale}>{conditionCount} live markers</Text> : null}
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    width: 180,
    zIndex: 10,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    padding: 0,
    borderRadius: 12,
  },
  header: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    color: '#F0F4FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    color: '#8892A4',
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  weatherScale: {
    color: '#8892A4',
    fontSize: 9,
    fontWeight: '500',
  },
});
