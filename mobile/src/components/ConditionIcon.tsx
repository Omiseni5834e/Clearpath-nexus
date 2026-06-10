import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { ConditionCategory, ConditionType } from '../maps/conditionSymbols';
import { CATEGORY_COLORS } from '../maps/conditionSymbols';
import { SPRITE_GRID } from '../maps/spriteConfig';

const PALETTE = require('../../assets/symbol-palette.png');

interface Props {
  type: ConditionType;
  size?: number;
  style?: ViewStyle;
}

function VectorIcon({ type, size }: { type: ConditionType; size: number }) {
  const cat = typeCategory(type);
  const stroke = CATEGORY_COLORS[cat].stroke;
  const s = size;

  switch (type) {
    case 'clear':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="6" fill="#FBBF24" stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case 'partly_cloudy':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="8" cy="10" r="4" fill="#FBBF24" />
          <Ellipse cx="14" cy="14" rx="7" ry="4" fill="#E2E8F0" stroke={stroke} strokeWidth="0.8" />
        </Svg>
      );
    case 'cloudy':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Ellipse cx="10" cy="13" rx="6" ry="3.5" fill="#CBD5E1" stroke={stroke} strokeWidth="0.8" />
          <Ellipse cx="15" cy="11" rx="5" ry="3" fill="#94A3B8" stroke={stroke} strokeWidth="0.8" />
        </Svg>
      );
    case 'fog':
    case 'mist':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Ellipse cx="12" cy="10" rx="7" ry="3.5" fill="#94A3B8" />
          <Line x1="4" y1="15" x2="20" y2="15" stroke="#64748B" strokeWidth="1.5" />
          <Line x1="5" y1="18" x2="19" y2="18" stroke="#64748B" strokeWidth="1.5" />
        </Svg>
      );
    case 'light_rain':
    case 'heavy_rain':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Ellipse cx="12" cy="9" rx="7" ry="3.5" fill="#64748B" />
          {[8, 12, 16].map((x) => (
            <Line key={x} x1={x} y1="14" x2={x - 1} y2="19" stroke="#38BDF8" strokeWidth="1.5" />
          ))}
        </Svg>
      );
    case 'thunderstorm':
    case 'storm_warning':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Ellipse cx="12" cy="9" rx="7" ry="3.5" fill="#475569" />
          <Polygon points="13,12 10,17 13,17 11,22" fill="#FBBF24" />
        </Svg>
      );
    case 'strong_wind':
    case 'high_winds':
    case 'dust':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M4 10h12a3 3 0 100-6H8" fill="none" stroke={stroke} strokeWidth="1.5" />
          <Path d="M4 14h10a2.5 2.5 0 100-5H7" fill="none" stroke={stroke} strokeWidth="1.5" />
          <Path d="M4 18h8a2 2 0 100-4H6" fill="none" stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
    case 'high_temp':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="10" y="4" width="4" height="14" rx="2" fill="#EF4444" />
          <Circle cx="12" cy="18" r="3" fill="#EF4444" />
        </Svg>
      );
    case 'low_temp':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="10" y="4" width="4" height="14" rx="2" fill="#38BDF8" />
          <Circle cx="12" cy="18" r="3" fill="#38BDF8" />
        </Svg>
      );
    case 'track_clear':
    case 'track_caution':
    case 'track_blocked':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Line x1="6" y1="8" x2="6" y2="18" stroke={type === 'track_clear' ? '#22C55E' : type === 'track_caution' ? '#EAB308' : '#EF4444'} strokeWidth="2" />
          <Line x1="18" y1="8" x2="18" y2="18" stroke={type === 'track_clear' ? '#22C55E' : type === 'track_caution' ? '#EAB308' : '#EF4444'} strokeWidth="2" />
          <Line x1="4" y1="12" x2="20" y2="12" stroke="#64748B" strokeWidth="1.5" />
          {type === 'track_blocked' ? <Line x1="5" y1="5" x2="19" y2="19" stroke="#EF4444" strokeWidth="2" /> : null}
        </Svg>
      );
    case 'all_clear':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" fill="#22C55E" />
          <Path d="M8 12l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" />
        </Svg>
      );
    case 'general_alert':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="12,3 22,21 2,21" fill="#F97316" />
          <Line x1="12" y1="9" x2="12" y2="14" stroke="#000" strokeWidth="2" />
          <Circle cx="12" cy="17" r="1" fill="#000" />
        </Svg>
      );
    case 'flood_risk':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="8" y="8" width="8" height="6" fill="#38BDF8" />
          <Path d="M4 18 Q8 14 12 18 T20 18" fill="none" stroke="#2563EB" strokeWidth="2" />
        </Svg>
      );
    case 'wildfire_risk':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M12 4c0 4-4 5-4 9a4 4 0 008 0c0-4-4-5-4-9z" fill="#F97316" />
        </Svg>
      );
    case 'station_active':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="6" y="10" width="12" height="10" fill="#38BDF8" />
          <Polygon points="12,4 18,10 6,10" fill="#2563EB" />
        </Svg>
      );
    case 'port_active':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M12 5v12M8 9l4-4 4 4" stroke="#38BDF8" strokeWidth="2" fill="none" />
          <Path d="M6 19h12" stroke="#64748B" strokeWidth="2" />
        </Svg>
      );
    default:
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="8" fill={CATEGORY_COLORS[cat].fill.replace('0.2', '0.6')} stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
  }
}

function typeCategory(type: ConditionType): ConditionCategory {
  if (type === 'general_alert' || type === 'storm_warning' || type === 'flood_risk' || type === 'landslide_risk' ||
      type === 'wildfire_risk' || type === 'seismic_activity' || type === 'hazmat_alert' || type === 'air_pollution' ||
      type === 'debris_on_track' || type === 'vegetation_risk') {
    return 'environmental';
  }
  if (type === 'all_clear' || type === 'good_signal' || type === 'weak_signal' || type === 'no_signal' ||
      type === 'track_clear' || type === 'track_caution' || type === 'track_blocked' || type === 'maintenance' ||
      type === 'station_active' || type === 'port_active') {
    return 'operational';
  }
  return 'weather';
}

function SpriteIcon({ type, size }: { type: ConditionType; size: number }) {
  const pos = SPRITE_GRID[type] ?? { row: 0, col: 0 };
  const scale = size / 100;
  const imgW = 1000 * scale;
  const imgH = 400 * scale;

  return (
    <View style={[styles.clip, { width: size, height: size }]}>
      <Image
        source={PALETTE}
        style={{
          width: imgW,
          height: imgH,
          position: 'absolute',
          left: -pos.col * 100 * scale,
          top: -pos.row * 100 * scale,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

export default function ConditionIcon({ type, size = 28, style }: Props) {
  const cat = typeCategory(type);
  const border = CATEGORY_COLORS[cat].stroke;

  return (
    <View style={[styles.wrap, { width: size + 8, height: size + 8, borderColor: border }, style]}>
      <VectorIcon type={type} size={size} />
    </View>
  );
}

export function ConditionIconVector({ type, size = 28, style }: Props) {
  const cat = typeCategory(type);
  const border = CATEGORY_COLORS[cat].stroke;
  return (
    <View style={[styles.wrap, { width: size + 8, height: size + 8, borderColor: border }, style]}>
      <VectorIcon type={type} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clip: { overflow: 'hidden' },
});
