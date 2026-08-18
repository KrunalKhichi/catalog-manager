import { useDeferredValue, useEffect, useMemo } from 'react'
import type { ProductRecord, SortState } from '../types'
import { sortRecords } from '../utils/sort'
import { useTableStore } from '../store/useTableStore'

export interface PageView {
  /** The rows for the current page — the only ones the table ever renders. */
  pageRecords: ProductRecord[]
  /** Every matching row in sort order; what "export filtered" means. */
  sortedRecords: ProductRecord[]
  page: number
  pageCount: number
  /** 1-based inclusive bounds for "Showing 51–100 of 9,999". */
  rangeStart: number
  rangeEnd: number
  isSorting: boolean
}

/**
 * Sort → paginate, in that order: the page is a window onto the sorted
 * result set, never a slice of raw data.
 *
 * The sort key is deferred because sorting 100k rows is a few hundred ms of
 * comparator work — the header click paints immediately and the reordered
 * rows land on the next commit instead of blocking it.
 */
export function useSortedPage(
  records: ProductRecord[],
  sort: SortState,
  page: number,
  pageSize: number,
): PageView {
  const setPage = useTableStore((s) => s.setPage)
  const deferredSort = useDeferredValue(sort)

  const sortedRecords = useMemo(() => sortRecords(records, deferredSort), [records, deferredSort])

  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / pageSize))
  const safePage = Math.min(page, pageCount)

  // Deleting the tail of the list can strand the user past the last page.
  // Clamping here rather than in every caller means import, delete, filter
  // and dataset swaps all land on a valid page for free.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount, setPage])

  const pageRecords = useMemo(
    () => sortedRecords.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedRecords, safePage, pageSize],
  )

  return {
    pageRecords,
    sortedRecords,
    page: safePage,
    pageCount,
    rangeStart: sortedRecords.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, sortedRecords.length),
    isSorting: deferredSort !== sort,
  }
}
