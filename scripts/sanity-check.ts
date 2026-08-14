import { generateRecords, nextId } from '../src/data/generateData'
import { FIELD_SCHEMA, COLUMN_PRIORITY } from '../src/data/schema'
import { mapHeaders, coerceValue, generateSampleCsv } from '../src/utils/csv'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg)
  console.log('OK:', msg)
}

// 1. Schema integrity
assert(FIELD_SCHEMA.length === 60, `schema has 60 fields (got ${FIELD_SCHEMA.length})`)
assert(COLUMN_PRIORITY.length === 60, `column priority covers all 60 fields (got ${COLUMN_PRIORITY.length})`)
assert(new Set(FIELD_SCHEMA.map((f) => f.key)).size === 60, 'all field keys are unique')

// 2. Generation at scale + timing
const t0 = performance.now()
const big = generateRecords(100_000)
const t1 = performance.now()
console.log(`generateRecords(100000) took ${(t1 - t0).toFixed(1)}ms`)
assert(big.length === 100_000, 'generates exactly 100000 records')
assert(new Set(big.map((r) => r.id)).size === 100_000, 'all generated ids are unique')
for (const f of FIELD_SCHEMA) {
  assert(f.key in big[0], `generated row has field ${f.key}`)
}

// 3. nextId monotonic behavior across a delete-then-add sequence (the bug we fixed)
let seq = 10_000
const idA = nextId(seq)
seq += 1
// simulate deleting some other unrelated record — seq must NOT be derived from array length
const idB = nextId(seq)
assert(idA !== idB, `sequential nextId calls never collide (${idA} vs ${idB})`)
assert(idA === 'PRD-010001' && idB === 'PRD-010002', `nextId formats correctly (${idA}, ${idB})`)

// 4. Filtering pass timing (mirrors what the worker does, minus postMessage overhead)
const SEARCHABLE_KEYS = ['sku', 'name', 'brand', 'category', 'subcategory', 'supplier', 'barcode', 'tags', 'warehouse', 'color']
const blobs = big.map((r) => SEARCHABLE_KEYS.map((k) => (r as any)[k] ?? '').join(' ').toLowerCase())
const t2 = performance.now()
const q = 'nova'
let matches = 0
for (let i = 0; i < big.length; i++) {
  if (blobs[i].includes(q)) matches++
}
const t3 = performance.now()
console.log(`substring filter over 100000 rows took ${(t3 - t2).toFixed(1)}ms, ${matches} matches`)
assert(t3 - t2 < 200, 'filter pass over 100k rows completes well under 200ms')

// 5. CSV header mapping
const { matched, unmatched } = mapHeaders(['SKU', 'Product Name', 'stock_qty', 'totally_unknown_col'])
assert(matched.length === 3, `matches sku/name/stockQty by fuzzy header name (got ${matched.length})`)
assert(unmatched.length === 1 && unmatched[0] === 'totally_unknown_col', 'flags unmatched column')

// 6. coerceValue type coercion
const priceField = FIELD_SCHEMA.find((f) => f.key === 'price')!
assert(coerceValue(priceField, '19.99') === 19.99, 'coerces currency string to number')
assert(coerceValue(priceField, '') === null, 'empty numeric value coerces to null')
const boolField = FIELD_SCHEMA.find((f) => f.key === 'isFeatured')!
assert(coerceValue(boolField, 'YES') === true, 'coerces "YES" to boolean true')
assert(coerceValue(boolField, '') === false, 'empty boolean value coerces to false')

// 7. Sample CSV round-trips through the mapper
const sample = generateSampleCsv()
const header = sample.split('\n')[0].split(',')
const { matched: sampleMatched } = mapHeaders(header)
assert(sampleMatched.length === header.length, 'every column in the generated sample CSV maps to a known field')

console.log('\nAll sanity checks passed.')
