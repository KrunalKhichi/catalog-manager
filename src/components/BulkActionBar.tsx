import { ENUM_OPTIONS } from '../data/schema'

interface Props {
  selectedCount: number
  onSetStatus: (status: string) => void
  onSetWarehouse: (warehouse: string) => void
  onExport: () => void
  onDelete: () => void
  onClear: () => void
}

const SELECT =
  'rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

/**
 * Selection persists across pages, so this bar reports the total selected
 * everywhere — not just what's on screen. Every action here applies to that
 * whole set.
 */
export function BulkActionBar({
  selectedCount,
  onSetStatus,
  onSetWarehouse,
  onExport,
  onDelete,
  onClear,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2"
    >
      <span className="text-sm font-medium tabular-nums text-indigo-900">
        {selectedCount.toLocaleString()} selected
      </span>

      {/* Value resets to "" after each change so the same status can be
          applied twice in a row. */}
      <label className="flex items-center gap-1.5 text-xs text-indigo-900">
        Status
        <select
          value=""
          onChange={(e) => e.target.value && onSetStatus(e.target.value)}
          aria-label="Set status for selected products"
          className={SELECT}
        >
          <option value="">Change to…</option>
          {ENUM_OPTIONS.status.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-indigo-900">
        Warehouse
        <select
          value=""
          onChange={(e) => e.target.value && onSetWarehouse(e.target.value)}
          aria-label="Set warehouse for selected products"
          className={SELECT}
        >
          <option value="">Move to…</option>
          {ENUM_OPTIONS.warehouse.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onExport}
          className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Export selected
        </button>
        <button
          onClick={onDelete}
          className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
        >
          Delete
        </button>
        <button
          onClick={onClear}
          className="text-xs text-indigo-700 underline decoration-dotted hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
        >
          Clear selection
        </button>
      </div>
    </div>
  )
}
