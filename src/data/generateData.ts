import type { ProductRecord } from '../types'
import { ENUM_OPTIONS } from './schema'

// mulberry32: tiny, fast, deterministic PRNG. Avoids pulling in a full
// fake-data library just to spin up 100k rows — this generates 100k
// 60-field records in well under a second and is reproducible via seed.
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

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

function randomDateWithin(rand: () => number, daysBack: number): string {
  const now = Date.now()
  const past = now - Math.floor(rand() * daysBack) * 86400000
  return new Date(past).toISOString().slice(0, 10)
}

function makeRow(index: number, rand: () => number): ProductRecord {
  const category = pick(rand, ENUM_OPTIONS.category)
  const brand = pick(rand, ['Kestrel', 'Vantage', 'Northline', 'Haven', 'Orbitz', 'Cardinal', 'Fjord', 'Brightside', 'Solace', 'Trailmark'])
  const name = `${pick(rand, ADJECTIVES)} ${pick(rand, NOUNS)} ${index % 97}`
  const price = Math.round((5 + rand() * 495) * 100) / 100
  const cost = Math.round(price * (0.35 + rand() * 0.35) * 100) / 100
  const stockQty = Math.floor(rand() * 5000)
  const rating = Math.round((rand() * 5) * 10) / 10

  return {
    id: `PRD-${(index + 1).toString().padStart(6, '0')}`,
    sku: `SKU-${(100000 + index).toString(36).toUpperCase()}`,
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
    supplier: pick(rand, ENUM_OPTIONS.supplier),
    supplierEmail: `orders@${pick(rand, ENUM_OPTIONS.supplier)!.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    supplierCountry: pick(rand, ENUM_OPTIONS.supplierCountry),
    weightKg: Math.round(rand() * 20 * 100) / 100,
    lengthCm: Math.round(rand() * 100),
    widthCm: Math.round(rand() * 80),
    heightCm: Math.round(rand() * 60),
    color: pick(rand, ENUM_OPTIONS.color),
    size: pick(rand, ENUM_OPTIONS.size),
    material: pick(rand, ENUM_OPTIONS.material),
    tags: [pick(rand, ENUM_OPTIONS.category), pick(rand, ENUM_OPTIONS.color), pick(rand, ['new', 'bestseller', 'clearance', 'limited'])].join(', '),
    status: pick(rand, ENUM_OPTIONS.status),
    rating,
    reviewCount: Math.floor(rand() * 3000),
    createdAt: randomDateWithin(rand, 900),
    updatedAt: randomDateWithin(rand, 90),
    discontinued: rand() < 0.08,
    barcode: `${Math.floor(1000000000000 + rand() * 8999999999999)}`,
    taxRatePct: Math.round(rand() * 18 * 10) / 10,
    discountPct: Math.round(rand() * 40),
    marginPct: Math.round(((price - cost) / price) * 1000) / 10,
    description: `${name} from ${brand}. A ${pick(rand, ['durable', 'lightweight', 'premium', 'budget-friendly', 'versatile'])} pick in the ${category.toLowerCase()} range.`,
    imageUrl: `https://picsum.photos/seed/${index}/200/200`,
    isFeatured: rand() < 0.1,
    isOnSale: rand() < 0.2,
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
    lastRestockedAt: randomDateWithin(rand, 60),
    nextRestockAt: randomDateWithin(rand, -30),
    binLocation: `${pick(rand, ['A', 'B', 'C', 'D'])}-${Math.floor(rand() * 40)}-${Math.floor(rand() * 8)}`,
    palletId: `PLT-${Math.floor(rand() * 90000)}`,
    qcStatus: pick(rand, ENUM_OPTIONS.qcStatus),
    season: pick(rand, ENUM_OPTIONS.season),
    gender: pick(rand, ENUM_OPTIONS.gender),
    ageGroup: pick(rand, ENUM_OPTIONS.ageGroup),
    certification: pick(rand, ENUM_OPTIONS.certification),
    internalNotes: rand() < 0.3 ? pick(rand, ['Check supplier lead time before reorder.', 'Packaging redesign pending.', 'Verify weight after last shipment.', 'Flagged in Q2 audit — cleared.', '']) : '',
    version: 1 + Math.floor(rand() * 6),
  }
}

/** Generates `count` deterministic product records. Fast enough for 100k+ rows. */
export function generateRecords(count: number, seed = 42): ProductRecord[] {
  const rand = mulberry32(seed)
  const rows = new Array<ProductRecord>(count)
  for (let i = 0; i < count; i++) {
    rows[i] = makeRow(i, rand)
  }
  return rows
}

export function nextId(existing: number): string {
  return `PRD-${(existing + 1).toString().padStart(6, '0')}`
}
