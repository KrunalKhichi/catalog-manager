/// <reference lib="webworker" />
import type { ProductRecord } from '../types'
import type { ColumnFilters } from '../store/useTableStore'

// Text search runs against a lowercased blob per row, built once on sync.
// Doing it per keystroke instead would mean re-lowercasing and re-joining
// ten fields across every row on every character.
const SEARCHABLE_KEYS = ['sku', 'name', 'brand', 'category', 'subcategory', 'supplier', 'barcode', 'tags', 'warehouse', 'color']

let records: ProductRecord[] = []
let blobs: string[] = []

type InMessage =
  | { type: 'sync'; records: ProductRecord[] }
  | { type: 'filter'; requestId: number; query: string; filters: ColumnFilters }

function post(message: unknown) {
  ;(self as unknown as Worker).postMessage(message)
}

function numberOrNull(raw: string): number | null {
  if (raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Rows with no value never satisfy a range — an unknown price isn't "under $50". */
function outsideRange(value: unknown, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return false
  if (typeof value !== 'number') return true
  return (min !== null && value < min) || (max !== null && value > max)
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data

  if (msg.type === 'sync') {
    records = msg.records
    blobs = records.map((r) => SEARCHABLE_KEYS.map((k) => r[k] ?? '').join(' ').toLowerCase())
    return
  }

  const { requestId, query, filters } = msg
  const q = query.trim().toLowerCase()
  const priceMin = numberOrNull(filters.priceMin)
  const priceMax = numberOrNull(filters.priceMax)
  const stockMin = numberOrNull(filters.stockMin)
  const stockMax = numberOrNull(filters.stockMax)

  const ids: string[] = []
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    if (q !== '' && !blobs[i].includes(q)) continue
    if (filters.category && r.category !== filters.category) continue
    if (filters.status && r.status !== filters.status) continue
    if (outsideRange(r.price, priceMin, priceMax)) continue
    if (outsideRange(r.stockQty, stockMin, stockMax)) continue
    ids.push(r.id)
  }

  post({ type: 'result', requestId, ids })
}

export {}
