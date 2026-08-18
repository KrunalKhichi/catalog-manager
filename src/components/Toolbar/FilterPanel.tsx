import { useState } from 'react'
import type { Filters, MultiKey } from '../../store/useTableStore'

interface Props {
  filters: Filters
  facetOptions: Record<MultiKey, string[]>
  onChange: (partial: Partial<Filters>) => void
  onReset: () => void
  onClose: () => void
}

const FACETS: { key: MultiKey; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'status', label: 'Status' },
  { key: 'warehouse', label: 'Warehouse' },
]

const INPUT = 'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

/**
 * One popover for every filter. It stays a popover rather than a full drawer
 * because the whole set fits in ~420px of height — a drawer would cover the
 * table the user is filtering.
 */
export function FilterPanel({ filters, facetOptions, onChange, onReset, onClose }: Props) {
  const [openFacet, setOpenFacet] = useState<MultiKey | null>('category')

  function toggleValue(key: MultiKey, value: string) {
    const current = filters[key]
    onChange({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] })
  }

  return (
    <div
      role="dialog"
      aria-label="Filter products"
      className="absolute left-0 z-30 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-slate-800">Filters</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-xs text-slate-500 underline decoration-dotted hover:text-slate-800"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="text-lg leading-none text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-h-[26rem] overflow-y-auto p-4">
        {FACETS.map(({ key, label }) => {
          const selected = filters[key]
          const options = facetOptions[key]
          const expanded = openFacet === key
          return (
            <div key={key} className="mb-3 border-b border-slate-100 pb-3 last:border-0">
              <button
                onClick={() => setOpenFacet(expanded ? null : key)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <span>
                  {label}
                  {selected.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                      {selected.length}
                    </span>
                  )}
                </span>
                <span className="text-slate-400">{expanded ? '−' : '+'}</span>
              </button>

              {expanded && (
                <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto pr-1">
                  {options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 rounded px-1 py-1 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={() => toggleValue(key, option)}
                        className="size-3.5 accent-indigo-600"
                      />
                      <span className="truncate">{option}</span>
                    </label>
                  ))}
                  {options.length === 0 && <p className="px-1 py-1 text-xs text-slate-400">No values in this dataset.</p>}
                </div>
              )}
            </div>
          )
        })}

        <NumericRange
          label="Price ($)"
          min={filters.priceMin}
          max={filters.priceMax}
          onMin={(v) => onChange({ priceMin: v })}
          onMax={(v) => onChange({ priceMax: v })}
        />
        <NumericRange
          label="Stock quantity"
          min={filters.stockMin}
          max={filters.stockMax}
          onMin={(v) => onChange({ stockMin: v })}
          onMax={(v) => onChange({ stockMax: v })}
        />
        <NumericRange
          label="Rating"
          min={filters.ratingMin}
          max={filters.ratingMax}
          step="0.1"
          hardMax={5}
          onMin={(v) => onChange({ ratingMin: v })}
          onMax={(v) => onChange({ ratingMax: v })}
        />

        <div className="mb-1">
          <p className="mb-1 text-xs font-medium text-slate-600">Created at</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Created from"
              value={filters.createdFrom}
              onChange={(e) => onChange({ createdFrom: e.target.value })}
              className={INPUT}
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              aria-label="Created to"
              value={filters.createdTo}
              onChange={(e) => onChange({ createdTo: e.target.value })}
              className={INPUT}
            />
          </div>
          {filters.createdFrom !== '' && filters.createdTo !== '' && filters.createdFrom > filters.createdTo && (
            <p className="mt-1 text-xs text-amber-600">The start date is after the end date — no rows can match.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function NumericRange({
  label,
  min,
  max,
  step,
  hardMax,
  onMin,
  onMax,
}: {
  label: string
  min: string
  max: string
  step?: string
  hardMax?: number
  onMin: (v: string) => void
  onMax: (v: string) => void
}) {
  // Min above max silently returns nothing; say so rather than look broken.
  const inverted = min !== '' && max !== '' && Number(min) > Number(max)
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={hardMax}
          step={step}
          placeholder="Min"
          value={min}
          onChange={(e) => onMin(e.target.value)}
          className={INPUT}
          aria-label={`${label} minimum`}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          max={hardMax}
          step={step}
          placeholder="Max"
          value={max}
          onChange={(e) => onMax(e.target.value)}
          className={INPUT}
          aria-label={`${label} maximum`}
        />
      </div>
      {inverted && <p className="mt-1 text-xs text-amber-600">Min is above max — no rows can match.</p>}
    </div>
  )
}
