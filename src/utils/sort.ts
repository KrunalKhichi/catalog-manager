import type { FieldDef, ProductRecord, SortState } from '../types'
import { FIELD_MAP } from '../data/schema'

// sensitivity 'base' so "amber" and "Amber" land together; numeric so
// WH-EAST-02 sorts before WH-EAST-10.
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/** Missing values sort last in both directions — a blank isn't "the smallest". */
export function comparator(field: FieldDef, direction: 'asc' | 'desc') {
  const sign = direction === 'asc' ? 1 : -1
  const { key, numeric } = field
  return (a: ProductRecord, b: ProductRecord) => {
    const x = a[key]
    const y = b[key]
    const xEmpty = x === null || x === undefined || x === ''
    const yEmpty = y === null || y === undefined || y === ''
    if (xEmpty || yEmpty) return xEmpty && yEmpty ? 0 : xEmpty ? 1 : -1
    if (numeric) return sign * (Number(x) - Number(y))
    return sign * collator.compare(String(x), String(y))
  }
}

/** Returns the input array untouched when there's nothing to sort by. */
export function sortRecords(records: ProductRecord[], sort: SortState): ProductRecord[] {
  if (!sort) return records
  const field = FIELD_MAP[sort.key]
  if (!field) return records
  return records.slice().sort(comparator(field, sort.direction))
}

/** asc → desc → unsorted, so a third click on a header clears the sort. */
export function nextSortState(current: SortState, key: string): SortState {
  if (current?.key !== key) return { key, direction: 'asc' }
  return current.direction === 'asc' ? { key, direction: 'desc' } : null
}
