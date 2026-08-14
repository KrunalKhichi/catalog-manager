import type { ProductRecord } from '../../types'
import { FIELD_SCHEMA } from '../../data/schema'

interface Props {
  record: ProductRecord | null
  onClose: () => void
  onDelete: (id: string) => void
}

/**
 * Only a subset of the 60 fields is ever shown as table columns at once.
 * This panel is the escape hatch: click any row to see every field on the
 * record, regardless of which columns are currently toggled on.
 */
export function RecordDetailPanel({ record, onClose, onDelete }: Props) {
  if (!record) return null

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        aria-label="Close detail panel"
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md h-full bg-white shadow-xl overflow-y-auto animate-[slidein_0.15s_ease-out]">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">{record.id}</p>
            <h2 className="text-lg font-semibold text-slate-900">{record.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDelete(record.id)}
              className="text-xs font-medium text-rose-600 border border-rose-200 bg-rose-50 rounded-md px-2 py-1 hover:bg-rose-100"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <dl className="px-5 py-4 divide-y divide-slate-100">
          {FIELD_SCHEMA.map((field) => {
            const value = record[field.key]
            const display =
              value === null || value === undefined || value === ''
                ? '—'
                : typeof value === 'boolean'
                  ? value
                    ? 'Yes'
                    : 'No'
                  : field.type === 'currency'
                    ? `$${Number(value).toFixed(2)}`
                    : String(value)
            return (
              <div key={field.key} className="py-2 grid grid-cols-5 gap-2 text-sm">
                <dt className="col-span-2 text-slate-500">{field.label}</dt>
                <dd className="col-span-3 text-slate-800 break-words">{display}</dd>
              </div>
            )
          })}
        </dl>
      </div>
    </div>
  )
}
