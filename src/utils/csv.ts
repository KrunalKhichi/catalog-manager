import { FIELD_SCHEMA } from '../data/schema'
import type { FieldDef } from '../types'

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Every field can be matched by its schema key OR its human label
// ("stockQty" or "Stock Qty" both resolve), so hand-authored CSVs work
// as naturally as ones exported from this same app.
const HEADER_LOOKUP: Map<string, FieldDef> = new Map()
for (const field of FIELD_SCHEMA) {
  HEADER_LOOKUP.set(normalize(field.key), field)
  HEADER_LOOKUP.set(normalize(field.label), field)
}

export interface HeaderMapping {
  matched: { header: string; field: FieldDef }[]
  unmatched: string[]
}

export function mapHeaders(headers: string[]): HeaderMapping {
  const matched: { header: string; field: FieldDef }[] = []
  const unmatched: string[] = []
  for (const header of headers) {
    const field = HEADER_LOOKUP.get(normalize(header))
    if (field) matched.push({ header, field })
    else unmatched.push(header)
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
      return Number.isNaN(n) ? null : n
    }
    case 'boolean':
      return ['true', 'yes', '1', 'y'].includes(trimmed.toLowerCase())
    default:
      return trimmed
  }
}

export function generateSampleCsv(): string {
  const fields = FIELD_SCHEMA.filter((f) => f.core)
  const header = fields.map((f) => f.key).join(',')
  const sampleRows = [
    ['SKU-SAMPLE01', 'Nova Trainer 12', 'Footwear', 'Kestrel', '89.99', '240', 'Black', 'Active'],
    ['SKU-SAMPLE02', 'Aero Backpack 44', 'Apparel', 'Vantage', '54.50', '95', 'Navy', 'Draft'],
  ]
  const lines = sampleRows.map((row) => row.join(','))
  return [header, ...lines].join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
