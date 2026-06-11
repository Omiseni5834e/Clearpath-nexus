import { useState } from 'react'
import { APIProvider, Map } from '@vis.gl/react-google-maps'
import type { EnvironmentalZone, MapCondition, SegmentPath, Station, TrainPosition } from '../types/route'
import { DARK_MAP_STYLE } from '../maps/darkMapStyle'
import { MapOverlays } from '../maps/mapOverlays'
import MapLegend from './MapLegend'

const DEFAULT_CENTER = { lat: 21.1458, lng: 79.0882 }
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

interface MapViewerProps {
  segments: SegmentPath[]
  stations?: Station[]
  environmentalZones?: EnvironmentalZone[]
  mapConditions?: MapCondition[]
  routeLabel?: string
  trainPosition?: TrainPosition
  liveWeatherUpdated?: Date | null
}

function MapCanvas({
  segments,
  stations,
  environmentalZones,
  mapConditions,
  routeLabel,
  trainPosition,
  liveWeatherUpdated,
}: {
  segments: SegmentPath[]
  stations: Station[]
  environmentalZones: EnvironmentalZone[]
  mapConditions: MapCondition[]
  routeLabel?: string
  trainPosition?: TrainPosition
  liveWeatherUpdated?: Date | null
}) {
  const [legendCollapsed, setLegendCollapsed] = useState(false)

  return (
    <div className="flex h-full w-full overflow-hidden rounded-xl border border-slate-700/80 shadow-2xl shadow-blue-950/40">
      <MapLegend
        routeLabel={routeLabel}
        conditionCount={mapConditions.length}
        liveWeatherUpdated={liveWeatherUpdated}
        collapsed={legendCollapsed}
        onToggle={() => setLegendCollapsed((v) => !v)}
      />

      <div className="relative min-w-0 flex-1">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={6}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl
          mapTypeControl
          streetViewControl={false}
          fullscreenControl
          styles={DARK_MAP_STYLE}
          className="h-full w-full"
          reuseMaps
        >
          <MapOverlays
            segments={segments}
            stations={stations}
            environmentalZones={environmentalZones}
            mapConditions={mapConditions}
            trainPosition={trainPosition}
          />
        </Map>
      </div>
    </div>
  )
}

export default function MapViewer({
  segments,
  stations = [],
  environmentalZones = [],
  mapConditions = [],
  routeLabel,
  trainPosition,
  liveWeatherUpdated,
}: MapViewerProps) {
  if (!API_KEY) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-amber-500/50 bg-slate-900/80 p-8 text-center">
        <div className="rounded-full bg-amber-500/15 px-4 py-1 text-xs font-mono uppercase tracking-widest text-amber-300">
          Google Maps — client direct
        </div>
        <p className="max-w-md text-sm text-slate-300">
          Add your browser API key to load map tiles on <strong>your network</strong>, not through the server.
        </p>
        <code className="rounded-lg bg-black/40 px-4 py-2 font-mono text-xs text-emerald-300">
          VITE_GOOGLE_MAPS_API_KEY=your_key
        </code>
        <p className="text-xs text-slate-500">Create a key at Google Cloud Console → Maps JavaScript API</p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={['marker']}>
      <MapCanvas
        segments={segments}
        stations={stations}
        environmentalZones={environmentalZones}
        mapConditions={mapConditions}
        routeLabel={routeLabel}
        trainPosition={trainPosition}
        liveWeatherUpdated={liveWeatherUpdated}
      />
    </APIProvider>
  )
}
