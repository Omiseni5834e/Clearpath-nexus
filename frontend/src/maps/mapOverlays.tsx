import { useEffect } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { EnvironmentalZone, MapCondition, SegmentPath, Station, TrainPosition } from '../types/route'
import { CONDITION_SYMBOLS } from './conditionSymbols'
import { conditionIconSvgDataUrl } from '../components/ConditionIcon'
import { STATUS_COLORS, ZONE_COLORS } from './darkMapStyle'

const PHASE_COLORS: Record<string, string> = {
  CURRENT: '#63B3ED',
  UPCOMING: STATUS_COLORS.APPROVED,
  TRAVERSED: '#64748b',
}

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
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
  }, [map, core, segments, stations, trainPosition])

  return null
}

function SegmentPolylines({ segments }: { segments: SegmentPath[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const lines = segments.map((seg) => {
      const phase = seg.phase ?? 'UPCOMING'
      const line = new google.maps.Polyline({
        path: seg.coordinates.map(([lat, lon]) => ({ lat, lng: lon })),
        strokeColor:
          seg.status === 'HARD_BLOCKED'
            ? STATUS_COLORS.HARD_BLOCKED
            : PHASE_COLORS[phase] ?? STATUS_COLORS.APPROVED,
        strokeWeight: phase === 'CURRENT' ? 7 : 5,
        strokeOpacity: phase === 'TRAVERSED' ? 0.35 : 0.92,
        geodesic: true,
        zIndex: phase === 'CURRENT' ? 10 : 5,
      })
      line.setMap(map)
      return line
    })

    return () => lines.forEach((l) => l.setMap(null))
  }, [map, segments])

  return null
}

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
        fillColor: colors.fill,
        fillOpacity: 0.45,
        zIndex: 5,
      })
      polygon.setMap(map)
      return polygon
    })

    return () => shapes.forEach((s) => s.setMap(null))
  }, [map, zones])

  return null
}

function infoHtml(title: string, body: string, hint?: string) {
  return `<div style="font-family:monospace;max-width:220px;padding:4px">
    <strong style="font-size:13px">${title}</strong>
    <p style="font-size:11px;margin:6px 0;line-height:1.4;color:#334155">${body}</p>
    ${hint ? `<p style="font-size:10px;color:#64748b;font-style:italic;margin:0">${hint}</p>` : ''}
  </div>`
}

function attachInfoWindow(map: google.maps.Map, marker: google.maps.Marker, html: string) {
  const iw = new google.maps.InfoWindow({ content: html })
  marker.addListener('click', () => iw.open({ map, anchor: marker }))
  return iw
}

function StationMarkers({ stations }: { stations: Station[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const markers: google.maps.Marker[] = []
    const windows: google.maps.InfoWindow[] = []

    stations.forEach((s) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: s.lat, lng: s.lon },
        title: s.code,
      })
      const iw = attachInfoWindow(map, marker, infoHtml(s.code, s.name, 'Station marker — corridor junction'))
      markers.push(marker)
      windows.push(iw)
    })

    return () => {
      markers.forEach((m) => m.setMap(null))
      windows.forEach((w) => w.close())
    }
  }, [map, stations])

  return null
}

function TrainMarker({ trainPosition }: { trainPosition: TrainPosition }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const marker = new google.maps.Marker({
      map,
      position: { lat: trainPosition.lat, lng: trainPosition.lon },
      title: 'Train',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#63B3ED',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    })
    const iw = attachInfoWindow(
      map,
      marker,
      infoHtml(
        'Train position',
        trainPosition.snapped_track ?? trainPosition.station_code ?? 'Live coordinates',
        'Snapped to nearest track segment',
      ),
    )

    return () => {
      marker.setMap(null)
      iw.close()
    }
  }, [map, trainPosition])

  return null
}

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
          url: conditionIconSvgDataUrl(cond.type, 32),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
        title: meta.label,
      })
      const body = cond.detail ?? meta.detail
      const reading = cond.reading ? `Live reading: ${cond.reading}` : undefined
      const iw = attachInfoWindow(map, marker, infoHtml(meta.label, body, reading))
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

export function MapOverlays({
  segments,
  stations,
  environmentalZones,
  mapConditions = [],
  trainPosition,
}: {
  segments: SegmentPath[]
  stations: Station[]
  environmentalZones: EnvironmentalZone[]
  mapConditions?: MapCondition[]
  trainPosition?: TrainPosition
}) {
  return (
    <>
      <FitBounds segments={segments} stations={stations} trainPosition={trainPosition} />
      <ZonePolygons zones={environmentalZones} />
      <ConditionMarkers conditions={mapConditions} />
      <SegmentPolylines segments={segments} />
      <StationMarkers stations={stations} />
      {trainPosition ? <TrainMarker trainPosition={trainPosition} /> : null}
    </>
  )
}
