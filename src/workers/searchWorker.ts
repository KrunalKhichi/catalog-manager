/// <reference lib="webworker" />
import type { ProductRecord } from '../types'
import type { ColumnFilters } from '../store/useTableStore'

// The worker keeps its own copy of the dataset plus a precomputed,
// lowercased "search blob" per row (a handful of the most human-searched
// fields, joined). Precomputing on `sync` means every keystroke only pays
// for a substring scan, not for lowercasing/concatenating 60 fields again.
let records: ProductRecord[] = []
let blobs: string[] = []

const SEARCHABLE_KEYS = ['sku', 'name', 'brand', 'category', 'subcategory', 'supplier', 'barcode', 'tags', 'warehouse', 'color']

function buildBlob(r: ProductRecord): string {
  return SEARCHABLE_KEYS.map((k) => (r[k] ?? '')).join(' ').toLowerCase()
}

type InMessage =
  | { type: 'sync'; records: ProductRecord[] }
  | { type: 'filter'; requestId: number; query: string; filters: ColumnFilters }

type OutMessage =
  | { type: 'synced'; count: number }
  | { type: 'result'; requestId: number; ids: string[]; matchedCount: number }

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data
  if (msg.type === 'sync') {
    records = msg.records
    blobs = new Array(records.length)
    for (let i = 0; i < records.length; i++) blobs[i] = buildBlob(records[i])
    const out: OutMessage = { type: 'synced', count: records.length }
    ;(self as unknown as Worker).postMessage(out)
    return
  }

  if (msg.type === 'filter') {
    const { requestId, query, filters } = msg
    const q = query.trim().toLowerCase()
    const hasQuery = q.length > 0
    const hasCategory = !!filters.category
    const hasStatus = !!filters.status
    const priceMin = filters.priceMin !== '' ? Number(filters.priceMin) : null
    const priceMax = filters.priceMax !== '' ? Number(filters.priceMax) : null
    const stockMin = filters.stockMin !== '' ? Number(filters.stockMin) : null
    const stockMax = filters.stockMax !== '' ? Number(filters.stockMax) : null

    const noFilterAtAll =
      !hasQuery && !hasCategory && !hasStatus && priceMin === null && priceMax === null && stockMin === null && stockMax === null

    if (noFilterAtAll) {
      const ids = records.map((r) => r.id)
      const out: OutMessage = { type: 'result', requestId, ids, matchedCount: ids.length }
      ;(self as unknown as Worker).postMessage(out)
      return
    }

    const ids: string[] = []
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      if (hasQuery && !blobs[i].includes(q)) continue
      if (hasCategory && r.category !== filters.category) continue
      if (hasStatus && r.status !== filters.status) continue
      if (priceMin !== null && (r.price as number) < priceMin) continue
      if (priceMax !== null && (r.price as number) > priceMax) continue
      if (stockMin !== null && (r.stockQty as number) < stockMin) continue
      if (stockMax !== null && (r.stockQty as number) > stockMax) continue
      ids.push(r.id)
    }
    const out: OutMessage = { type: 'result', requestId, ids, matchedCount: ids.length }
    ;(self as unknown as Worker).postMessage(out)
  }
}

export {}
