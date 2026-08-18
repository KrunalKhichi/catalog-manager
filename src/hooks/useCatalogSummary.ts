import { useMemo } from 'react'
import type { ProductRecord } from '../types'
import { ENUM_OPTIONS } from '../data/schema'
import type { MultiKey } from '../store/useTableStore'

/** Below this, a live product is worth flagging for reorder. */
export const LOW_STOCK_THRESHOLD = 50

export interface CatalogSummary {
  total: number
  active: number
  lowStock: number
  discontinued: number
  facetOptions: Record<MultiKey, string[]>
  /** sku → id, for the duplicate check in the record form. */
  skuIndex: Map<string, string>
}

/**
 * One pass over the whole dataset produces the summary cards, the brand
 * facet list and the SKU index. Three separate `useMemo`s would mean three
 * full scans of 100k rows every time a record changes.
 *
 * Counts come from the raw records, not the filtered view — the cards
 * describe the catalogue, and a card that changed whenever you typed in the
 * search box would be describing the search instead.
 */
export function useCatalogSummary(records: ProductRecord[]): CatalogSummary {
  return useMemo(() => {
    let active = 0
    let lowStock = 0
    let discontinued = 0
    const brands = new Set<string>()
    const skuIndex = new Map<string, string>()

    for (const record of records) {
      if (record.status === 'Active') {
        active++
        if (typeof record.stockQty === 'number' && record.stockQty < LOW_STOCK_THRESHOLD) lowStock++
      } else if (record.status === 'Discontinued') {
        discontinued++
      }
      if (typeof record.brand === 'string' && record.brand !== '') brands.add(record.brand)
      if (typeof record.sku === 'string' && record.sku !== '' && !skuIndex.has(record.sku)) {
        skuIndex.set(record.sku, record.id)
      }
    }

    return {
      total: records.length,
      active,
      lowStock,
      discontinued,
      facetOptions: {
        category: ENUM_OPTIONS.category,
        status: ENUM_OPTIONS.status,
        warehouse: ENUM_OPTIONS.warehouse,
        // Brand is free text in the schema, so its options have to come from
        // the data — imported rows can introduce brands the app never shipped.
        brand: [...brands].sort(),
      },
      skuIndex,
    }
  }, [records])
}
