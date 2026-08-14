import { useMemo, useState } from 'react'
import { FIELD_SCHEMA } from '../../data/schema'
import type { FieldDef, ProductRecord } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (record: Omit<ProductRecord, 'id'>) => void
  nextIdPreview: string
}

type FormValues = Record<string, string | boolean>

function defaultValueFor(field: FieldDef): string | boolean {
  if (field.type === 'boolean') return false
  return ''
}

export function AddRecordForm({ open, onClose, onSubmit, nextIdPreview }: Props) {
  const coreFields = useMemo(() => FIELD_SCHEMA.filter((f) => f.core), [])
  const advancedFields = useMemo(() => FIELD_SCHEMA.filter((f) => !f.core), [])

  const initialValues = useMemo(() => {
    const v: FormValues = {}
    for (const f of FIELD_SCHEMA) v[f.key] = defaultValueFor(f)
    return v
  }, [])

  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!open) return null

  function setField(key: string, value: string | boolean) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    for (const field of FIELD_SCHEMA) {
      if (!field.required) continue
      const v = values[field.key]
      if (v === '' || v === undefined || v === null) {
        nextErrors[field.key] = `${field.label} is required`
      }
      if (field.numeric && v !== '' && Number.isNaN(Number(v))) {
        nextErrors[field.key] = `${field.label} must be a number`
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const record: Record<string, string | number | boolean | null> = {}
    for (const field of FIELD_SCHEMA) {
      const raw = values[field.key]
      if (field.type === 'boolean') {
        record[field.key] = Boolean(raw)
      } else if ((field.type === 'number' || field.type === 'currency' || field.type === 'rating') && raw !== '') {
        record[field.key] = Number(raw)
      } else if (raw === '') {
        record[field.key] = null
      } else {
        record[field.key] = raw as string
      }
    }
    onSubmit(record as Omit<ProductRecord, 'id'>)
    setValues(initialValues)
    setErrors({})
    setShowAdvanced(false)
  }

  function handleClose() {
    setValues(initialValues)
    setErrors({})
    setShowAdvanced(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/40" onClick={handleClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add record</h2>
            <p className="text-sm text-slate-500">Will be created as {nextIdPreview}</p>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Core details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {coreFields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key]}
                error={errors[field.key]}
                onChange={(v) => setField(field.key, v)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            {showAdvanced ? '− Hide advanced fields' : `+ Show advanced fields (${advancedFields.length})`}
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4">
              {advancedFields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  error={errors[field.key]}
                  onChange={(v) => setField(field.key, v)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button type="submit" className="px-4 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
            Create record
          </button>
        </div>
      </form>
    </div>
  )
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef
  value: string | boolean
  error?: string
  onChange: (v: string | boolean) => void
}) {
  const isFullWidth = field.type === 'longtext'
  return (
    <div className={isFullWidth ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {field.label}
        {field.required && <span className="text-rose-500"> *</span>}
      </label>
      {field.type === 'enum' ? (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${error ? 'border-rose-400' : 'border-slate-300'}`}
        >
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <label className="flex items-center gap-2 mt-1.5">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-indigo-600" />
          <span className="text-sm text-slate-600">{value ? 'Yes' : 'No'}</span>
        </label>
      ) : field.type === 'longtext' ? (
        <textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${error ? 'border-rose-400' : 'border-slate-300'}`}
        />
      ) : field.type === 'date' ? (
        <input
          type="date"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${error ? 'border-rose-400' : 'border-slate-300'}`}
        />
      ) : (
        <input
          type={field.numeric ? 'number' : 'text'}
          step={field.type === 'currency' ? '0.01' : undefined}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${error ? 'border-rose-400' : 'border-slate-300'}`}
        />
      )}
      {error && <p className="mt-0.5 text-xs text-rose-500">{error}</p>}
    </div>
  )
}
