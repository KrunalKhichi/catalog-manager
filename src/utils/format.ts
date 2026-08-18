import type { FieldDef } from '../types'

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const number = new Intl.NumberFormat('en-US')

/** Plain-text rendering of a value, matching what the table cells show. */
export function formatValue(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  switch (field.type) {
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'currency':
      return currency.format(Number(value))
    case 'rating':
      return `${Number(value).toFixed(1)} ★`
    case 'number':
      return number.format(Number(value))
    default:
      return String(value)
  }
}
