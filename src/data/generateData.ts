import type { ProductRecord } from '../types'
import { ENUM_OPTIONS } from './schema'

// mulberry32 — 4 lines, deterministic, and fast enough to build 100k
// 60-field rows in about a second. A faker-style library would cost an
// order of magnitude more time and ~500kB for prettier strings.
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ADJECTIVES = ['Aero', 'Ultra', 'Nova', 'Pro', 'Eco', 'Prime', 'Classic', 'Urban', 'Alpine', 'Nordic', 'Compact', 'Rapid', 'Everyday', 'Signature', 'Flex']
const NOUNS = ['Trainer', 'Backpack', 'Blender', 'Jacket', 'Monitor', 'Kettle', 'Headset', 'Tent', 'Wallet', 'Lamp', 'Charger', 'Mixer', 'Sneaker', 'Notebook', 'Speaker', 'Grinder', 'Router', 'Cushion']
const BRANDS = ['Kestrel', 'Vantage', 'Northline', 'Haven', 'Orbitz', 'Cardinal', 'Fjord', 'Brightside', 'Solace', 'Trailmark']
const NOTES = [
  'Check supplier lead time before reorder.',
  'Packaging redesign pending.',
  'Verify weight after last shipment.',
  'Flagged in Q2 audit — cleared.',
]

// Three-letter SKU prefix per category, so a SKU says something about the row.
const CATEGORY_CODE: Record<string, string> = {
  Apparel: 'APP',
  Footwear: 'FTW',
  Electronics: 'ELC',
  'Home & Kitchen': 'HMK',
  Beauty: 'BTY',
  'Sports & Outdoors': 'SPT',
  'Toys & Games': 'TOY',
  Automotive: 'AUT',
  'Office Supplies': 'OFC',
  'Pet Supplies': 'PET',
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

const DAY = 86_400_000

function dateOffset(rand: () => number, fromDays: number, toDays: number): string {
  const days = fromDays + Math.floor(rand() * (toDays - fromDays))
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10)
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

function makeRow(index: number, rand: () => number): ProductRecord {
  const category = pick(rand, ENUM_OPTIONS.category)
  const brand = pick(rand, BRANDS)
  const name = `${brand} ${pick(rand, ADJECTIVES)} ${pick(rand, NOUNS)}`
  const supplier = pick(rand, ENUM_OPTIONS.supplier)
  const status = pick(rand, ENUM_OPTIONS.status)

  const price = round(5 + rand() * 495)
  const cost = round(price * (0.35 + rand() * 0.35))
  const stockQty = status === 'Discontinued' ? 0 : Math.floor(rand() * 5000)

  // Real catalogue ratings bunch up near the top; a flat 0–5 spread looks
  // synthetic the moment you scroll it. ~12% of rows have none at all.
  const hasRating = rand() > 0.12
  const rating = hasRating ? round(2.6 + rand() * rand() * 2.4, 1) : null
  const isOnSale = rand() < 0.2

  return {
    id: `PRD-${(index + 1).toString().padStart(6, '0')}`,
    sku: `SKU-${CATEGORY_CODE[category]}-${(index + 1).toString().padStart(6, '0')}`,
    name,
    category,
    subcategory: pick(rand, ENUM_OPTIONS.subcategory),
    brand,
    price,
    cost,
    currency: pick(rand, ENUM_OPTIONS.currency),
    stockQty,
    warehouse: pick(rand, ENUM_OPTIONS.warehouse),
    reorderPoint: Math.floor(rand() * 200),
    supplier,
    supplierEmail: `orders@${slug(supplier)}.com`,
    supplierCountry: pick(rand, ENUM_OPTIONS.supplierCountry),
    weightKg: round(rand() * 20),
    lengthCm: Math.round(5 + rand() * 95),
    widthCm: Math.round(5 + rand() * 75),
    heightCm: Math.round(2 + rand() * 58),
    color: pick(rand, ENUM_OPTIONS.color),
    size: pick(rand, ENUM_OPTIONS.size),
    material: pick(rand, ENUM_OPTIONS.material),
    tags: [category, pick(rand, ENUM_OPTIONS.color), pick(rand, ['new', 'bestseller', 'clearance', 'limited'])].join(', '),
    status,
    rating,
    reviewCount: hasRating ? Math.floor(rand() * 3000) : 0,
    createdAt: dateOffset(rand, -900, -30),
    updatedAt: dateOffset(rand, -90, 0),
    discontinued: status === 'Discontinued',
    barcode: `${Math.floor(1_000_000_000_000 + rand() * 8_999_999_999_999)}`,
    taxRatePct: round(rand() * 18, 1),
    discountPct: isOnSale ? 5 + Math.round(rand() * 35) : 0,
    marginPct: round(((price - cost) / price) * 100, 1),
    description: `${name} from ${brand}. A ${pick(rand, ['durable', 'lightweight', 'premium', 'budget-friendly', 'versatile'])} pick in the ${category.toLowerCase()} range.`,
    imageUrl: `https://picsum.photos/seed/${index}/200/200`,
    isFeatured: rand() < 0.1,
    isOnSale,
    minOrderQty: 1 + Math.floor(rand() * 5),
    maxOrderQty: 10 + Math.floor(rand() * 90),
    leadTimeDays: Math.floor(rand() * 45),
    countryOfOrigin: pick(rand, ENUM_OPTIONS.countryOfOrigin),
    hsCode: `${Math.floor(1000 + rand() * 8999)}.${Math.floor(10 + rand() * 89)}`,
    unit: pick(rand, ENUM_OPTIONS.unit),
    shelfLifeDays: Math.floor(rand() * 730),
    isPerishable: rand() < 0.05,
    isFragile: rand() < 0.15,
    isHazardous: rand() < 0.03,
    warrantyMonths: pick(rand, [0, 6, 12, 24, 36]),
    returnPolicy: pick(rand, ENUM_OPTIONS.returnPolicy),
    salesChannel: pick(rand, ENUM_OPTIONS.salesChannel),
    lastRestockedAt: dateOffset(rand, -60, 0),
    nextRestockAt: dateOffset(rand, 1, 30),
    binLocation: `${pick(rand, ['A', 'B', 'C', 'D'])}-${Math.floor(rand() * 40)}-${Math.floor(rand() * 8)}`,
    palletId: `PLT-${Math.floor(rand() * 90000)}`,
    qcStatus: pick(rand, ENUM_OPTIONS.qcStatus),
    season: pick(rand, ENUM_OPTIONS.season),
    gender: pick(rand, ENUM_OPTIONS.gender),
    ageGroup: pick(rand, ENUM_OPTIONS.ageGroup),
    certification: pick(rand, ENUM_OPTIONS.certification),
    internalNotes: rand() < 0.3 ? pick(rand, NOTES) : '',
    version: 1 + Math.floor(rand() * 6),
  }
}

/** Deterministic for a given seed, so a bug found at row 40,231 is reproducible. */
export function generateRecords(count: number, seed = 42): ProductRecord[] {
  const rand = mulberry32(seed)
  const rows = new Array<ProductRecord>(count)
  for (let i = 0; i < count; i++) rows[i] = makeRow(i, rand)
  return rows
}

export function nextId(seq: number): string {
  return `PRD-${(seq + 1).toString().padStart(6, '0')}`
}
