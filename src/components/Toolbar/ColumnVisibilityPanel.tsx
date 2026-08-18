import { useCallback, useMemo, useRef, useState } from 'react'
import { FIELD_SCHEMA, COLUMN_PRIORITY, DEFAULT_VISIBLE } from '../../data/schema'
import { useDismiss } from '../../hooks/useDismiss'
import { ColumnsIcon } from '../common/icons'
import { BUTTON } from '../common/ui'

interface Props {
  visibleColumns: string[]
  onChange: (keys: string[]) => void
}

const PRESETS = [
  { label: 'Compact', count: 10 },
  { label: 'Standard', count: 20 },
  { label: 'Wide', count: 40 },
  { label: 'All fields', count: FIELD_SCHEMA.length },
]

export function ColumnVisibilityPanel({ visibleColumns, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(close, ref)

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FIELD_SCHEMA
    return FIELD_SCHEMA.filter((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
  }, [query])

  // A preset is "active" only if the visible set is exactly its prefix.
  const activePreset = PRESETS.find(
    (p) => p.count === visibleColumns.length && COLUMN_PRIORITY.slice(0, p.count).every((k) => visibleSet.has(k)),
  )

  function toggle(key: string) {
    onChange(visibleSet.has(key) ? visibleColumns.filter((k) => k !== key) : [...visibleColumns, key])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={BUTTON}
      >
        <ColumnsIcon />
        Columns
        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-500">
          {visibleColumns.length}/{FIELD_SCHEMA.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Column count</p>
              <div className="flex items-center gap-2">
                <button onClick={() => onChange([])} className="text-xs text-slate-500 hover:text-slate-800">
                  Hide all
                </button>
                <button onClick={() => onChange(DEFAULT_VISIBLE)} className="text-xs text-indigo-600 hover:text-indigo-800">
                  Reset
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => onChange(COLUMN_PRIORITY.slice(0, p.count))}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    activePreset === p
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {p.label} ({p.count})
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter fields…"
              aria-label="Filter field list"
              className="mt-3 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {matches.map((f) => (
              <label
                key={f.key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={visibleSet.has(f.key)}
                  onChange={() => toggle(f.key)}
                  className="size-4 accent-indigo-600"
                />
                {f.label}
                {f.core && <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">core</span>}
              </label>
            ))}
            {matches.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-slate-400">No fields match “{query}”</p>
            )}
          </div>

          <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
            Actions is pinned to the right of the table and isn’t one of the {FIELD_SCHEMA.length} data columns, so it
            can’t be hidden or reordered.
          </p>

          {visibleColumns.length === 0 && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-amber-600">
              Every column is hidden — the table has nothing to show.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
