import { useState } from 'react'
import { ENUM_OPTIONS } from '../../data/schema'
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
  onDeleteSelected: () => void
  isFiltering: boolean
  isRegenerating: boolean
}

const SIZE_OPTIONS = [10_000, 25_000, 50_000, 100_000]

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
  onDeleteSelected,
  isFiltering,
  isRegenerating,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search SKU, name, brand, supplier…"
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-8 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <FilterPopover filters={filters} onFiltersChange={onFiltersChange} onClose={() => setFiltersOpen(false)} />
          )}
        </div>

        {(activeFilterCount > 0 || searchQuery) && (
          <button onClick={onResetFilters} className="text-sm text-slate-500 hover:text-slate-800 underline decoration-dotted">
            Clear all
          </button>
        )}

        <ColumnVisibilityPanel visibleColumns={visibleColumns} onChange={onColumnsChange} />

        <select
          value={datasetSize}
          onChange={(e) => onDatasetSizeChange(Number(e.target.value))}
          disabled={isRegenerating}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50"
          title="Regenerate dataset at a different size"
        >
          {SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString()} rows
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {selectedCount > 0 && (
            <button
              onClick={onDeleteSelected}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Delete {selectedCount} selected
            </button>
          )}
          <button
            onClick={onUploadCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
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
      <div className="px-4 pb-2 text-xs text-slate-500 flex items-center gap-1.5">
        {isFiltering ? (
          <span>Filtering…</span>
        ) : (
          <span>
            Showing <span className="font-medium text-slate-700 tabular-nums">{matchedCount.toLocaleString()}</span> of{' '}
            <span className="tabular-nums">{totalRecords.toLocaleString()}</span> records
          </span>
        )}
        {selectedCount > 0 && <span className="text-indigo-600 font-medium">· {selectedCount} selected</span>}
      </div>
    </div>
  )
}

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
    <div className="absolute left-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl z-30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-800">Refine results</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">
          ×
        </button>
      </div>

      <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
      <select
        value={filters.category}
        onChange={(e) => onFiltersChange({ category: e.target.value })}
        className="w-full mb-3 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">All categories</option>
        {ENUM_OPTIONS.category.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ status: e.target.value })}
        className="w-full mb-3 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">All statuses</option>
        {ENUM_OPTIONS.status.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label className="block text-xs font-medium text-slate-500 mb-1">Price range ($)</label>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={filters.priceMin}
          onChange={(e) => onFiltersChange({ priceMin: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          placeholder="Max"
          value={filters.priceMax}
          onChange={(e) => onFiltersChange({ priceMax: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      <label className="block text-xs font-medium text-slate-500 mb-1">Stock qty range</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={filters.stockMin}
          onChange={(e) => onFiltersChange({ stockMin: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          placeholder="Max"
          value={filters.stockMax}
          onChange={(e) => onFiltersChange({ stockMax: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
