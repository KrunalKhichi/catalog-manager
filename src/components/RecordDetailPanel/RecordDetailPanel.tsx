import { useState } from 'react'
import type { ProductRecord } from '../../types'
import { FIELD_SCHEMA } from '../../data/schema'
import { useDismiss } from '../../hooks/useDismiss'
import { formatValue } from '../../utils/format'
import { StatusPill } from '../DataTable/cells/StatusPill'

interface Props {
  record: ProductRecord
  onClose: () => void
  onEdit: (record: ProductRecord) => void
  onDelete: (id: string) => void
}

/**
 * The table only ever shows a slice of the 60 fields. This is the escape
 * hatch: everything on one record, whatever the column settings are.
 */
export function RecordDetailPanel({ record, onClose, onEdit, onDelete }: Props) {
  const [showEmpty, setShowEmpty] = useState(false)
  useDismiss(onClose)

  const fields = FIELD_SCHEMA.filter((f) => {
    const v = record[f.key]
    return showEmpty || (v !== null && v !== undefined && v !== '')
  })
  const hiddenCount = FIELD_SCHEMA.length - fields.length

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button aria-label="Close detail panel" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside
        aria-label={`Details for ${record.id}`}
        className="relative h-full w-full max-w-md overflow-y-auto bg-white shadow-xl animate-[slidein_0.15s_ease-out]"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-wide text-slate-400">{record.id}</p>
              <h2 className="truncate text-lg font-semibold text-slate-900">{record.name ?? 'Untitled record'}</h2>
              <p className="truncate text-sm text-slate-500">{record.sku}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 px-1 text-xl leading-none text-slate-400 hover:text-slate-700"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {typeof record.status === 'string' && <StatusPill value={record.status} />}
            <button
              onClick={() => onEdit(record)}
              className="ml-auto rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(record.id)}
              className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
            >
              Delete
            </button>
          </div>
        </div>

        <dl className="divide-y divide-slate-100 px-5 py-2">
          {fields.map((field) => (
            <div key={field.key} className="grid grid-cols-5 gap-3 py-2 text-sm">
              <dt className="col-span-2 text-slate-500">{field.label}</dt>
              <dd className="col-span-3 break-words text-slate-800">{formatValue(field, record[field.key])}</dd>
            </div>
          ))}
        </dl>

        {hiddenCount > 0 && (
          <button
            onClick={() => setShowEmpty(true)}
            className="w-full px-5 pb-6 pt-2 text-left text-sm text-indigo-600 hover:text-indigo-800"
          >
            Show {hiddenCount} empty field{hiddenCount > 1 ? 's' : ''}
          </button>
        )}
      </aside>
    </div>
  )
}
