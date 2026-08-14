import { useMemo, useRef, useState } from 'react'
import { FIELD_SCHEMA, COLUMN_PRIORITY } from '../../data/schema'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'

interface Props {
  visibleColumns: string[]
  onChange: (keys: string[]) => void
}

const PRESETS: { label: string; count: number }[] = [
  { label: 'Compact', count: 10 },
  { label: 'Standard', count: 20 },
  { label: 'Wide', count: 40 },
  { label: 'All fields', count: 60 },
]

export function ColumnVisibilityPanel({ visibleColumns, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, () => setOpen(false))

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns])

  const filteredFields = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FIELD_SCHEMA
    return FIELD_SCHEMA.filter((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
  }, [query])

  function toggle(key: string) {
    if (visibleSet.has(key)) onChange(visibleColumns.filter((k) => k !== key))
    else onChange([...visibleColumns, key])
  }

  function applyPreset(count: number) {
    onChange(COLUMN_PRIORITY.slice(0, count))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <ColumnsIcon />
        Columns
        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 tabular-nums">
          {visibleColumns.length}/60
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-xl z-30">
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Column count presets</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.count)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                >
                  {p.label} ({p.count})
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter fields…"
              className="mt-3 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filteredFields.map((f) => (
              <label
                key={f.key}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
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
            {filteredFields.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-slate-400">No fields match "{query}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ColumnsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
      <line x1="15" y1="4" x2="15" y2="20" />
    </svg>
  )
}
