/**
 * Node-side checks for the logic that doesn't need a DOM: data generation,
 * the filter scan, and CSV mapping in both directions. `npm run sanity-check`.
 */
import Papa from 'papaparse'
import { generateRecords, nextId } from '../src/data/generateData'
import { FIELD_SCHEMA, COLUMN_PRIORITY, DEFAULT_VISIBLE } from '../src/data/schema'
import { mapHeaders, coerceValue, generateSampleCsv, recordsToCsv } from '../src/utils/csv'
import { sortRecords, nextSortState } from '../src/utils/sort'
import { validateRows } from '../src/utils/csvValidate'

let failures = 0

function check(cond: boolean, msg: string) {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${msg}`)
  if (!cond) failures++
}

console.log('\n— schema —')
const FIELD_COUNT = FIELD_SCHEMA.length
check(FIELD_COUNT === 60, `schema declares 60 fields (${FIELD_COUNT})`)
check(new Set(FIELD_SCHEMA.map((f) => f.key)).size === FIELD_COUNT, 'field keys are unique')
check(COLUMN_PRIORITY.length === FIELD_COUNT, 'column presets can reach every field')
check(new Set(COLUMN_PRIORITY).size === FIELD_COUNT, 'column priority has no duplicates')
check(
  DEFAULT_VISIBLE.every((k, i) => COLUMN_PRIORITY[i] === k),
  'the default columns are the first preset prefix',
)
check(
  FIELD_SCHEMA.every((f) => f.type !== 'enum' || (f.options?.length ?? 0) > 0),
  'every enum field has options',
)

console.log('\n— generation at scale —')
const t0 = performance.now()
const rows = generateRecords(100_000)
const genMs = performance.now() - t0
console.log(`      generateRecords(100000) took ${genMs.toFixed(0)}ms`)
check(rows.length === 100_000, 'generates the requested row count')
check(new Set(rows.map((r) => r.id)).size === rows.length, 'generated ids are unique')
check(
  FIELD_SCHEMA.every((f) => f.key in rows[0]),
  'every generated row carries all 60 fields',
)
check(generateRecords(50)[7].sku === generateRecords(50)[7].sku, 'the same seed produces the same data')

console.log('\n— generated data holds together —')
const sample = rows.slice(0, 5000)
check(
  sample.every((r) => String(r.supplierEmail).includes(String(r.supplier).toLowerCase().replace(/[^a-z]/g, ''))),
  'supplierEmail belongs to the row’s own supplier',
)
check(
  sample.every((r) => r.discontinued === (r.status === 'Discontinued')),
  'the discontinued flag agrees with status',
)
check(sample.every((r) => r.isOnSale || r.discountPct === 0), 'only on-sale rows carry a discount')
check(
  sample.every((r) => r.rating === null || (Number(r.rating) >= 0 && Number(r.rating) <= 5)),
  'ratings sit in 0–5 or are absent',
)
check(sample.every((r) => Number(r.cost) < Number(r.price)), 'cost is always below price')
check(sample.some((r) => r.rating === null), 'some rows have no rating, so empty cells get exercised')

console.log('\n— ids survive delete-then-add —')
// Ids used to come from records.length, which repeats an id in use the
// moment a row in the middle is deleted. They come off a counter now.
let seq = 10_000
const minted = [nextId(seq++), nextId(seq++), nextId(seq++)]
check(new Set(minted).size === 3, `consecutive ids differ (${minted.join(', ')})`)
check(minted[0] === 'PRD-010001', `ids keep the padded format (${minted[0]})`)

console.log('\n— filter scan —')
const SEARCHABLE = ['sku', 'name', 'brand', 'category', 'subcategory', 'supplier', 'barcode', 'tags', 'warehouse', 'color']
const blobs = rows.map((r) => SEARCHABLE.map((k) => r[k] ?? '').join(' ').toLowerCase())
const t1 = performance.now()
const hits = blobs.reduce((n, b) => (b.includes('nova') ? n + 1 : n), 0)
const scanMs = performance.now() - t1
console.log(`      substring scan over 100000 rows took ${scanMs.toFixed(0)}ms, ${hits} matches`)
check(scanMs < 200, 'a full scan stays under 200ms')
check(hits > 0, 'the scan actually matches something')

console.log('\n— CSV import —')
const { matched, unmatched } = mapHeaders(['SKU', 'Product Name', 'stock_qty', 'totally_unknown'])
check(matched.length === 3, `key, label and snake_case headers all resolve (${matched.length}/3)`)
check(unmatched[0] === 'totally_unknown', 'unknown headers are reported, not silently dropped')
check(mapHeaders(['sku', 'SKU']).matched.length === 1, 'a duplicate header maps once instead of overwriting')

const price = FIELD_SCHEMA.find((f) => f.key === 'price')!
const flag = FIELD_SCHEMA.find((f) => f.key === 'isFeatured')!
check(coerceValue(price, '19.99') === 19.99, 'numeric strings become numbers')
check(coerceValue(price, '') === null, 'blank numeric cells become null')
check(coerceValue(price, 'n/a') === null, 'unparseable numbers become null rather than NaN')
check(coerceValue(flag, 'YES') === true, '"YES" reads as true')
check(coerceValue(flag, '') === false, 'blank booleans read as false')

console.log('\n— CSV template round-trips —')
// The template shipped a header row of 9 columns against data rows of 8,
// so every value after `brand` landed in the wrong field on import.
const template = Papa.parse<Record<string, string>>(generateSampleCsv(), { header: true, skipEmptyLines: true })
const templateHeaders = template.meta.fields ?? []
const coreCount = FIELD_SCHEMA.filter((f) => f.core).length
check(templateHeaders.length === coreCount, `template covers every core field (${templateHeaders.length}/${coreCount})`)
check(mapHeaders(templateHeaders).unmatched.length === 0, 'every template header maps back to a field')
check(
  template.data.every((row) => Object.keys(row).length === templateHeaders.length),
  'every template row has one value per header',
)
check(template.data[0].category === 'Footwear', `category lands in the category column (${template.data[0].category})`)
check(Number(template.data[0].price) === 89.99, `price lands in the price column (${template.data[0].price})`)

console.log('\n— CSV export —')
const exported = recordsToCsv(rows.slice(0, 3), ['id', 'name', 'description', 'price'])
const reparsed = Papa.parse<Record<string, string>>(exported, { header: true, skipEmptyLines: true })
check(reparsed.data.length === 3, 'exported rows survive a re-parse')
check(reparsed.data[0].id === rows[0].id, 'ids round-trip')
check(
  reparsed.data[0].description === rows[0].description,
  'descriptions containing commas round-trip intact',
)

console.log('\n— sorting —')
const sortT0 = performance.now()
const byPrice = sortRecords(rows, { key: 'price', direction: 'asc' })
const sortMs = performance.now() - sortT0
console.log(`      sorting 100000 rows by price took ${sortMs.toFixed(0)}ms`)
check(byPrice.length === rows.length, 'sorting keeps every row')
check(
  byPrice.every((r, i) => i === 0 || Number(byPrice[i - 1].price) <= Number(r.price)),
  'price sorts ascending',
)
check(rows[0].id !== undefined && sortRecords(rows, null) === rows, 'an unsorted table reuses the input array')

const byName = sortRecords(rows.slice(0, 500), { key: 'name', direction: 'desc' })
check(
  byName.every((r, i) => i === 0 || String(byName[i - 1].name) >= String(r.name)),
  'text sorts descending',
)

// Rows with no rating must land at the end whichever way the column is sorted.
const ratingAsc = sortRecords(rows.slice(0, 2000), { key: 'rating', direction: 'asc' })
const ratingDesc = sortRecords(rows.slice(0, 2000), { key: 'rating', direction: 'desc' })
const lastFilled = (list: typeof rows) => list.findIndex((r) => r.rating === null)
check(
  lastFilled(ratingAsc) === -1 || ratingAsc.slice(lastFilled(ratingAsc)).every((r) => r.rating === null),
  'blank ratings sort last ascending',
)
check(
  lastFilled(ratingDesc) === -1 || ratingDesc.slice(lastFilled(ratingDesc)).every((r) => r.rating === null),
  'blank ratings sort last descending',
)

check(nextSortState(null, 'price')?.direction === 'asc', 'first click sorts ascending')
check(nextSortState({ key: 'price', direction: 'asc' }, 'price')?.direction === 'desc', 'second click sorts descending')
check(nextSortState({ key: 'price', direction: 'desc' }, 'price') === null, 'third click clears the sort')
check(nextSortState({ key: 'price', direction: 'desc' }, 'sku')?.key === 'sku', 'a different column starts over ascending')

console.log('\n— pagination arithmetic —')
// The same expressions the table uses to turn a page number into a slice.
const pageOf = (total: number, size: number, page: number) => {
  const pageCount = Math.max(1, Math.ceil(total / size))
  const safe = Math.min(page, pageCount)
  return { pageCount, safe, start: total === 0 ? 0 : (safe - 1) * size + 1, end: Math.min(safe * size, total) }
}
check(pageOf(10_000, 50, 1).pageCount === 200, '10,000 rows at 50 per page is 200 pages')
check(pageOf(10_000, 50, 1).start === 1 && pageOf(10_000, 50, 1).end === 50, 'page 1 shows 1–50')
check(pageOf(9_999, 50, 200).end === 9_999, 'the last page stops at the final row')
check(pageOf(9_999, 50, 999).safe === 200, 'a page past the end clamps to the last page')
check(pageOf(0, 50, 3).pageCount === 1 && pageOf(0, 50, 3).end === 0, 'an empty result set still has one page')

console.log('\n— CSV validation —')
const validationHeaders = ['sku', 'name', 'category', 'price', 'stockQty', 'status', 'rating', 'createdAt']
const validationMapping = mapHeaders(validationHeaders)
const badRows = [
  { sku: 'SKU-A', name: 'Fine', category: 'Apparel', price: '10', stockQty: '5', status: 'Active', rating: '4', createdAt: '2024-01-01' },
  { sku: 'SKU-B', name: 'Bad price', category: 'Apparel', price: 'abc', stockQty: '5', status: 'Active', rating: '4', createdAt: '2024-01-01' },
  { sku: '', name: 'No sku', category: 'Apparel', price: '10', stockQty: '5', status: 'Active', rating: '4', createdAt: '2024-01-01' },
  { sku: 'SKU-D', name: 'Bad date', category: 'Apparel', price: '10', stockQty: '5', status: 'Active', rating: '4', createdAt: '01/02/2024' },
  { sku: 'SKU-A', name: 'Duplicate', category: 'Apparel', price: '10', stockQty: '5', status: 'Active', rating: '4', createdAt: '2024-01-01' },
  { sku: 'SKU-F', name: 'Bad rating', category: 'Apparel', price: '10', stockQty: '5', status: 'Active', rating: '9', createdAt: '2024-01-01' },
  { sku: 'SKU-G', name: 'Odd warehouse', category: 'Nonesuch', price: '10', stockQty: '5', status: 'Active', rating: '4', createdAt: '2024-01-01' },
]

const validation = await validateRows(badRows, validationMapping, new Set(['SKU-EXISTING']), () => {})
check(validation.errorCount === 5, `five rows are rejected (${validation.errorCount})`)
check(validation.records.length === 2, `two rows survive (${validation.records.length})`)
check(
  validation.issues.some((i) => i.row === 3 && /Invalid Price/.test(i.message)),
  'the bad price is reported against its own row number',
)
check(
  validation.issues.some((i) => i.row === 4 && /Missing SKU/.test(i.message)),
  'a missing SKU is reported',
)
check(
  validation.issues.some((i) => i.row === 5 && /Invalid date/.test(i.message)),
  'a non-ISO date is reported',
)
check(
  validation.issues.some((i) => i.row === 6 && /Duplicate SKU/.test(i.message)),
  'a duplicate SKU inside the file is reported',
)
check(
  validation.issues.some((i) => i.row === 7 && /above 5/.test(i.message)),
  'a rating above 5 is reported',
)
check(
  validation.issues.some((i) => i.row === 8 && i.level === 'warning'),
  'an unknown enum value warns rather than failing the row',
)
check(validation.warningCount === 1, `warning rows still import (${validation.warningCount})`)

const collision = await validateRows(
  [badRows[0]],
  validationMapping,
  new Set(['SKU-A']),
  () => {},
)
check(
  collision.records.length === 1 && collision.issues.some((i) => /already exists/.test(i.message)),
  'a SKU that already exists warns but still imports',
)

let progressCalls = 0
await validateRows(badRows, validationMapping, new Set(), () => progressCalls++)
check(progressCalls > 0, 'validation reports progress')


// The strongest guard against validation rules that contradict the schema:
// export real rows and feed them straight back through the importer.
const roundTripKeys = FIELD_SCHEMA.map((f) => f.key)
const roundTripCsv = recordsToCsv(rows.slice(0, 500), roundTripKeys)
const roundTripRows = Papa.parse<Record<string, string>>(roundTripCsv, { header: true, skipEmptyLines: true }).data
const roundTrip = await validateRows(roundTripRows, mapHeaders(roundTripKeys), new Set(), () => {})
check(
  roundTrip.errorCount === 0,
  `generated rows pass their own validator (${roundTrip.errorCount} rejected${
    roundTrip.errorCount ? `: ${roundTrip.issues.filter((i) => i.level === 'error')[0].message}` : ''
  })`,
)
check(roundTrip.records.length === 500, `every exported row re-imports (${roundTrip.records.length}/500)`)
check(
  FIELD_SCHEMA.filter((f) => f.integer).every((f) => rows.every((r) => Number.isInteger(r[f.key]))),
  'every field flagged as an integer really holds whole numbers',
)
check(
  FIELD_SCHEMA.every((f) => !f.integer || f.numeric),
  'integer fields are also numeric',
)


console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`)
process.exit(failures === 0 ? 0 : 1)
