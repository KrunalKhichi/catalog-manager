import { create } from 'zustand'
import type { ProductRecord, SortState } from '../types'
import { DEFAULT_VISIBLE } from '../data/schema'
import { generateRecords, nextId } from '../data/generateData'

/**
 * Multi-select facets are arrays (empty = "any"); ranges are strings so a
 * half-typed "1" in a number input doesn't have to round-trip through NaN.
 */
export interface Filters {
  category: string[]
  brand: string[]
  status: string[]
  warehouse: string[]
  priceMin: string
  priceMax: string
  stockMin: string
  stockMax: string
  ratingMin: string
  ratingMax: string
  createdFrom: string
  createdTo: string
}

export const MULTI_KEYS = ['category', 'brand', 'status', 'warehouse'] as const
export type MultiKey = (typeof MULTI_KEYS)[number]

export const RANGE_KEYS = [
  ['priceMin', 'priceMax'],
  ['stockMin', 'stockMax'],
  ['ratingMin', 'ratingMax'],
  ['createdFrom', 'createdTo'],
] as const
export type RangeKey = (typeof RANGE_KEYS)[number][number]

export const EMPTY_FILTERS: Filters = {
  category: [],
  brand: [],
  status: [],
  warehouse: [],
  priceMin: '',
  priceMax: '',
  stockMin: '',
  stockMax: '',
  ratingMin: '',
  ratingMax: '',
  createdFrom: '',
  createdTo: '',
}

/** True when the filter set actually narrows anything — drives the worker round trip. */
export function hasActiveFilters(filters: Filters): boolean {
  return (
    MULTI_KEYS.some((k) => filters[k].length > 0) ||
    RANGE_KEYS.some(([min, max]) => filters[min] !== '' || filters[max] !== '')
  )
}

export function countActiveFilters(filters: Filters): number {
  return (
    MULTI_KEYS.filter((k) => filters[k].length > 0).length +
    RANGE_KEYS.filter(([min, max]) => filters[min] !== '' || filters[max] !== '').length
  )
}

export interface SavedView {
  id: string
  name: string
  searchQuery: string
  filters: Filters
  sort: SortState
  visibleColumns: string[]
  pageSize: number
}

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
  /** Optional single action, used for "Undo" after a delete. */
  action?: { label: string; run: () => void }
}

export const PAGE_SIZES = [25, 50, 100, 250]
export const DEFAULT_PAGE_SIZE = 50
const INITIAL_SIZE = 10_000
const VIEWS_KEY = 'catalog-manager.saved-views'

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    // Anything hand-edited into localStorage gets dropped rather than crashing boot.
    return Array.isArray(parsed) ? (parsed as SavedView[]).filter((v) => v && typeof v.name === 'string') : []
  } catch {
    return []
  }
}

function persistViews(views: SavedView[]) {
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views))
  } catch {
    // Private mode / quota. Views stay in memory for the session.
  }
}

interface TableState {
  records: ProductRecord[]
  selectedIds: Set<string>
  searchQuery: string
  filters: Filters
  sort: SortState
  page: number
  pageSize: number
  visibleColumns: string[]
  /** The size the current dataset was generated at, not its live row count. */
  datasetSize: number
  /**
   * Ids come from here, never from `records.length` — length shrinks on
   * delete and the next "new" id would collide with one still in use.
   */
  recordSeq: number
  savedViews: SavedView[]
  toast: Toast | null

  regenerateDataset: (count: number) => void
  addRecord: (partial: Omit<ProductRecord, 'id'>) => ProductRecord
  bulkAddRecords: (partials: Omit<ProductRecord, 'id'>[]) => number
  updateRecord: (id: string, patch: Omit<ProductRecord, 'id'>) => ProductRecord | null
  patchRecords: (ids: string[], patch: Record<string, string | number | boolean | null>) => number
  deleteRecords: (ids: string[]) => () => void
  toggleSelected: (id: string) => void
  selectMany: (ids: string[]) => void
  deselectMany: (ids: string[]) => void
  clearSelection: () => void
  setSearchQuery: (q: string) => void
  setFilters: (partial: Partial<Filters>) => void
  resetFilters: () => void
  clearSearchAndFilters: () => void
  setSort: (sort: SortState) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setVisibleColumns: (keys: string[]) => void
  applyView: (view: SavedView) => void
  saveView: (name: string) => void
  deleteView: (id: string) => void
  notify: (message: string, tone?: 'success' | 'error', action?: Toast['action']) => void
  dismissToast: () => void
}

export const useTableStore = create<TableState>((set, get) => ({
  records: generateRecords(INITIAL_SIZE),
  selectedIds: new Set(),
  searchQuery: '',
  filters: EMPTY_FILTERS,
  sort: null,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  visibleColumns: DEFAULT_VISIBLE,
  datasetSize: INITIAL_SIZE,
  recordSeq: INITIAL_SIZE,
  savedViews: loadViews(),
  toast: null,

  regenerateDataset: (count) =>
    set({
      records: generateRecords(count),
      selectedIds: new Set(),
      datasetSize: count,
      recordSeq: count,
      page: 1,
    }),

  // `id` last: a CSV column called "id" must not be able to overwrite the
  // one we just minted.
  addRecord: (partial) => {
    const seq = get().recordSeq
    const record: ProductRecord = { ...partial, id: nextId(seq) }
    set((state) => ({ records: [record, ...state.records], recordSeq: seq + 1 }))
    return record
  },

  bulkAddRecords: (partials) => {
    const startSeq = get().recordSeq
    const withIds: ProductRecord[] = partials.map((p, i) => ({ ...p, id: nextId(startSeq + i) }))
    set((state) => ({ records: [...withIds, ...state.records], recordSeq: startSeq + partials.length }))
    return withIds.length
  },

  updateRecord: (id, patch) => {
    const index = get().records.findIndex((r) => r.id === id)
    if (index === -1) return null
    const updated: ProductRecord = { ...patch, id }
    set((state) => {
      const records = state.records.slice()
      records[index] = updated
      return { records }
    })
    return updated
  },

  patchRecords: (ids, patch) => {
    const idSet = new Set(ids)
    let changed = 0
    set((state) => ({
      records: state.records.map((r) => {
        if (!idSet.has(r.id)) return r
        changed++
        return { ...r, ...patch, id: r.id }
      }),
    }))
    return changed
  },

  /**
   * Returns an undo that splices the rows back at their original indices, so
   * "Undo" restores position rather than dumping everything at the top. Edits
   * made in between are kept — only the removals are reversed.
   */
  deleteRecords: (ids) => {
    const idSet = new Set(ids)
    const removed: { index: number; record: ProductRecord }[] = []
    get().records.forEach((record, index) => {
      if (idSet.has(record.id)) removed.push({ index, record })
    })

    set((state) => ({
      records: state.records.filter((r) => !idSet.has(r.id)),
      selectedIds: new Set([...state.selectedIds].filter((id) => !idSet.has(id))),
    }))

    return () =>
      set((state) => {
        const records = state.records.slice()
        const present = new Set(records.map((r) => r.id))
        for (const { index, record } of removed) {
          if (present.has(record.id)) continue
          records.splice(Math.min(index, records.length), 0, record)
        }
        return { records }
      })
  },

  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    }),

  selectMany: (ids) => set((state) => ({ selectedIds: new Set([...state.selectedIds, ...ids]) })),

  deselectMany: (ids) =>
    set((state) => {
      const remove = new Set(ids)
      return { selectedIds: new Set([...state.selectedIds].filter((id) => !remove.has(id))) }
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  // Narrowing the result set invalidates the current page number.
  setSearchQuery: (q) => set({ searchQuery: q, page: 1 }),
  setFilters: (partial) => set((state) => ({ filters: { ...state.filters, ...partial }, page: 1 })),
  resetFilters: () => set({ filters: EMPTY_FILTERS, page: 1 }),
  clearSearchAndFilters: () => set({ filters: EMPTY_FILTERS, searchQuery: '', page: 1 }),

  setSort: (sort) => set({ sort }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setVisibleColumns: (keys) => set({ visibleColumns: keys }),

  applyView: (view) =>
    set({
      searchQuery: view.searchQuery,
      filters: { ...EMPTY_FILTERS, ...view.filters },
      sort: view.sort,
      visibleColumns: view.visibleColumns,
      pageSize: view.pageSize,
      page: 1,
    }),

  saveView: (name) =>
    set((state) => {
      const view: SavedView = {
        id: `view-${state.savedViews.length + 1}-${name.toLowerCase().replace(/\W+/g, '-')}`,
        name,
        searchQuery: state.searchQuery,
        filters: state.filters,
        sort: state.sort,
        visibleColumns: state.visibleColumns,
        pageSize: state.pageSize,
      }
      // Saving under an existing name overwrites it rather than piling up duplicates.
      const savedViews = [...state.savedViews.filter((v) => v.name !== name), view]
      persistViews(savedViews)
      return { savedViews }
    }),

  deleteView: (id) =>
    set((state) => {
      const savedViews = state.savedViews.filter((v) => v.id !== id)
      persistViews(savedViews)
      return { savedViews }
    }),

  notify: (message, tone = 'success', action) =>
    set((state) => ({ toast: { id: (state.toast?.id ?? 0) + 1, message, tone, action } })),

  dismissToast: () => set({ toast: null }),
}))
