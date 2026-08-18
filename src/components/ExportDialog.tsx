import { useState } from 'react'
import { useDismiss } from '../hooks/useDismiss'
import { BUTTON, BUTTON_PRIMARY } from './common/ui'

export type ExportScope = 'all' | 'page' | 'filtered' | 'selected'

interface Props {
  counts: Record<ExportScope, number>
  /** True when a search or filter is active, so "Filtered" means something different from "All". */
  isNarrowed: boolean
  columnCount: number
  onExport: (scope: ExportScope, allColumns: boolean) => void
  onClose: () => void
}

const SCOPE_LABELS: Record<ExportScope, { title: string; hint: string }> = {
  all: { title: 'All products', hint: 'Every row in the dataset, ignoring search and filters' },
  page: { title: 'Current page', hint: 'Only the rows visible on this page' },
  filtered: { title: 'Filtered products', hint: 'Every row matching the current search and filters' },
  selected: { title: 'Selected products', hint: 'Only the rows you have checked' },
}

const ORDER: ExportScope[] = ['all', 'page', 'filtered', 'selected']

export function ExportDialog({ counts, isNarrowed, columnCount, onExport, onClose }: Props) {
  // Default to whatever the user most likely means: their selection if they
  // have one, the filtered set if they narrowed, otherwise everything.
  const [scope, setScope] = useState<ExportScope>(
    counts.selected > 0 ? 'selected' : isNarrowed ? 'filtered' : 'all',
  )
  const [allColumns, setAllColumns] = useState(false)
  useDismiss(onClose)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div role="dialog" aria-label="Export CSV" className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Export CSV</h2>
            <p className="text-sm text-slate-500">Choose which rows to include.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="sr-only">Rows to export</legend>
          {ORDER.map((option) => {
            const count = counts[option]
            const disabled = count === 0
            return (
              <label
                key={option}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                  disabled
                    ? 'cursor-not-allowed border-slate-200 opacity-50'
                    : scope === option
                      ? 'cursor-pointer border-indigo-400 bg-indigo-50'
                      : 'cursor-pointer border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value={option}
                  checked={scope === option}
                  disabled={disabled}
                  onChange={() => setScope(option)}
                  className="mt-0.5 size-4 accent-indigo-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{SCOPE_LABELS[option].title}</span>
                    <span className="text-xs tabular-nums text-slate-500">{count.toLocaleString()} rows</span>
                  </span>
                  <span className="block text-xs text-slate-500">{SCOPE_LABELS[option].hint}</span>
                </span>
              </label>
            )
          })}
        </fieldset>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allColumns}
            onChange={(e) => setAllColumns(e.target.checked)}
            className="size-4 accent-indigo-600"
          />
          Include all 60 fields (otherwise the {columnCount} visible columns)
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className={BUTTON}>
            Cancel
          </button>
          <button
            onClick={() => onExport(scope, allColumns)}
            disabled={counts[scope] === 0}
            className={BUTTON_PRIMARY}
          >
            Export {counts[scope].toLocaleString()} rows
          </button>
        </div>
      </div>
    </div>
  )
}
