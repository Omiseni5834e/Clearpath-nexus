import { useState } from 'react'
import { APIProvider, Map } from '@vis.gl/react-google-maps'
import type { EnvironmentalZone, MapCondition, SegmentPath, Station, TrackSegmentDetail, TrainPosition } from '../types/route'
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
  trackDetails?: TrackSegmentDetail[]
}

function MapCanvas({
  segments,
  stations,
  environmentalZones,
  mapConditions,
  routeLabel,
  trainPosition,
  liveWeatherUpdated,
  trackDetails,
}: {
  segments: SegmentPath[]
  stations: Station[]
  environmentalZones: EnvironmentalZone[]
  mapConditions: MapCondition[]
  routeLabel?: string
  trainPosition?: TrainPosition
  liveWeatherUpdated?: Date | null
  trackDetails?: TrackSegmentDetail[]
}) {
  const [legendCollapsed, setLegendCollapsed] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-700/60 shadow-2xl shadow-blue-950/60"
      style={{ boxShadow: '0 0 0 1px rgba(59,130,246,0.12), 0 24px 60px -12px rgba(10,22,60,0.9)' }}
    >
      {/* Map fills the full container — legend floats over it */}
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
          trackDetails={trackDetails}
        />
      </Map>

      {/* Floating legend — overlays the map, does NOT shrink it */}
      <div
        className={`absolute top-3 left-3 z-10 transition-all duration-300 ease-in-out ${
          legendCollapsed ? 'w-11' : 'w-[215px]'
        }`}
        style={{ maxHeight: 'calc(100% - 1.5rem)' }}
      >
        <MapLegend
          routeLabel={routeLabel}
          conditionCount={mapConditions.length}
          liveWeatherUpdated={liveWeatherUpdated}
          collapsed={legendCollapsed}
          onToggle={() => setLegendCollapsed((v) => !v)}
        />
      </div>

      {/* Bottom-right: condition count badge when legend is collapsed */}
      {legendCollapsed && mapConditions.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-950/70 px-2.5 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[10px] font-mono text-sky-300">
            {mapConditions.length} live condition{mapConditions.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
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
  trackDetails = [],
}: MapViewerProps) {
  if (!API_KEY) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-amber-500/40 bg-slate-900/70 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-950/30">
          <svg className="h-7 w-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-300">Google Maps API key required</p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Add your browser API key to load map tiles directly on your network — no server proxy needed.
          </p>
        </div>
        <code className="rounded-lg border border-emerald-700/40 bg-black/40 px-4 py-2 font-mono text-xs text-emerald-300">
          VITE_GOOGLE_MAPS_API_KEY=your_key
        </code>
        <p className="text-xs text-slate-600">Google Cloud Console → Maps JavaScript API</p>
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
        trackDetails={trackDetails}
      />
    </APIProvider>
  )
}
