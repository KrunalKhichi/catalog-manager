export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'rating'
  | 'url'
  | 'longtext'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  /** Starting column width in px; the user can drag it from there. */
  width: number
  defaultVisible: boolean
  /** Shown above the fold in the record form; everything else is "advanced". */
  core?: boolean
  required?: boolean
  /** Sorts and filters as a number rather than a string. */
  numeric?: boolean
  /**
   * A countable quantity, so a fractional value is invalid. Measurements and
   * percentages are `numeric` but not `integer` — 12.5 kg is a real weight.
   */
  integer?: boolean
}

// Every row carries all 60 fields; visibility is purely a display setting.
// An index signature rather than 60 named props is what keeps the table,
// importer and form generic over the schema instead of over this type.
export type ProductRecord = { id: string } & Record<string, string | number | boolean | null>

/** Null when unsorted — a third click on a header returns to that state. */
export type SortState = { key: string; direction: 'asc' | 'desc' } | null
