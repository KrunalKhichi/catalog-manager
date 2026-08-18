import Papa from 'papaparse'
import { FIELD_SCHEMA } from '../data/schema'
import type { FieldDef, ProductRecord } from '../types'

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// A field matches either its schema key or its human label, so "stockQty",
// "Stock Qty" and "stock_qty" all land on the same column.
const HEADER_LOOKUP = new Map<string, FieldDef>()
for (const field of FIELD_SCHEMA) {
  HEADER_LOOKUP.set(normalize(field.key), field)
  HEADER_LOOKUP.set(normalize(field.label), field)
}

export interface HeaderMapping {
  matched: { header: string; field: FieldDef }[]
  unmatched: string[]
}

export function mapHeaders(headers: string[]): HeaderMapping {
  const matched: HeaderMapping['matched'] = []
  const unmatched: string[] = []
  const seen = new Set<string>()
  for (const header of headers) {
    const field = HEADER_LOOKUP.get(normalize(header))
    // Two headers can normalise to the same field ("SKU" and "sku"); the
    // second would silently overwrite the first, so skip it instead.
    if (field && !seen.has(field.key)) {
      seen.add(field.key)
      matched.push({ header, field })
    } else {
      unmatched.push(header)
    }
  }
  return { matched, unmatched }
}

export function coerceValue(field: FieldDef, raw: string | undefined | null): string | number | boolean | null {
  if (raw === undefined || raw === null || raw.trim() === '') return field.type === 'boolean' ? false : null
  const trimmed = raw.trim()
  switch (field.type) {
    case 'number':
    case 'currency':
    case 'rating': {
      const n = Number(trimmed)
      return Number.isFinite(n) ? n : null
    }
    case 'boolean':
      return ['true', 'yes', '1', 'y'].includes(trimmed.toLowerCase())
    default:
      return trimmed
  }
}

const SAMPLE_VALUES: Record<string, [string, string]> = {
  sku: ['SKU-FTW-004821', 'SKU-APP-011307'],
  name: ['Nova Trainer Low', 'Aero Shell Jacket'],
  category: ['Footwear', 'Apparel'],
  subcategory: ['Sneakers', 'Jackets'],
  brand: ['Kestrel', 'Vantage'],
  price: ['89.99', '154.50'],
  stockQty: ['240', '95'],
  color: ['Black', 'Navy'],
  status: ['Active', 'Draft'],
}

/** Template CSV: one column per core field, so it round-trips through the importer. */
export function generateSampleCsv(): string {
  const fields = FIELD_SCHEMA.filter((f) => f.core)
  const rows = [0, 1].map((i) =>
    Object.fromEntries(fields.map((f) => [f.key, SAMPLE_VALUES[f.key]?.[i] ?? ''])),
  )
  return Papa.unparse(rows, { columns: fields.map((f) => f.key) })
}

/** Exports the rows currently on screen, with only the columns currently shown. */
export function recordsToCsv(records: ProductRecord[], keys: string[]): string {
  return Papa.unparse(
    records.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? '']))),
    { columns: keys },
  )
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
