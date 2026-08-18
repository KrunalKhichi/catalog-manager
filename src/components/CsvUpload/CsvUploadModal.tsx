import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { FIELD_SCHEMA } from '../../data/schema'
import { useDismiss } from '../../hooks/useDismiss'
import type { ProductRecord } from '../../types'
import { coerceValue, downloadTextFile, generateSampleCsv, mapHeaders, type HeaderMapping } from '../../utils/csv'

interface Props {
  onClose: () => void
  onImport: (records: Omit<ProductRecord, 'id'>[]) => void
}

type Stage =
  | { name: 'idle' }
  | { name: 'parsing' }
  | { name: 'error'; message: string }
  | { name: 'preview'; mapping: HeaderMapping; rows: Record<string, string>[] }

const REQUIRED = FIELD_SCHEMA.filter((f) => f.required)

export function CsvUploadModal({ onClose, onImport }: Props) {
  const [stage, setStage] = useState<Stage>({ name: 'idle' })
  const [fileName, setFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useDismiss(onClose)

  function parseFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setStage({ name: 'error', message: `“${file.name}” isn’t a .csv file.` })
      return
    }
    setFileName(file.name)
    setStage({ name: 'parsing' })

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setStage({ name: 'error', message: 'That file parsed cleanly but has no data rows.' })
          return
        }
        const mapping = mapHeaders(results.meta.fields ?? [])
        if (mapping.matched.length === 0) {
          setStage({
            name: 'error',
            message: 'No column headers matched a known field. The sample template below shows the names we look for.',
          })
          return
        }
        setStage({ name: 'preview', mapping, rows: results.data })
      },
      error: (err: Error) => setStage({ name: 'error', message: err.message || 'Could not read that file.' }),
    })
  }

  function handleImport() {
    if (stage.name !== 'preview') return
    onImport(
      stage.rows.map((row) =>
        Object.fromEntries(
          stage.mapping.matched.map(({ header, field }) => [field.key, coerceValue(field, row[header])]),
        ),
      ) as Omit<ProductRecord, 'id'>[],
    )
    onClose()
  }

  const missingRequired =
    stage.name === 'preview'
      ? REQUIRED.filter((f) => !stage.mapping.matched.some((m) => m.field.key === f.key))
      : []

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Import records from CSV"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import records from CSV</h2>
            <p className="text-sm text-slate-500">Columns are matched to fields by header name, in any order.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {stage.name === 'idle' && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                const file = e.dataTransfer.files?.[0]
                if (file) parseFile(file)
              }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <p className="text-sm font-medium text-slate-700">Drop a CSV here, or click to browse</p>
              <p className="mt-1 text-xs text-slate-400">Headers like “stockQty”, “Stock Qty” and “stock_qty” all match.</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) parseFile(file)
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {stage.name === 'parsing' && (
            <p className="py-10 text-center text-sm text-slate-500">Parsing {fileName}…</p>
          )}

          {stage.name === 'error' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {stage.message}
              <button onClick={() => setStage({ name: 'idle' })} className="mt-3 block text-xs text-rose-800 underline">
                Try another file
              </button>
            </div>
          )}

          {stage.name === 'preview' && (
            <div>
              <p className="text-sm text-slate-700">
                <span className="font-semibold tabular-nums">{stage.rows.length.toLocaleString()}</span> rows in{' '}
                <span className="rounded bg-slate-100 px-1 font-mono text-xs">{fileName}</span>
              </p>

              {missingRequired.length > 0 && (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No column for {missingRequired.map((f) => f.label).join(', ')}. Those will import empty — you can
                  fill them in per row afterwards.
                </p>
              )}

              <div className="mt-3 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
                {stage.mapping.matched.map(({ header, field }) => (
                  <div key={header} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <span className="truncate text-slate-500">{header}</span>
                    <span className="text-slate-300">→</span>
                    <span className="ml-auto font-medium text-emerald-700">{field.label}</span>
                  </div>
                ))}
                {stage.mapping.unmatched.map((header) => (
                  <div key={header} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <span className="truncate text-slate-400 line-through">{header}</span>
                    <span className="ml-auto text-slate-400">no matching field — skipped</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            onClick={() => downloadTextFile('catalog-template.csv', generateSampleCsv())}
            className="text-xs text-indigo-600 underline decoration-dotted hover:text-indigo-800"
          >
            Download template
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {stage.name === 'preview' && (
              <button
                onClick={handleImport}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Import {stage.rows.length.toLocaleString()} rows
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
