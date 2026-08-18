import type { FieldDef, ProductRecord } from '../types'
import { coerceValue, type HeaderMapping } from './csv'

export interface RowIssue {
  /** 1-based row number as the user sees it in a spreadsheet (header is row 1). */
  row: number
  message: string
  level: 'error' | 'warning'
}

export interface ValidationResult {
  /** Only rows with no errors — warnings still import. */
  records: Omit<ProductRecord, 'id'>[]
  issues: RowIssue[]
  validCount: number
  warningCount: number
  errorCount: number
}

const MAX_RATING = 5
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** Rows per slice between yields — big enough to be fast, small enough to keep frames flowing. */
const CHUNK = 2000

function checkField(
  field: FieldDef,
  raw: string | undefined,
  row: number,
  issues: RowIssue[],
): boolean {
  const text = (raw ?? '').trim()

  if (text === '') {
    if (field.required) {
      issues.push({ row, message: `Missing ${field.label}`, level: 'error' })
      return false
    }
    return true
  }

  if (field.numeric) {
    const n = Number(text)
    if (!Number.isFinite(n)) {
      issues.push({ row, message: `Invalid ${field.label} — “${text}” is not a number`, level: 'error' })
      return false
    }
    if (n < 0) {
      issues.push({ row, message: `Invalid ${field.label} — cannot be negative`, level: 'error' })
      return false
    }
    if (field.type === 'rating' && n > MAX_RATING) {
      issues.push({ row, message: `Invalid Rating — ${n} is above ${MAX_RATING}`, level: 'error' })
      return false
    }
    if (field.integer && !Number.isInteger(n)) {
      issues.push({ row, message: `Invalid ${field.label} — must be a whole number`, level: 'error' })
      return false
    }
    return true
  }

  if (field.type === 'date' && (!ISO_DATE.test(text) || Number.isNaN(Date.parse(text)))) {
    issues.push({ row, message: `Invalid date in ${field.label} — expected YYYY-MM-DD`, level: 'error' })
    return false
  }

  // An unrecognised enum value is imported as-is: the catalogue may legitimately
  // gain a new warehouse before the schema hears about it.
  if (field.type === 'enum' && field.options && !field.options.includes(text)) {
    issues.push({ row, message: `Unknown ${field.label} “${text}” — imported as typed`, level: 'warning' })
  }

  return true
}

/**
 * Validates and coerces parsed CSV rows in slices, yielding to the event loop
 * between them so a 100k-row file reports progress instead of freezing the tab.
 * Papa already parsed off-thread; this is the only main-thread pass over the file.
 */
export async function validateRows(
  rows: Record<string, string>[],
  mapping: HeaderMapping,
  existingSkus: Set<string>,
  onProgress: (done: number) => void,
): Promise<ValidationResult> {
  const issues: RowIssue[] = []
  const records: Omit<ProductRecord, 'id'>[] = []
  const seenSkus = new Set<string>()
  let warningRows = 0
  let errorRows = 0

  for (let start = 0; start < rows.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, rows.length)

    for (let i = start; i < end; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +1 for 0-based index, +1 for the header line
      const before = issues.length
      let ok = true

      for (const { header, field } of mapping.matched) {
        if (!checkField(field, row[header], rowNumber, issues)) ok = false
      }

      const skuHeader = mapping.matched.find((m) => m.field.key === 'sku')?.header
      const sku = skuHeader ? (row[skuHeader] ?? '').trim() : ''
      if (sku !== '') {
        if (seenSkus.has(sku)) {
          issues.push({ row: rowNumber, message: `Duplicate SKU ${sku} within this file`, level: 'error' })
          ok = false
        } else {
          seenSkus.add(sku)
          if (existingSkus.has(sku)) {
            issues.push({ row: rowNumber, message: `SKU ${sku} already exists — imported as a new record`, level: 'warning' })
          }
        }
      }

      if (!ok) {
        errorRows++
        continue
      }
      if (issues.length > before) warningRows++

      records.push(
        Object.fromEntries(
          mapping.matched.map(({ header, field }) => [field.key, coerceValue(field, row[header])]),
        ) as Omit<ProductRecord, 'id'>,
      )
    }

    onProgress(end)
    if (end < rows.length) await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return {
    records,
    issues,
    validCount: records.length - warningRows,
    warningCount: warningRows,
    errorCount: errorRows,
  }
}
