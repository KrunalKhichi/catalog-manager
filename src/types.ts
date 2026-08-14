/**
 * Domain: Product Catalog / Inventory browser.
 *
 * A ProductRecord has a fixed superset of 60 possible fields. Not every
 * field is shown by default — which columns are *visible* is a runtime,
 * user-controlled setting (see ColumnVisibilityPanel), independent of how
 * many fields actually exist on each row. This is what lets "column count"
 * be a real, live-adjustable dimension (10 to 60) rather than something
 * baked into the data generator.
 */
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
  /** Options for enum-type fields */
  options?: string[]
  /** Approximate rendered column width in px */
  width: number
  /** Shown by default when the app first loads */
  defaultVisible: boolean
  /** Included in the compact "Add record" form; the rest live under "Advanced" */
  core?: boolean
  /** Required in the add-record form */
  required?: boolean
  /** Sortable / filterable as a number range instead of plain text */
  numeric?: boolean
}

// A product record is a loosely-typed bag of the 60 declared fields.
// Using Record<string, unknown> (rather than 60 named optional props) keeps
// the table, CSV importer, and form generator schema-driven: one field list
// drives generation, columns, filtering, and the add form.
export type ProductRecord = {
  id: string
} & Record<string, string | number | boolean | null>

export type SortDirection = 'asc' | 'desc' | false
