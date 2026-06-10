/** Dark command-center styling — applied client-side in the browser. */
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14532d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
]

export const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#38A169',
  HARD_BLOCKED: '#E53E3E',
}

export const ZONE_COLORS: Record<string, { stroke: string; fill: string }> = {
  storm: { stroke: '#E53E3E', fill: 'rgba(229, 62, 62, 0.25)' },
  dust: { stroke: '#DD6B20', fill: 'rgba(221, 107, 32, 0.25)' },
  solar: { stroke: '#DD6B20', fill: 'rgba(221, 107, 32, 0.35)' },
  fog: { stroke: '#94A3B8', fill: 'rgba(148, 163, 184, 0.3)' },
  cloud: { stroke: '#64748B', fill: 'rgba(100, 116, 139, 0.28)' },
  cloudy: { stroke: '#64748B', fill: 'rgba(100, 116, 139, 0.28)' },
  thunderstorm: { stroke: '#E53E3E', fill: 'rgba(229, 62, 62, 0.25)' },
  heavy_rain: { stroke: '#3182CE', fill: 'rgba(49, 130, 206, 0.25)' },
  flood_risk: { stroke: '#3182CE', fill: 'rgba(49, 130, 206, 0.3)' },
  storm_warning: { stroke: '#F97316', fill: 'rgba(249, 115, 22, 0.3)' },
  air_pollution: { stroke: '#78716C', fill: 'rgba(120, 113, 108, 0.3)' },
  clear: { stroke: '#38BDF8', fill: 'rgba(56, 189, 248, 0.15)' },
  mist: { stroke: '#94A3B8', fill: 'rgba(148, 163, 184, 0.25)' },
  hail: { stroke: '#A78BFA', fill: 'rgba(167, 139, 250, 0.25)' },
}
