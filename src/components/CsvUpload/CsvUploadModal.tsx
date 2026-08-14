import { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { ProductRecord } from '../../types'
import { coerceValue, downloadTextFile, generateSampleCsv, mapHeaders, type HeaderMapping } from '../../utils/csv'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (records: Omit<ProductRecord, 'id'>[]) => void
}

type Stage = 'idle' | 'parsing' | 'preview' | 'error'

export function CsvUploadModal({ open, onClose, onImport }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<HeaderMapping | null>(null)
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function reset() {
    setStage('idle')
    setFileName('')
    setMapping(null)
    setParsedRows([])
    setErrorMessage('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function parseFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setStage('error')
      setErrorMessage('Please upload a .csv file.')
      return
    }
    setFileName(file.name)
    setStage('parsing')

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        if (!results.data.length) {
          setStage('error')
          setErrorMessage('That file has no rows we could read.')
          return
        }
        const headers = results.meta.fields ?? []
        const headerMapping = mapHeaders(headers)
        if (headerMapping.matched.length === 0) {
          setStage('error')
          setErrorMessage("None of the columns in this file match known fields. Try the sample template below.")
          return
        }
        setMapping(headerMapping)
        setParsedRows(results.data)
        setStage('preview')
      },
      error: (err) => {
        setStage('error')
        setErrorMessage(err.message || 'Could not parse this file.')
      },
    })
  }

  function handleConfirmImport() {
    if (!mapping) return
    const records: Omit<ProductRecord, 'id'>[] = parsedRows.map((row) => {
      const record: Record<string, string | number | boolean | null> = {}
      for (const { header, field } of mapping.matched) {
        record[field.key] = coerceValue(field, row[header])
      }
      return record as Omit<ProductRecord, 'id'>
    })
    onImport(records)
    reset()
    onClose()
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import records from CSV</h2>
            <p className="text-sm text-slate-500">Headers are matched to fields automatically by name.</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {stage === 'idle' && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <p className="text-sm font-medium text-slate-700">Drop a CSV file here, or click to browse</p>
              <p className="mt-1 text-xs text-slate-400">Any column order works — matching is by header name.</p>
              <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFileInput} className="hidden" />
            </div>
          )}

          {stage === 'parsing' && (
            <div className="py-10 text-center text-sm text-slate-500">Parsing {fileName}…</div>
          )}

          {stage === 'error' && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
              {errorMessage}
              <button onClick={reset} className="block mt-3 text-rose-800 underline text-xs">
                Try another file
              </button>
            </div>
          )}

          {stage === 'preview' && mapping && (
            <div>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{parsedRows.length.toLocaleString()}</span> rows found in{' '}
                <span className="font-mono text-xs bg-slate-100 rounded px-1">{fileName}</span>
              </p>

              <div className="mt-3 rounded-md border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {mapping.matched.map(({ header, field }) => (
                  <div key={header} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="text-slate-500">{header}</span>
                    <span className="text-slate-300">→</span>
                    <span className="font-medium text-emerald-700">{field.label}</span>
                  </div>
                ))}
                {mapping.unmatched.map((header) => (
                  <div key={header} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="text-slate-400">{header}</span>
                    <span className="text-slate-300">skipped — no matching field</span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Rows are appended to the table; any unmatched columns above are ignored. Missing values are left blank.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => downloadTextFile('sample-products.csv', generateSampleCsv())}
            className="text-xs text-indigo-600 hover:text-indigo-800 underline decoration-dotted"
          >
            Download sample CSV
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {stage === 'preview' && (
              <button
                onClick={handleConfirmImport}
                className="px-4 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Import {parsedRows.length.toLocaleString()} rows
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
