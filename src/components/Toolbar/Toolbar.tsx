import { useCallback, useRef, useState } from 'react'
import { countActiveFilters, type Filters, type MultiKey } from '../../store/useTableStore'
import { useDismiss } from '../../hooks/useDismiss'
import { ColumnVisibilityPanel } from './ColumnVisibilityPanel'
import { FilterPanel } from './FilterPanel'
import { FilterChips } from './FilterChips'
import { SavedViews } from './SavedViews'
import { FilterIcon, SearchIcon } from '../common/icons'
import { BUTTON, BUTTON_PRIMARY } from '../common/ui'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  filters: Filters
  facetOptions: Record<MultiKey, string[]>
  onFiltersChange: (partial: Partial<Filters>) => void
  onResetFilters: () => void
  onClearAll: () => void
  visibleColumns: string[]
  onColumnsChange: (keys: string[]) => void
  datasetSize: number
  onDatasetSizeChange: (n: number) => void
  totalRecords: number
  matchedCount: number
  onAddRecord: () => void
  onUploadCsv: () => void
  onExportCsv: () => void
  isFiltering: boolean
  isBusy: boolean
}

const SIZE_OPTIONS = [10_000, 25_000, 50_000, 100_000]

export function Toolbar({
  searchQuery,
  onSearchChange,
  searchInputRef,
  filters,
  facetOptions,
  onFiltersChange,
  onResetFilters,
  onClearAll,
  visibleColumns,
  onColumnsChange,
  datasetSize,
  onDatasetSizeChange,
  totalRecords,
  matchedCount,
  onAddRecord,
  onUploadCsv,
  onExportCsv,
  isFiltering,
  isBusy,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const closeFilters = useCallback(() => setFiltersOpen(false), [])
  useDismiss(closeFilters, filterRef)

  const activeFilterCount = countActiveFilters(filters)
  const isNarrowed = activeFilterCount > 0 || searchQuery !== ''

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search SKU, name, brand, supplier…"
            aria-label="Search records"
            title="Press / to focus"
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-8 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        <div className="relative" ref={filterRef}>
          <button onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={BUTTON}>
            <FilterIcon />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <FilterPanel
              filters={filters}
              facetOptions={facetOptions}
              onChange={onFiltersChange}
              onReset={onResetFilters}
              onClose={closeFilters}
            />
          )}
        </div>

        <ColumnVisibilityPanel visibleColumns={visibleColumns} onChange={onColumnsChange} />

        <SavedViews />

        <label className="flex items-center gap-1.5 text-sm text-slate-500">
          <span className="sr-only lg:not-sr-only">Dataset</span>
          <select
            value={datasetSize}
            onChange={(e) => onDatasetSizeChange(Number(e.target.value))}
            disabled={isBusy}
            title="Regenerate the dataset at a different size"
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50"
          >
            {SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Generate {n.toLocaleString()}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onExportCsv} className={BUTTON} disabled={totalRecords === 0}>
            Export CSV
          </button>
          <button onClick={onUploadCsv} className={BUTTON}>
            Import CSV
          </button>
          <button onClick={onAddRecord} className={BUTTON_PRIMARY}>
            + Add record
          </button>
        </div>
      </div>

      <FilterChips
        filters={filters}
        searchQuery={searchQuery}
        onChange={onFiltersChange}
        onClearSearch={() => onSearchChange('')}
        onClearAll={onClearAll}
      />

      <div className="flex min-h-[26px] flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 px-4 py-1.5 text-xs text-slate-500">
        {isFiltering ? (
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="size-3 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
            Filtering {totalRecords.toLocaleString()} records…
          </span>
        ) : (
          // Always "X of Y", never a bare count: the total is the live row
          // count, so an add or delete moves both numbers at once and the
          // dataset selector's generation size can never contradict it.
          <span>
            Matching{' '}
            <span className="font-medium tabular-nums text-slate-700">{matchedCount.toLocaleString()}</span> of{' '}
            <span className="tabular-nums">{totalRecords.toLocaleString()}</span> records
          </span>
        )}

        {isNarrowed && (
          <button
            onClick={onClearAll}
            className="rounded text-slate-500 underline decoration-dotted hover:text-slate-800"
          >
            Clear search &amp; filters
          </button>
        )}
      </div>
    </div>
  )
}
