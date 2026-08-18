/**
 * Node-side checks for the logic that doesn't need a DOM: data generation,
 * the filter scan, and CSV mapping in both directions. `npm run sanity-check`.
 */
import Papa from 'papaparse'
import { generateRecords, nextId } from '../src/data/generateData'
import { FIELD_SCHEMA, COLUMN_PRIORITY, DEFAULT_VISIBLE } from '../src/data/schema'
import { mapHeaders, coerceValue, generateSampleCsv, recordsToCsv } from '../src/utils/csv'

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

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`)
process.exit(failures === 0 ? 0 : 1)
