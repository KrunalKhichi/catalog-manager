import type { FieldDef } from '../types'

const CATEGORIES = [
  'Apparel',
  'Footwear',
  'Electronics',
  'Home & Kitchen',
  'Beauty',
  'Sports & Outdoors',
  'Toys & Games',
  'Automotive',
  'Office Supplies',
  'Pet Supplies',
]

const SUBCATEGORIES = [
  'Jackets',
  'Sneakers',
  'Headphones',
  'Cookware',
  'Skincare',
  'Camping Gear',
  'Board Games',
  'Car Accessories',
  'Notebooks',
  'Dog Toys',
  'Smart Home',
  'Furniture',
]

const COLORS = [
  'Black',
  'White',
  'Navy',
  'Charcoal',
  'Crimson',
  'Olive',
  'Sand',
  'Slate Blue',
  'Forest Green',
  'Amber',
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'N/A']
const MATERIALS = ['Cotton', 'Polyester', 'Aluminum', 'Stainless Steel', 'Leather', 'ABS Plastic', 'Bamboo', 'Wool', 'Silicone', 'Glass']
const WAREHOUSES = ['WH-EAST-01', 'WH-WEST-02', 'WH-CENTRAL-03', 'WH-SOUTH-04', 'WH-EU-05', 'WH-APAC-06']
const COUNTRIES = ['USA', 'China', 'Vietnam', 'India', 'Germany', 'Mexico', 'Bangladesh', 'Turkey', 'Italy', 'Brazil']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY']
const STATUSES = ['Active', 'Discontinued', 'Draft', 'Backorder']
const RETURN_POLICIES = ['30-day', '60-day', '90-day', 'Final Sale']
const CHANNELS = ['Online', 'Retail', 'Wholesale', 'Marketplace']
const QC_STATUSES = ['Pass', 'Fail', 'Pending']
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All-Season']
const GENDERS = ['Men', 'Women', 'Unisex', 'Kids']
const AGE_GROUPS = ['Adult', 'Kids', 'Infant']
const CERTIFICATIONS = ['None', 'CE', 'FCC', 'RoHS', 'ISO 9001']
const UNITS = ['pcs', 'kg', 'box', 'pack']
const SUPPLIERS = ['Northwind Traders', 'Global Sourcing Co', 'Pacific Rim Imports', 'Atlas Manufacturing', 'Meridian Goods', 'Summit Wholesale', 'BlueCrest Supply']

export const ENUM_OPTIONS = {
  category: CATEGORIES,
  subcategory: SUBCATEGORIES,
  color: COLORS,
  size: SIZES,
  material: MATERIALS,
  warehouse: WAREHOUSES,
  supplierCountry: COUNTRIES,
  countryOfOrigin: COUNTRIES,
  currency: CURRENCIES,
  status: STATUSES,
  returnPolicy: RETURN_POLICIES,
  salesChannel: CHANNELS,
  qcStatus: QC_STATUSES,
  season: SEASONS,
  gender: GENDERS,
  ageGroup: AGE_GROUPS,
  certification: CERTIFICATIONS,
  unit: UNITS,
  supplier: SUPPLIERS,
}

/**
 * One list drives everything: generated data, table columns, the add/edit
 * form, CSV header matching and the detail panel. `defaultVisible` is the
 * starting column set, `core` is what the form shows before "advanced".
 */
export const FIELD_SCHEMA: FieldDef[] = [
  { key: 'sku', label: 'SKU', type: 'text', width: 158, defaultVisible: true, core: true, required: true },
  { key: 'name', label: 'Product Name', type: 'text', width: 240, defaultVisible: true, core: true, required: true },
  { key: 'category', label: 'Category', type: 'enum', options: CATEGORIES, width: 150, defaultVisible: true, core: true, required: true },
  { key: 'subcategory', label: 'Subcategory', type: 'enum', options: SUBCATEGORIES, width: 150, defaultVisible: false, core: true },
  { key: 'brand', label: 'Brand', type: 'text', width: 150, defaultVisible: true, core: true },
  { key: 'price', label: 'Price', type: 'currency', width: 110, defaultVisible: true, core: true, required: true, numeric: true },
  { key: 'cost', label: 'Cost', type: 'currency', width: 110, defaultVisible: false, numeric: true },
  { key: 'currency', label: 'Currency', type: 'enum', options: CURRENCIES, width: 100, defaultVisible: false },
  { key: 'stockQty', label: 'Stock Qty', type: 'number', width: 110, defaultVisible: true, core: true, required: true, numeric: true },
  { key: 'warehouse', label: 'Warehouse', type: 'enum', options: WAREHOUSES, width: 140, defaultVisible: true },
  { key: 'reorderPoint', label: 'Reorder Point', type: 'number', width: 130, defaultVisible: false, numeric: true },
  { key: 'supplier', label: 'Supplier', type: 'enum', options: SUPPLIERS, width: 180, defaultVisible: false },
  { key: 'supplierEmail', label: 'Supplier Email', type: 'text', width: 200, defaultVisible: false },
  { key: 'supplierCountry', label: 'Supplier Country', type: 'enum', options: COUNTRIES, width: 150, defaultVisible: false },
  { key: 'weightKg', label: 'Weight (kg)', type: 'number', width: 120, defaultVisible: false, numeric: true },
  { key: 'lengthCm', label: 'Length (cm)', type: 'number', width: 120, defaultVisible: false, numeric: true },
  { key: 'widthCm', label: 'Width (cm)', type: 'number', width: 110, defaultVisible: false, numeric: true },
  { key: 'heightCm', label: 'Height (cm)', type: 'number', width: 110, defaultVisible: false, numeric: true },
  { key: 'color', label: 'Color', type: 'enum', options: COLORS, width: 120, defaultVisible: true, core: true },
  { key: 'size', label: 'Size', type: 'enum', options: SIZES, width: 100, defaultVisible: false },
  { key: 'material', label: 'Material', type: 'enum', options: MATERIALS, width: 140, defaultVisible: false },
  { key: 'tags', label: 'Tags', type: 'text', width: 200, defaultVisible: false },
  { key: 'status', label: 'Status', type: 'enum', options: STATUSES, width: 120, defaultVisible: true, core: true, required: true },
  { key: 'rating', label: 'Rating', type: 'rating', width: 110, defaultVisible: true, numeric: true },
  { key: 'reviewCount', label: 'Review Count', type: 'number', width: 130, defaultVisible: false, numeric: true },
  { key: 'createdAt', label: 'Created At', type: 'date', width: 130, defaultVisible: true },
  { key: 'updatedAt', label: 'Updated At', type: 'date', width: 130, defaultVisible: false },
  { key: 'discontinued', label: 'Discontinued', type: 'boolean', width: 120, defaultVisible: false },
  { key: 'barcode', label: 'Barcode', type: 'text', width: 150, defaultVisible: false },
  { key: 'taxRatePct', label: 'Tax Rate %', type: 'number', width: 110, defaultVisible: false, numeric: true },
  { key: 'discountPct', label: 'Discount %', type: 'number', width: 110, defaultVisible: false, numeric: true },
  { key: 'marginPct', label: 'Margin %', type: 'number', width: 110, defaultVisible: false, numeric: true },
  { key: 'description', label: 'Description', type: 'longtext', width: 280, defaultVisible: false },
  { key: 'imageUrl', label: 'Image URL', type: 'url', width: 220, defaultVisible: false },
  { key: 'isFeatured', label: 'Featured', type: 'boolean', width: 110, defaultVisible: false },
  { key: 'isOnSale', label: 'On Sale', type: 'boolean', width: 110, defaultVisible: false },
  { key: 'minOrderQty', label: 'Min Order Qty', type: 'number', width: 130, defaultVisible: false, numeric: true },
  { key: 'maxOrderQty', label: 'Max Order Qty', type: 'number', width: 130, defaultVisible: false, numeric: true },
  { key: 'leadTimeDays', label: 'Lead Time (days)', type: 'number', width: 150, defaultVisible: false, numeric: true },
  { key: 'countryOfOrigin', label: 'Country of Origin', type: 'enum', options: COUNTRIES, width: 160, defaultVisible: false },
  { key: 'hsCode', label: 'HS Code', type: 'text', width: 120, defaultVisible: false },
  { key: 'unit', label: 'Unit', type: 'enum', options: UNITS, width: 90, defaultVisible: false },
  { key: 'shelfLifeDays', label: 'Shelf Life (days)', type: 'number', width: 150, defaultVisible: false, numeric: true },
  { key: 'isPerishable', label: 'Perishable', type: 'boolean', width: 110, defaultVisible: false },
  { key: 'isFragile', label: 'Fragile', type: 'boolean', width: 100, defaultVisible: false },
  { key: 'isHazardous', label: 'Hazardous', type: 'boolean', width: 110, defaultVisible: false },
  { key: 'warrantyMonths', label: 'Warranty (mo)', type: 'number', width: 130, defaultVisible: false, numeric: true },
  { key: 'returnPolicy', label: 'Return Policy', type: 'enum', options: RETURN_POLICIES, width: 130, defaultVisible: false },
  { key: 'salesChannel', label: 'Sales Channel', type: 'enum', options: CHANNELS, width: 130, defaultVisible: false },
  { key: 'lastRestockedAt', label: 'Last Restocked', type: 'date', width: 140, defaultVisible: false },
  { key: 'nextRestockAt', label: 'Next Restock', type: 'date', width: 140, defaultVisible: false },
  { key: 'binLocation', label: 'Bin Location', type: 'text', width: 120, defaultVisible: false },
  { key: 'palletId', label: 'Pallet ID', type: 'text', width: 120, defaultVisible: false },
  { key: 'qcStatus', label: 'QC Status', type: 'enum', options: QC_STATUSES, width: 110, defaultVisible: false },
  { key: 'season', label: 'Season', type: 'enum', options: SEASONS, width: 120, defaultVisible: false },
  { key: 'gender', label: 'Gender', type: 'enum', options: GENDERS, width: 100, defaultVisible: false },
  { key: 'ageGroup', label: 'Age Group', type: 'enum', options: AGE_GROUPS, width: 110, defaultVisible: false },
  { key: 'certification', label: 'Certification', type: 'enum', options: CERTIFICATIONS, width: 130, defaultVisible: false },
  { key: 'internalNotes', label: 'Internal Notes', type: 'longtext', width: 260, defaultVisible: false },
  { key: 'version', label: 'Version', type: 'number', width: 90, defaultVisible: false, numeric: true },
]

export const FIELD_MAP: Record<string, FieldDef> = Object.fromEntries(
  FIELD_SCHEMA.map((f) => [f.key, f]),
)

export const DEFAULT_VISIBLE: string[] = FIELD_SCHEMA.filter((f) => f.defaultVisible).map((f) => f.key)

// Column-count presets take a prefix of this list, so the useful-at-a-glance
// fields have to come first — otherwise "Compact (10)" shows whatever
// happens to sit at the top of the schema.
export const COLUMN_PRIORITY: string[] = [
  ...DEFAULT_VISIBLE,
  ...FIELD_SCHEMA.filter((f) => !f.defaultVisible).map((f) => f.key),
]
