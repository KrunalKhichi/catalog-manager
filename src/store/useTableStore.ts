import { create } from 'zustand'
import type { ProductRecord } from '../types'
import { FIELD_SCHEMA } from '../data/schema'
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
   * Monotonically increasing counter used to mint new record ids. Deriving
   * ids from `records.length` looks fine until you delete a row and then
   * add one — the length shrinks and the "new" id can collide with an id
   * still in use. This counter only ever goes up, including across
   * deletes, so ids stay unique for the life of the session.
   */
  recordSeq: number
  lastToast: { id: number; message: string; tone: 'success' | 'error' } | null

  regenerateDataset: (count: number) => void
  addRecord: (partial: Omit<ProductRecord, 'id'>) => ProductRecord
  bulkAddRecords: (partials: Omit<ProductRecord, 'id'>[]) => number
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

const DEFAULT_VISIBLE = FIELD_SCHEMA.filter((f) => f.defaultVisible).map((f) => f.key)
const INITIAL_SIZE = 10000

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

  addRecord: (partial) => {
    const seq = get().recordSeq
    const record: ProductRecord = { id: nextId(seq), ...partial }
    set((state) => ({ records: [record, ...state.records], recordSeq: seq + 1 }))
    return record
  },

  bulkAddRecords: (partials) => {
    const startSeq = get().recordSeq
    const withIds: ProductRecord[] = partials.map((p, i) => ({ id: nextId(startSeq + i), ...p }))
    set((state) => ({ records: [...withIds, ...state.records], recordSeq: startSeq + partials.length }))
    return withIds.length
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
    set({ lastToast: { id: Date.now() + Math.random(), message, tone } }),
}))
