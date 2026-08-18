/// <reference lib="webworker" />
import type { ProductRecord } from '../types'
import type { Filters } from '../store/useTableStore'

// Text search runs against a lowercased blob per row, built once on sync.
// Doing it per keystroke instead would mean re-lowercasing and re-joining
// ten fields across every row on every character.
const SEARCHABLE_KEYS = ['sku', 'name', 'brand', 'category', 'subcategory', 'supplier', 'barcode', 'tags', 'warehouse', 'color']

let records: ProductRecord[] = []
let blobs: string[] = []

type InMessage =
  | { type: 'sync'; records: ProductRecord[] }
  | { type: 'filter'; requestId: number; query: string; filters: Filters }

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

/**
 * ISO `yyyy-mm-dd` compares correctly as a string, so no Date objects are
 * built per row — that alone is the difference between a snappy and a
 * sluggish scan at 100k rows.
 */
function outsideDateRange(value: unknown, from: string, to: string): boolean {
  if (from === '' && to === '') return false
  if (typeof value !== 'string' || value === '') return true
  return (from !== '' && value < from) || (to !== '' && value > to)
}

/** Empty selection means "any" — building the Set once beats an includes() per row. */
function facet(values: string[]): Set<string> | null {
  return values.length > 0 ? new Set(values) : null
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
  const category = facet(filters.category)
  const brand = facet(filters.brand)
  const status = facet(filters.status)
  const warehouse = facet(filters.warehouse)
  const priceMin = numberOrNull(filters.priceMin)
  const priceMax = numberOrNull(filters.priceMax)
  const stockMin = numberOrNull(filters.stockMin)
  const stockMax = numberOrNull(filters.stockMax)
  const ratingMin = numberOrNull(filters.ratingMin)
  const ratingMax = numberOrNull(filters.ratingMax)

  const ids: string[] = []
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    if (q !== '' && !blobs[i].includes(q)) continue
    if (category && !category.has(String(r.category))) continue
    if (brand && !brand.has(String(r.brand))) continue
    if (status && !status.has(String(r.status))) continue
    if (warehouse && !warehouse.has(String(r.warehouse))) continue
    if (outsideRange(r.price, priceMin, priceMax)) continue
    if (outsideRange(r.stockQty, stockMin, stockMax)) continue
    if (outsideRange(r.rating, ratingMin, ratingMax)) continue
    if (outsideDateRange(r.createdAt, filters.createdFrom, filters.createdTo)) continue
    ids.push(r.id)
  }

  post({ type: 'result', requestId, ids })
}

export {}
