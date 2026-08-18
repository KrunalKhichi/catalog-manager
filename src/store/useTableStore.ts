import { create } from 'zustand'
import type { ProductRecord } from '../types'
import { DEFAULT_VISIBLE } from '../data/schema'
import { generateRecords, nextId } from '../data/generateData'

export interface ColumnFilters {
  category: string
  status: string
  priceMin: string
  priceMax: string
  stockMin: string
  stockMax: string
}

export const EMPTY_FILTERS: ColumnFilters = {
  category: '',
  status: '',
  priceMin: '',
  priceMax: '',
  stockMin: '',
  stockMax: '',
}

interface TableState {
  records: ProductRecord[]
  selectedIds: Set<string>
  searchQuery: string
  filters: ColumnFilters
  visibleColumns: string[]
  datasetSize: number
  /**
   * Ids come from here, never from `records.length` — length shrinks on
   * delete and the next "new" id would collide with one still in use.
   */
  recordSeq: number
  lastToast: { id: number; message: string; tone: 'success' | 'error' } | null

  regenerateDataset: (count: number) => void
  addRecord: (partial: Omit<ProductRecord, 'id'>) => ProductRecord
  bulkAddRecords: (partials: Omit<ProductRecord, 'id'>[]) => number
  updateRecord: (id: string, patch: Omit<ProductRecord, 'id'>) => ProductRecord | null
  deleteRecords: (ids: string[]) => void
  toggleSelected: (id: string) => void
  setSelected: (ids: string[]) => void
  clearSelection: () => void
  setSearchQuery: (q: string) => void
  setFilters: (partial: Partial<ColumnFilters>) => void
  resetFilters: () => void
  setVisibleColumns: (keys: string[]) => void
  toggleColumn: (key: string) => void
  notify: (message: string, tone?: 'success' | 'error') => void
}

const INITIAL_SIZE = 10_000

export const useTableStore = create<TableState>((set, get) => ({
  records: generateRecords(INITIAL_SIZE),
  selectedIds: new Set(),
  searchQuery: '',
  filters: EMPTY_FILTERS,
  visibleColumns: DEFAULT_VISIBLE,
  datasetSize: INITIAL_SIZE,
  recordSeq: INITIAL_SIZE,
  lastToast: null,

  regenerateDataset: (count) =>
    set({
      records: generateRecords(count),
      selectedIds: new Set(),
      datasetSize: count,
      recordSeq: count,
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

  deleteRecords: (ids) => {
    const idSet = new Set(ids)
    set((state) => ({
      records: state.records.filter((r) => !idSet.has(r.id)),
      selectedIds: new Set([...state.selectedIds].filter((id) => !idSet.has(id))),
    }))
  },

  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    }),

  setSelected: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),

  resetFilters: () => set({ filters: EMPTY_FILTERS, searchQuery: '' }),

  setVisibleColumns: (keys) => set({ visibleColumns: keys }),

  toggleColumn: (key) =>
    set((state) => {
      const has = state.visibleColumns.includes(key)
      return {
        visibleColumns: has
          ? state.visibleColumns.filter((k) => k !== key)
          : [...state.visibleColumns, key],
      }
    }),

  notify: (message, tone = 'success') =>
    set((state) => ({ lastToast: { id: (state.lastToast?.id ?? 0) + 1, message, tone } })),
}))
