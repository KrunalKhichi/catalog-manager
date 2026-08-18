import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProductRecord } from '../types'
import { hasActiveFilters, type Filters } from '../store/useTableStore'

interface FilterResult {
  filteredRecords: ProductRecord[]
  matchedCount: number
  isFiltering: boolean
}

const DEBOUNCE_MS = 120

function isNarrowed(query: string, filters: Filters): boolean {
  return query.trim() !== '' || hasActiveFilters(filters)
}

/**
 * Search + filter run in a worker so a 100k-row scan never competes with
 * typing or scrolling for the main thread.
 *
 * Two things keep this cheap. The worker only hears about the dataset when
 * a filter is actually active — handing it a fresh 100k-row copy costs a
 * synchronous structured clone on *this* thread, so an untouched search box
 * should never trigger one. And with no query and no filters we skip the
 * round trip entirely and hand back the original array.
 */
export function useFilteredRecords(
  records: ProductRecord[],
  searchQuery: string,
  filters: Filters,
): FilterResult {
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const staleRef = useRef(true)
  const byId = useRef(new Map<string, ProductRecord>())
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      // Ignore anything but the newest request; earlier replies are stale.
      if (e.data.type === 'result' && e.data.requestId === requestIdRef.current) {
        setFilteredIds(e.data.ids)
        setIsFiltering(false)
      }
    }
    workerRef.current = worker
    staleRef.current = true
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    byId.current = new Map(records.map((r) => [r.id, r]))
    staleRef.current = true
  }, [records])

  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return

    if (!isNarrowed(searchQuery, filters)) {
      requestIdRef.current++ // invalidate any request still in flight
      setFilteredIds(null)
      setIsFiltering(false)
      return
    }

    setIsFiltering(true)
    const timer = window.setTimeout(() => {
      if (staleRef.current) {
        worker.postMessage({ type: 'sync', records })
        staleRef.current = false
      }
      worker.postMessage({
        type: 'filter',
        requestId: ++requestIdRef.current,
        query: searchQuery,
        filters,
      })
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [searchQuery, filters, records])

  const filteredRecords = useMemo(() => {
    if (filteredIds === null) return records
    const map = byId.current
    const out: ProductRecord[] = []
    for (const id of filteredIds) {
      const record = map.get(id)
      if (record) out.push(record)
    }
    return out
  }, [filteredIds, records])

  return {
    filteredRecords,
    matchedCount: filteredRecords.length,
    isFiltering,
  }
}
