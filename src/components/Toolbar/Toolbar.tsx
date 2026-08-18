import { useCallback, useRef, useState } from 'react'
import { ENUM_OPTIONS } from '../../data/schema'
import { useDismiss } from '../../hooks/useDismiss'
import type { ColumnFilters } from '../../store/useTableStore'
import { ColumnVisibilityPanel } from './ColumnVisibilityPanel'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  filters: ColumnFilters
  onFiltersChange: (partial: Partial<ColumnFilters>) => void
  onResetFilters: () => void
  visibleColumns: string[]
  onColumnsChange: (keys: string[]) => void
  datasetSize: number
  onDatasetSizeChange: (n: number) => void
  totalRecords: number
  matchedCount: number
  selectedCount: number
  onAddRecord: () => void
  onUploadCsv: () => void
  onExportCsv: () => void
  onDeleteSelected: () => void
  onClearSelection: () => void
  isFiltering: boolean
  isRegenerating: boolean
}

const SIZE_OPTIONS = [10_000, 25_000, 50_000, 100_000]

const BUTTON = 'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'

export function Toolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  visibleColumns,
  onColumnsChange,
  datasetSize,
  onDatasetSizeChange,
  totalRecords,
  matchedCount,
  selectedCount,
  onAddRecord,
  onUploadCsv,
  onExportCsv,
  onDeleteSelected,
  onClearSelection,
  isFiltering,
  isRegenerating,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const closeFilters = useCallback(() => setFiltersOpen(false), [])
  useDismiss(closeFilters, filterRef)

  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length
  const isNarrowed = activeFilterCount > 0 || searchQuery !== ''

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search SKU, name, brand, supplier…"
            aria-label="Search records"
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-8 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        <div className="relative" ref={filterRef}>
          <button onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={BUTTON}>
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <FilterPopover filters={filters} onFiltersChange={onFiltersChange} onClose={closeFilters} />
          )}
        </div>

        <ColumnVisibilityPanel visibleColumns={visibleColumns} onChange={onColumnsChange} />

        <label className="flex items-center gap-1.5 text-sm text-slate-500">
          <span className="sr-only sm:not-sr-only">Dataset</span>
          <select
            value={datasetSize}
            onChange={(e) => onDatasetSizeChange(Number(e.target.value))}
            disabled={isRegenerating}
            title="Regenerate the dataset at a different size"
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50"
          >
            {SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()} rows
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onExportCsv} className={BUTTON} disabled={matchedCount === 0}>
            Export CSV
          </button>
          <button onClick={onUploadCsv} className={BUTTON}>
            Import CSV
          </button>
          <button
            onClick={onAddRecord}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add record
          </button>
        </div>
      </div>

      <div className="flex min-h-[28px] flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-2 text-xs text-slate-500">
        {isFiltering ? (
          <span className="text-slate-400">Filtering…</span>
        ) : (
          <span>
            Showing <span className="font-medium tabular-nums text-slate-700">{matchedCount.toLocaleString()}</span>
            {isNarrowed && <> of <span className="tabular-nums">{totalRecords.toLocaleString()}</span></>} records
          </span>
        )}

        {isNarrowed && (
          <button onClick={onResetFilters} className="text-slate-500 underline decoration-dotted hover:text-slate-800">
            Clear search &amp; filters
          </button>
        )}

        {selectedCount > 0 && (
          <span className="ml-auto flex items-center gap-2">
            <span className="font-medium text-indigo-600 tabular-nums">{selectedCount.toLocaleString()} selected</span>
            <button onClick={onClearSelection} className="text-slate-500 underline decoration-dotted hover:text-slate-800">
              Clear
            </button>
            <button
              onClick={onDeleteSelected}
              className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700 hover:bg-rose-100"
            >
              Delete selected
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

const FILTER_INPUT = 'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400'

function FilterPopover({
  filters,
  onFiltersChange,
  onClose,
}: {
  filters: ColumnFilters
  onFiltersChange: (partial: Partial<ColumnFilters>) => void
  onClose: () => void
}) {
  return (
    <div className="absolute left-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Refine results</p>
        <button onClick={onClose} aria-label="Close filters" className="text-lg leading-none text-slate-400 hover:text-slate-700">
          ×
        </button>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
      <select
        value={filters.category}
        onChange={(e) => onFiltersChange({ category: e.target.value })}
        className={`${FILTER_INPUT} mb-3`}
      >
        <option value="">All categories</option>
        {ENUM_OPTIONS.category.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ status: e.target.value })}
        className={`${FILTER_INPUT} mb-3`}
      >
        <option value="">All statuses</option>
        {ENUM_OPTIONS.status.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <RangeInputs
        label="Price range ($)"
        min={filters.priceMin}
        max={filters.priceMax}
        onMin={(v) => onFiltersChange({ priceMin: v })}
        onMax={(v) => onFiltersChange({ priceMax: v })}
      />
      <RangeInputs
        label="Stock qty range"
        min={filters.stockMin}
        max={filters.stockMax}
        onMin={(v) => onFiltersChange({ stockMin: v })}
        onMax={(v) => onFiltersChange({ stockMax: v })}
      />
    </div>
  )
}

function RangeInputs({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string
  min: string
  max: string
  onMin: (v: string) => void
  onMax: (v: string) => void
}) {
  // Min above max silently returns nothing; say so rather than look broken.
  const inverted = min !== '' && max !== '' && Number(min) > Number(max)
  return (
    <div className="mb-3 last:mb-0">
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" min={0} placeholder="Min" value={min} onChange={(e) => onMin(e.target.value)} className={FILTER_INPUT} aria-label={`${label} minimum`} />
        <span className="text-slate-400">–</span>
        <input type="number" min={0} placeholder="Max" value={max} onChange={(e) => onMax(e.target.value)} className={FILTER_INPUT} aria-label={`${label} maximum`} />
      </div>
      {inverted && <p className="mt-1 text-xs text-amber-600">Min is above max — no rows can match.</p>}
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
