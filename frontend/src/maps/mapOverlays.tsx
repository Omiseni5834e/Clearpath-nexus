import { useEffect, useRef, useState } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { EnvironmentalZone, MapCondition, SegmentPath, Station, TrainPosition } from '../types/route'
import { CONDITION_SYMBOLS } from './conditionSymbols'
import { conditionIconSvgDataUrl } from '../components/ConditionIcon'
import { STATUS_COLORS, ZONE_COLORS } from './darkMapStyle'
import { fetchRailwayTrack } from '../services/railwayGeometry'

const PHASE_COLORS: Record<string, string> = {
  CURRENT: '#63B3ED',
  UPCOMING: STATUS_COLORS.APPROVED,
  TRAVERSED: '#64748b',
}

// ── Fit all route points in view ──────────────────────────────────────────────
function FitBounds({
  segments,
  stations,
  trainPosition,
}: {
  segments: SegmentPath[]
  stations: Station[]
  trainPosition?: TrainPosition
}) {
  const map = useMap()
  const core = useMapsLibrary('core')

  useEffect(() => {
    if (!map || !core) return

    const points: google.maps.LatLngLiteral[] = [
      ...segments.flatMap((s) => s.coordinates.map(([lat, lon]) => ({ lat, lng: lon }))),
      ...stations.map((s) => ({ lat: s.lat, lng: s.lon })),
      ...(trainPosition ? [{ lat: trainPosition.lat, lng: trainPosition.lon }] : []),
    ]

    if (points.length === 0) return

    const bounds = new core.LatLngBounds()
    points.forEach((p) => bounds.extend(p))
    map.fitBounds(bounds, { top: 56, right: 56, bottom: 56, left: 56 })
  }, [map, core, segments, stations, trainPosition])

  return null
}

// ── Real OSM track polylines coloured by phase/status ─────────────────────────
function SegmentPolylines({ segments }: { segments: SegmentPath[] }) {
  const map = useMap()
  const [osmTracks, setOsmTracks] = useState<Map<string, [number, number][]>>(new Map())
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (segments.length === 0) return
    fetchedRef.current = false

    const fetchAll = async () => {
      const updates = new Map<string, [number, number][]>()
      await Promise.allSettled(
        segments.map(async (seg) => {
          const coords = seg.coordinates
          if (coords.length < 2) return
          const [fromLat, fromLon] = coords[0]
          const [toLat, toLon] = coords[coords.length - 1]
          try {
            const track = await fetchRailwayTrack(fromLat, fromLon, toLat, toLon)
            if (track && track.length >= 2) {
              updates.set(seg.id, track)
            }
          } catch {
            // fall back to straight-line
          }
        }),
      )
      setOsmTracks(updates)
      fetchedRef.current = true
    }

    fetchAll()
  }, [segments])

  useEffect(() => {
    if (!map) return

    const lines: google.maps.Polyline[] = []

    segments.forEach((seg) => {
      const phase = seg.phase ?? 'UPCOMING'
      const osmCoords = osmTracks.get(seg.id)
      const path =
        osmCoords && osmCoords.length >= 2
          ? osmCoords.map(([lat, lon]) => ({ lat, lng: lon }))
          : seg.coordinates.map(([lat, lon]) => ({ lat, lng: lon }))

      const color =
        seg.status === 'HARD_BLOCKED'
          ? STATUS_COLORS.HARD_BLOCKED
          : PHASE_COLORS[phase] ?? STATUS_COLORS.APPROVED

      // Shadow / glow underline
      const shadow = new google.maps.Polyline({
        path,
        strokeColor: color,
        strokeWeight: phase === 'CURRENT' ? 14 : 10,
        strokeOpacity: 0.18,
        geodesic: true,
        zIndex: phase === 'CURRENT' ? 8 : 4,
      })
      shadow.setMap(map)
      lines.push(shadow)

      // Main line
      const line = new google.maps.Polyline({
        path,
        strokeColor: color,
        strokeWeight: phase === 'CURRENT' ? 6 : 4,
        strokeOpacity: phase === 'TRAVERSED' ? 0.4 : 0.9,
        geodesic: true,
        zIndex: phase === 'CURRENT' ? 10 : 6,
        icons:
          phase === 'TRAVERSED'
            ? [
                {
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                  offset: '0',
                  repeat: '14px',
                },
              ]
            : undefined,
      })
      line.setMap(map)
      lines.push(line)

      // Animated direction arrows on CURRENT segment
      if (phase === 'CURRENT' || phase === 'UPCOMING') {
        const arrow = new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeWeight: 0,
          geodesic: true,
          zIndex: 12,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                strokeColor: color,
                fillColor: color,
                fillOpacity: 0.9,
                strokeOpacity: 1,
                scale: phase === 'CURRENT' ? 3 : 2.5,
              },
              offset: '50%',
              repeat: '80px',
            },
          ],
        })
        arrow.setMap(map)
        lines.push(arrow)
      }
    })

    return () => lines.forEach((l) => l.setMap(null))
  }, [map, segments, osmTracks])

  return null
}

// ── Environmental zone polygons ───────────────────────────────────────────────
function ZonePolygons({ zones }: { zones: EnvironmentalZone[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const shapes = zones.map((zone) => {
      const colors = ZONE_COLORS[zone.type] ?? ZONE_COLORS.dust
      const polygon = new google.maps.Polygon({
        paths: zone.coordinates.map(([lat, lon]) => ({ lat, lng: lon })),
        strokeColor: colors.stroke,
        strokeWeight: 2,
        strokeOpacity: 0.7,
        fillColor: colors.fill,
        fillOpacity: 0.38,
        zIndex: 5,
      })
      polygon.setMap(map)
      return polygon
    })

    return () => shapes.forEach((s) => s.setMap(null))
  }, [map, zones])

  return null
}

// ── Styled InfoWindow HTML ────────────────────────────────────────────────────
function styledInfoHtml(
  title: string,
  subtitle: string,
  body?: string,
  badgeColor?: string,
  extra?: string,
) {
  return `
  <div style="
    font-family: 'JetBrains Mono', monospace;
    max-width: 230px;
    background: #0d1a2e;
    border: 1px solid rgba(100,116,139,0.4);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 8px 24px -4px rgba(0,0,0,0.8);
  ">
    <div style="background: ${badgeColor ?? '#1e40af'}; padding: 6px 10px;">
      <div style="font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 0.04em;">${title}</div>
      <div style="font-size: 9px; color: rgba(255,255,255,0.7); margin-top: 1px;">${subtitle}</div>
    </div>
    <div style="padding: 8px 10px;">
      ${body ? `<p style="font-size: 10px; color: #94a3b8; margin: 0 0 4px; line-height: 1.5;">${body}</p>` : ''}
      ${extra ? `<p style="font-size: 9px; color: #64748b; font-style: italic; margin: 0;">${extra}</p>` : ''}
    </div>
  </div>`
}

function attachInfoWindow(map: google.maps.Map, marker: google.maps.Marker, html: string) {
  const iw = new google.maps.InfoWindow({ content: html, disableAutoPan: false })
  marker.addListener('click', () => iw.open({ map, anchor: marker }))
  return iw
}

// ── Station markers with styled HTML labels ───────────────────────────────────
function StationMarkers({
  stations,
  segments,
}: {
  stations: Station[]
  segments: SegmentPath[]
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    // Determine which stations are on the active route
    const routeCodes = new Set<string>()
    segments.forEach((seg) => {
      seg.label?.split(' → ').forEach((c) => routeCodes.add(c.trim()))
    })

    const markers: google.maps.Marker[] = []
    const windows: google.maps.InfoWindow[] = []

    stations.forEach((s) => {
      const onRoute = routeCodes.has(s.code)

      // Custom SVG station pin
      const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
          <defs>
            <filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.6"/>
            </filter>
          </defs>
          <ellipse cx="20" cy="47" rx="6" ry="2.5" fill="rgba(0,0,0,0.4)"/>
          <path d="M20 2 C10 2 4 10 4 18 C4 30 20 44 20 44 C20 44 36 30 36 18 C36 10 30 2 20 2Z"
            fill="${onRoute ? '#1d4ed8' : '#374151'}"
            stroke="${onRoute ? '#60a5fa' : '#6b7280'}"
            stroke-width="2"
            filter="url(#sh)"
          />
          <circle cx="20" cy="18" r="7" fill="${onRoute ? '#60a5fa' : '#9ca3af'}"/>
          <text x="20" y="22" text-anchor="middle" font-size="8" font-weight="bold"
            font-family="monospace" fill="${onRoute ? '#1e3a8a' : '#1f2937'}">${s.code.slice(0, 3)}</text>
        </svg>`

      const marker = new google.maps.Marker({
        map,
        position: { lat: s.lat, lng: s.lon },
        title: s.code,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgPin),
          scaledSize: new google.maps.Size(40, 50),
          anchor: new google.maps.Point(20, 48),
        },
        label: {
          text: s.name.split(' ')[0],
          color: onRoute ? '#bfdbfe' : '#9ca3af',
          fontSize: '9px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
        },
        zIndex: onRoute ? 20 : 10,
      })

      const iw = attachInfoWindow(
        map,
        marker,
        styledInfoHtml(
          s.code,
          s.name,
          onRoute ? 'Active route corridor junction' : 'Reference station — not on current route',
          onRoute ? '#1d4ed8' : '#374151',
          `${s.lat.toFixed(4)}°N · ${s.lon.toFixed(4)}°E`,
        ),
      )
      markers.push(marker)
      windows.push(iw)
    })

    return () => {
      markers.forEach((m) => m.setMap(null))
      windows.forEach((w) => w.close())
    }
  }, [map, stations, segments])

  return null
}

// ── Train position marker — animated ──────────────────────────────────────────
function TrainMarker({ trainPosition }: { trainPosition: TrainPosition }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    // Pulsing outer ring SVG
    const svgTrain = `
      <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <!-- Outer glow ring -->
        <circle cx="26" cy="26" r="22" fill="none" stroke="#63B3ED" stroke-width="1.5" stroke-opacity="0.4"/>
        <!-- Pulse ring -->
        <circle cx="26" cy="26" r="17" fill="none" stroke="#63B3ED" stroke-width="1" stroke-opacity="0.6"/>
        <!-- Main dot -->
        <circle cx="26" cy="26" r="11" fill="#0f172a" stroke="#63B3ED" stroke-width="2.5" filter="url(#glow)"/>
        <!-- Train icon -->
        <rect x="19" y="20" width="14" height="11" rx="2.5" fill="#63B3ED"/>
        <rect x="21" y="22" width="4" height="3" rx="1" fill="#0f172a"/>
        <rect x="27" y="22" width="4" height="3" rx="1" fill="#0f172a"/>
        <rect x="21" y="31" width="2.5" height="2" rx="1" fill="#94a3b8"/>
        <rect x="28.5" y="31" width="2.5" height="2" rx="1" fill="#94a3b8"/>
      </svg>`

    const marker = new google.maps.Marker({
      map,
      position: { lat: trainPosition.lat, lng: trainPosition.lon },
      title: 'Train position',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgTrain),
        scaledSize: new google.maps.Size(52, 52),
        anchor: new google.maps.Point(26, 26),
      },
      zIndex: 50,
    })

    const track = trainPosition.snapped_track ?? trainPosition.station_code ?? 'Live coordinates'
    const mode = trainPosition.mode === 'live' ? '🛰 GPS live fix' :
                 trainPosition.mode === 'station' ? '🏢 Station origin' : '📍 Coordinates input'
    const offset = trainPosition.offset_km != null ? `${trainPosition.offset_km} km from nearest track` : undefined

    const iw = attachInfoWindow(
      map,
      marker,
      styledInfoHtml('🚂 Train', track, mode, '#0c4a6e', offset),
    )

    return () => {
      marker.setMap(null)
      iw.close()
    }
  }, [map, trainPosition])

  return null
}

// ── Segment midpoint labels (condition/advisory badges on route) ───────────────
function SegmentLabels({
  segments,
  trackDetails,
}: {
  segments: SegmentPath[]
  trackDetails?: Array<{ id: string; label: string; distance_km: number; clearance_status: string; advisory?: string; congestion: number; phase: string }>
}) {
  const map = useMap()

  useEffect(() => {
    if (!map || segments.length === 0) return

    const markers: google.maps.Marker[] = []
    const windows: google.maps.InfoWindow[] = []

    segments.forEach((seg) => {
      // Find midpoint of segment
      const coords = seg.coordinates
      if (coords.length < 2) return

      const midIdx = Math.floor(coords.length / 2)
      const [midLat, midLon] = coords[midIdx]

      const phase = seg.phase ?? 'UPCOMING'
      const blocked = seg.status === 'HARD_BLOCKED'
      const detail = trackDetails?.find((t) => t.id === seg.id)

      const bgColor = blocked ? '#7f1d1d' : phase === 'CURRENT' ? '#1e3a5f' : '#1e293b'
      const borderColor = blocked ? '#ef4444' : phase === 'CURRENT' ? '#63b3ed' : '#475569'
      const textColor = blocked ? '#fca5a5' : phase === 'CURRENT' ? '#bfdbfe' : '#e2e8f0'

      const labelText = seg.label ?? seg.id
      const congBadge = detail && detail.congestion > 1.4
        ? `<span style="background:#78350f;color:#fcd34d;padding:1px 4px;border-radius:3px;font-size:8px;">⚡ HIGH CONG</span>`
        : ''
      const blockedBadge = blocked
        ? `<span style="background:#7f1d1d;color:#fca5a5;padding:1px 4px;border-radius:3px;font-size:8px;">🚫 BLOCKED</span>`
        : ''

      const svgLabel = `
        <svg xmlns="http://www.w3.org/2000/svg" width="90" height="24" viewBox="0 0 90 24">
          <rect x="1" y="1" width="88" height="22" rx="5" fill="${bgColor}" stroke="${borderColor}" stroke-width="1.5"/>
          <text x="45" y="15" text-anchor="middle" font-size="8.5" font-weight="600"
            font-family="monospace" fill="${textColor}">${labelText.replace(/[<>]/g, '')}</text>
        </svg>`

      const marker = new google.maps.Marker({
        map,
        position: { lat: midLat, lng: midLon },
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgLabel),
          scaledSize: new google.maps.Size(90, 24),
          anchor: new google.maps.Point(45, 12),
        },
        title: labelText,
        zIndex: 15,
      })

      const distStr = detail ? `${detail.distance_km} km` : ''
      const advisoryStr = detail?.advisory ?? ''
      const body = [distStr, advisoryStr].filter(Boolean).join(' · ')

      const iw = attachInfoWindow(
        map,
        marker,
        styledInfoHtml(
          labelText,
          `${phase} · ${seg.status.replace('_', ' ')}`,
          body || 'Segment on active route corridor',
          bgColor,
          `${congBadge}${blockedBadge}`,
        ),
      )
      markers.push(marker)
      windows.push(iw)
    })

    return () => {
      markers.forEach((m) => m.setMap(null))
      windows.forEach((w) => w.close())
    }
  }, [map, segments, trackDetails])

  return null
}

// ── Condition dot markers (weather/env icons along route) ─────────────────────
function ConditionMarkers({ conditions }: { conditions: MapCondition[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map || conditions.length === 0) return

    const markers: google.maps.Marker[] = []
    const windows: google.maps.InfoWindow[] = []

    conditions.forEach((cond) => {
      const meta = CONDITION_SYMBOLS[cond.type]
      if (!meta) return
      const marker = new google.maps.Marker({
        map,
        position: { lat: cond.lat, lng: cond.lon },
        icon: {
          url: conditionIconSvgDataUrl(cond.type, 30),
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15),
        },
        title: meta.label,
        zIndex: 18,
      })
      const body = cond.detail ?? meta.detail
      const reading = cond.reading ? `Live reading: ${cond.reading}` : undefined

      const catColors: Record<string, string> = {
        weather: '#0c4a6e',
        environmental: '#431407',
        operational: '#14532d',
      }

      const iw = attachInfoWindow(
        map,
        marker,
        styledInfoHtml(
          meta.label,
          meta.category.toUpperCase(),
          body,
          catColors[meta.category] ?? '#1e293b',
          reading,
        ),
      )
      markers.push(marker)
      windows.push(iw)
    })

    return () => {
      markers.forEach((m) => m.setMap(null))
      windows.forEach((w) => w.close())
    }
  }, [map, conditions])

  return null
}

// ── Exported compound overlay ─────────────────────────────────────────────────
export function MapOverlays({
  segments,
  stations,
  environmentalZones,
  mapConditions = [],
  trainPosition,
  trackDetails,
}: {
  segments: SegmentPath[]
  stations: Station[]
  environmentalZones: EnvironmentalZone[]
  mapConditions?: MapCondition[]
  trainPosition?: TrainPosition
  trackDetails?: Array<{ id: string; label: string; distance_km: number; clearance_status: string; advisory?: string; congestion: number; phase: string }>
}) {
  return (
    <>
      <FitBounds segments={segments} stations={stations} trainPosition={trainPosition} />
      <ZonePolygons zones={environmentalZones} />
      <ConditionMarkers conditions={mapConditions} />
      <SegmentPolylines segments={segments} />
      <SegmentLabels segments={segments} trackDetails={trackDetails} />
      <StationMarkers stations={stations} segments={segments} />
      {trainPosition ? <TrainMarker trainPosition={trainPosition} /> : null}
    </>
  )
}
