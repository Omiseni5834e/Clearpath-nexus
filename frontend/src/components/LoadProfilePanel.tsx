import { useCallback, useEffect, useState } from 'react'
import type { LoadProfile } from '../types/loadProfile'
import { createLoadProfile, readLoadProfiles, writeLoadProfiles } from '../types/loadProfile'

interface Props {
  selectedId: string | null
  onSelect: (profile: LoadProfile | null) => void
  onContinue?: () => void
}

type View = 'list' | 'create'

const EMPTY_FORM = {
  name: '',
  height: '4.5',
  width: '3.0',
  weight: '120',
  compartments: '1',
  compartmentPurpose: '',
  notes: '',
}

export default function LoadProfilePanel({ selectedId, onSelect, onContinue }: Props) {
  const [profiles, setProfiles] = useState<LoadProfile[]>([])
  const [view, setView] = useState<View>('create')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LoadProfile | null>(null)

  const refresh = useCallback(() => {
    setProfiles(readLoadProfiles())
  }, [])

  useEffect(() => {
    refresh()
    const stored = readLoadProfiles()
    if (stored.length > 0) {
      setView('list')
      if (selectedId && stored.some((p) => p.id === selectedId)) return
      onSelect(stored[0])
    } else {
      setView('create')
      onSelect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = () => {
    const height = parseFloat(form.height)
    const width = parseFloat(form.width)
    const weight = parseFloat(form.weight)
    const compartments = parseInt(form.compartments, 10)

    if (!form.name.trim()) {
      setFormError('Profile name is required.')
      return
    }
    if ([height, width, weight].some((n) => Number.isNaN(n) || n <= 0)) {
      setFormError('Height, width, and weight must be positive numbers.')
      return
    }
    if (Number.isNaN(compartments) || compartments < 1) {
      setFormError('Compartment count must be at least 1.')
      return
    }

    const profile = createLoadProfile({
      name: form.name.trim(),
      height,
      width,
      weight,
      compartments,
      compartmentPurpose: form.compartmentPurpose.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })

    const next = [...profiles, profile]
    writeLoadProfiles(next)
    setProfiles(next)
    onSelect(profile)
    setForm(EMPTY_FORM)
    setFormError(null)
    setView('list')
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const next = profiles.filter((p) => p.id !== deleteTarget.id)
    writeLoadProfiles(next)
    setProfiles(next)
    if (selectedId === deleteTarget.id) {
      onSelect(next[0] ?? null)
      if (next.length === 0) setView('create')
    }
    setDeleteTarget(null)
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Load Profiles</h2>
        {view === 'list' ? (
          <button
            type="button"
            onClick={() => {
              setView('create')
              setForm(EMPTY_FORM)
              setFormError(null)
            }}
            className="text-[10px] font-mono font-semibold text-emerald-400 hover:text-emerald-300"
          >
            + Add new load profile
          </button>
        ) : null}
      </div>

      {view === 'create' ? (
        <div className="rounded-xl border border-blue-500/30 bg-slate-900/50 p-3 flex flex-col gap-3">
          <p className="text-xs font-mono text-slate-400">
            Define cargo dimensions for corridor clearance checks. Start here before routing.
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-mono text-gray-400">Profile name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Oversize turbine blades"
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono text-sm"
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['height', 'Height (m)'],
                ['width', 'Width (m)'],
                ['weight', 'Weight (T)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-gray-400">{label}</span>
                <input
                  type="number"
                  step="0.1"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-2 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono text-sm"
                />
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-mono text-gray-400">Number of compartments</span>
            <input
              type="number"
              min={1}
              value={form.compartments}
              onChange={(e) => setForm((f) => ({ ...f, compartments: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-mono text-gray-400">
              Why does compartment count matter for this load?
            </span>
            <textarea
              value={form.compartmentPurpose}
              onChange={(e) => setForm((f) => ({ ...f, compartmentPurpose: e.target.value }))}
              placeholder="e.g. Hazmat isolation, weight distribution across wagons, multi-commodity manifest…"
              rows={2}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono text-xs resize-none"
            />
            <span className="text-[10px] font-mono text-slate-500">
              Compartments affect how cargo is distributed across wagons for clearance and loading plans.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-mono text-gray-400">Notes (optional)</span>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-white font-mono text-sm"
            />
          </label>

          {formError ? <p className="text-xs font-mono text-red-400">{formError}</p> : null}

          <div className="flex gap-2">
            {profiles.length > 0 ? (
              <button
                type="button"
                onClick={() => setView('list')}
                className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-xs font-mono text-slate-300"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Save load profile
            </button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {profiles.map((p) => {
            const active = p.id === selectedId
            return (
              <li
                key={p.id}
                className={`rounded-lg border p-3 transition ${
                  active ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                }`}
              >
                <button type="button" onClick={() => onSelect(p)} className="w-full text-left">
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {p.height}m × {p.width}m · {p.weight}T · {p.compartments} compartment
                    {p.compartments === 1 ? '' : 's'}
                  </p>
                  {p.compartmentPurpose ? (
                    <p className="mt-1 text-[10px] font-mono text-slate-500 line-clamp-2">{p.compartmentPurpose}</p>
                  ) : null}
                </button>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {selectedId && view === 'list' && onContinue ? (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 px-3 py-2 text-xs font-mono text-emerald-300"
        >
          Continue to routing
        </button>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-600 bg-slate-950 p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Delete load profile?</h3>
            <p className="mt-2 text-xs font-mono text-slate-400">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>? This
              cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-slate-600 py-2 text-xs font-mono text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-500"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
