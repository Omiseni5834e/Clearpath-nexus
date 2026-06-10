import { CONDITION_SYMBOLS, CATEGORY_COLORS, type ConditionCategory, type ConditionType } from '../maps/conditionSymbols'
import ConditionIcon from './ConditionIcon'

interface MapLegendProps {
  routeLabel?: string
  conditionCount?: number
  liveWeatherUpdated?: Date | null
  collapsed?: boolean
  onToggle?: () => void
}

const CATEGORY_ORDER: ConditionCategory[] = ['weather', 'environmental', 'operational']

const CATEGORY_LABELS: Record<ConditionCategory, string> = {
  weather: 'Weather conditions',
  environmental: 'Environmental alerts',
  operational: 'Operational status',
}

export default function MapLegend({
  routeLabel,
  conditionCount = 0,
  liveWeatherUpdated,
  collapsed = false,
  onToggle,
}: MapLegendProps) {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: Object.entries(CONDITION_SYMBOLS).filter(([, s]) => s.category === cat),
  }))

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-slate-700/50 bg-slate-950/95 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-300"
          title="Show symbol legend"
          aria-label="Expand symbol legend"
        >
          <span className="text-xs font-bold">?</span>
        </button>
        <span
          className="mt-4 text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500 [writing-mode:vertical-rl] rotate-180"
        >
          Legend
        </span>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-slate-700/50 bg-slate-950/95">
      <div className="shrink-0 border-b border-slate-700/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              Live overlay
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Hide legend for map view"
            aria-label="Collapse symbol legend"
          >
            Hide
          </button>
        </div>
        <p className="mt-1 text-[9px] font-mono text-slate-500">
          {liveWeatherUpdated
            ? `Updated ${liveWeatherUpdated.toLocaleTimeString()}`
            : 'Fetching conditions…'}
        </p>
        {routeLabel ? (
          <div className="mt-2 border-t border-slate-700/40 pt-2">
            <span className="text-[8px] font-mono uppercase text-slate-400">Corridor</span>
            <p className="font-mono text-[11px] font-semibold text-white">{routeLabel}</p>
          </div>
        ) : null}
      </div>

      <p className="shrink-0 px-3 py-2 text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500">
        Symbol palette
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-3 space-y-1">
          <p className="text-[9px] font-mono font-bold uppercase text-slate-400">Route lines</p>
          <LegendLine color="#38A169" label="Approved segment" />
          <LegendLine color="#E53E3E" label="Blocked segment" />
          <LegendLine color="#63B3ED" label="Current segment" />
        </div>

        {grouped.map(({ cat, items }) => (
          <div key={cat} className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat].dot }} />
              <span
                className="text-[9px] font-mono font-bold uppercase"
                style={{ color: CATEGORY_COLORS[cat].stroke }}
              >
                {CATEGORY_LABELS[cat]}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map(([type, sym]) => (
                <li key={type} className="flex items-start gap-2">
                  <ConditionIcon type={type as ConditionType} size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-white">{sym.label}</p>
                    <p className="text-[8px] leading-tight text-slate-500">{sym.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {conditionCount > 0 ? (
        <p className="shrink-0 border-t border-slate-700/40 px-3 py-2 text-[8px] font-mono text-slate-500">
          {conditionCount} live marker{conditionCount === 1 ? '' : 's'} on map
        </p>
      ) : null}
    </aside>
  )
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-0.5 w-5 rounded" style={{ backgroundColor: color }} />
      <span className="font-mono text-[9px] text-slate-300">{label}</span>
    </div>
  )
}
