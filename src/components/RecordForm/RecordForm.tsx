import { useMemo, useRef, useState } from 'react'
import { FIELD_SCHEMA } from '../../data/schema'
import { useDismiss } from '../../hooks/useDismiss'
import type { FieldDef, ProductRecord } from '../../types'

interface Props {
  mode: 'create' | 'edit'
  /** Existing record when editing; the minted id preview when creating. */
  record?: ProductRecord
  nextIdPreview?: string
  onClose: () => void
  onSubmit: (values: Omit<ProductRecord, 'id'>) => void
}

type FormValues = Record<string, string | boolean>

function toFormValue(field: FieldDef, value: unknown): string | boolean {
  if (field.type === 'boolean') return Boolean(value)
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * Both create and edit run through here — the field list, input types and
 * validation all come off the schema, so adding a 61st field needs no
 * change in this file.
 */
export function RecordForm({ mode, record, nextIdPreview, onClose, onSubmit }: Props) {
  const [coreFields, advancedFields] = useMemo(
    () => [FIELD_SCHEMA.filter((f) => f.core), FIELD_SCHEMA.filter((f) => !f.core)],
    [],
  )

  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(FIELD_SCHEMA.map((f) => [f.key, toFormValue(f, record?.[f.key])])),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useDismiss(onClose)

  const filledAdvanced = advancedFields.filter((f) => {
    const v = values[f.key]
    return v !== '' && v !== false
  }).length

  function setField(key: string, value: string | boolean) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors(({ [key]: _cleared, ...rest }) => rest)
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {}
    for (const field of FIELD_SCHEMA) {
      const v = values[field.key]
      if (field.required && (v === '' || v === undefined || v === null)) {
        found[field.key] = `${field.label} is required`
      } else if (field.numeric && v !== '' && typeof v === 'string') {
        if (!Number.isFinite(Number(v))) found[field.key] = `${field.label} must be a number`
        else if (Number(v) < 0) found[field.key] = `${field.label} can't be negative`
      }
    }
    return found
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // A required field can live under the collapsed advanced section.
      if (advancedFields.some((f) => found[f.key])) setShowAdvanced(true)
      bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const next: Record<string, string | number | boolean | null> = {}
    for (const field of FIELD_SCHEMA) {
      const raw = values[field.key]
      if (field.type === 'boolean') next[field.key] = Boolean(raw)
      else if (raw === '') next[field.key] = null
      else if (field.numeric) next[field.key] = Number(raw)
      else next[field.key] = raw as string
    }
    onSubmit(next as Omit<ProductRecord, 'id'>)
  }

  const isEdit = mode === 'edit'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        aria-label={isEdit ? 'Edit record' : 'Add record'}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit record' : 'Add record'}</h2>
            <p className="text-sm text-slate-500">
              {isEdit ? `Editing ${record?.id}` : `Will be created as ${nextIdPreview}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl leading-none text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Core details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {coreFields.map((field, i) => (
              <FieldInput
                key={field.key}
                field={field}
                autoFocus={i === 0}
                value={values[field.key]}
                error={errors[field.key]}
                onChange={(v) => setField(field.key, v)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="mt-5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            {showAdvanced ? '− Hide' : '+ Show'} advanced fields ({advancedFields.length}
            {filledAdvanced > 0 && `, ${filledAdvanced} set`})
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

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          {Object.keys(errors).length > 0 && (
            <p className="mr-auto text-sm text-rose-600">
              {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's need' : ' needs'} attention
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {isEdit ? 'Save changes' : 'Create record'}
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
  autoFocus,
  onChange,
}: {
  field: FieldDef
  value: string | boolean
  error?: string
  autoFocus?: boolean
  onChange: (v: string | boolean) => void
}) {
  const id = `field-${field.key}`
  const shared = {
    id,
    autoFocus,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    className: `w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-1 ${
      error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-indigo-400 focus:ring-indigo-200'
    }`,
  }

  return (
    <div className={field.type === 'longtext' ? 'col-span-2' : ''}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {field.label}
        {field.required && <span className="text-rose-500"> *</span>}
      </label>

      {field.type === 'enum' ? (
        <select {...shared} value={value as string} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <label className="mt-1.5 flex items-center gap-2">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 accent-indigo-600"
          />
          <span className="text-sm text-slate-600">{value ? 'Yes' : 'No'}</span>
        </label>
      ) : field.type === 'longtext' ? (
        <textarea {...shared} rows={2} value={value as string} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...shared}
          type={field.type === 'date' ? 'date' : field.numeric ? 'number' : 'text'}
          step={field.type === 'currency' ? '0.01' : undefined}
          min={field.numeric ? 0 : undefined}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && (
        <p id={`${id}-error`} className="mt-0.5 text-xs text-rose-500">
          {error}
        </p>
      )}
    </div>
  )
}
