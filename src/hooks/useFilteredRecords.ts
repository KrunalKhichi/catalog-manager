import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProductRecord } from '../types'
import type { ColumnFilters } from '../store/useTableStore'

interface FilterResult {
  filteredRecords: ProductRecord[]
  matchedCount: number
  isFiltering: boolean
}

const DEBOUNCE_MS = 120

/**
 * Runs search + filtering in a dedicated Web Worker so a 100k-row table
 * never blocks the main thread (and therefore input responsiveness / scroll)
 * while the user is typing into the search box. The worker holds its own
 * copy of the dataset and is re-synced whenever `records` changes identity
 * (add / delete / CSV import / regenerate).
 */
export function useFilteredRecords(
  records: ProductRecord[],
  searchQuery: string,
  filters: ColumnFilters,
): FilterResult {
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const recordsById = useRef<Map<string, ProductRecord>>(new Map())
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const syncedRef = useRef(false)

  // Spin up the worker once.
  useEffect(() => {
    const worker = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  // Keep an id -> record lookup for cheap re-hydration of worker results.
  useEffect(() => {
    const map = new Map<string, ProductRecord>()
    for (const r of records) map.set(r.id, r)
    recordsById.current = map
  }, [records])

  // Re-sync the worker's dataset copy whenever records change identity.
  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return
    syncedRef.current = false
    worker.postMessage({ type: 'sync', records })
  }, [records])

  // Debounced filter requests.
  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return

    setIsFiltering(true)
    const handle = window.setTimeout(() => {
      const requestId = ++requestIdRef.current
      const onMessage = (e: MessageEvent) => {
        const msg = e.data
        if (msg.type === 'synced') return
        if (msg.type === 'result' && msg.requestId === requestId) {
          setFilteredIds(msg.ids)
          setIsFiltering(false)
          worker.removeEventListener('message', onMessage)
        }
      }
      worker.addEventListener('message', onMessage)
      worker.postMessage({ type: 'filter', requestId, query: searchQuery, filters })
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
    // records intentionally included so a fresh sync always gets a fresh filter pass
  }, [searchQuery, filters, records])

  const filteredRecords = useMemo(() => {
    if (filteredIds === null) return records
    const map = recordsById.current
    const out: ProductRecord[] = []
    for (const id of filteredIds) {
      const r = map.get(id)
      if (r) out.push(r)
    }
    return out
  }, [filteredIds, records])

  return {
    filteredRecords,
    matchedCount: filteredIds === null ? records.length : filteredIds.length,
    isFiltering,
  }
}
