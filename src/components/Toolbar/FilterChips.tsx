import { MULTI_KEYS, type Filters, type MultiKey } from '../../store/useTableStore'
import { currency } from '../../utils/format'

interface Props {
  filters: Filters
  searchQuery: string
  onChange: (partial: Partial<Filters>) => void
  onClearSearch: () => void
  onClearAll: () => void
}

const FACET_LABELS: Record<MultiKey, string> = {
  category: 'Category',
  brand: 'Brand',
  status: 'Status',
  warehouse: 'Warehouse',
}

/** "$100 – $500", "$100+", "up to $500" — whichever bound the user actually set. */
function rangeText(min: string, max: string, format: (v: string) => string): string {
  if (min !== '' && max !== '') return `${format(min)} – ${format(max)}`
  if (min !== '') return `${format(min)}+`
  return `up to ${format(max)}`
}

const asMoney = (v: string) => currency.format(Number(v))
const asPlain = (v: string) => v

interface Chip {
  key: string
  label: string
  value: string
  clear: () => void
}

export function FilterChips({ filters, searchQuery, onChange, onClearSearch, onClearAll }: Props) {
  const chips: Chip[] = []

  // One chip per selected value, not per facet: removing "Brand: Fjord" should
  // not also drop "Brand: Kestrel".
  for (const key of MULTI_KEYS) {
    for (const value of filters[key]) {
      chips.push({
        key: `${key}:${value}`,
        label: FACET_LABELS[key],
        value,
        clear: () => onChange({ [key]: filters[key].filter((v) => v !== value) }),
      })
    }
  }

  if (filters.priceMin !== '' || filters.priceMax !== '') {
    chips.push({
      key: 'price',
      label: 'Price',
      value: rangeText(filters.priceMin, filters.priceMax, asMoney),
      clear: () => onChange({ priceMin: '', priceMax: '' }),
    })
  }
  if (filters.stockMin !== '' || filters.stockMax !== '') {
    chips.push({
      key: 'stock',
      label: 'Stock',
      value: rangeText(filters.stockMin, filters.stockMax, asPlain),
      clear: () => onChange({ stockMin: '', stockMax: '' }),
    })
  }
  if (filters.ratingMin !== '' || filters.ratingMax !== '') {
    chips.push({
      key: 'rating',
      label: 'Rating',
      value: rangeText(filters.ratingMin, filters.ratingMax, (v) => `${v}★`),
      clear: () => onChange({ ratingMin: '', ratingMax: '' }),
    })
  }
  if (filters.createdFrom !== '' || filters.createdTo !== '') {
    chips.push({
      key: 'created',
      label: 'Created',
      value: rangeText(filters.createdFrom, filters.createdTo, asPlain),
      clear: () => onChange({ createdFrom: '', createdTo: '' }),
    })
  }

  if (chips.length === 0 && searchQuery === '') return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2">
      {searchQuery !== '' && (
        <ChipButton
          label="Search"
          value={`“${searchQuery}”`}
          onRemove={onClearSearch}
          tone="border-slate-300 bg-slate-50 text-slate-700"
        />
      )}

      {chips.map((chip) => (
        <ChipButton key={chip.key} label={chip.label} value={chip.value} onRemove={chip.clear} />
      ))}

      {chips.length + (searchQuery === '' ? 0 : 1) > 1 && (
        <button
          onClick={onClearAll}
          className="ml-1 rounded px-1.5 py-0.5 text-xs font-medium text-slate-500 underline decoration-dotted hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

function ChipButton({
  label,
  value,
  onRemove,
  tone = 'border-indigo-200 bg-indigo-50 text-indigo-800',
}: {
  label: string
  value: string
  onRemove: () => void
  tone?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      <span className="font-medium">{label}:</span>
      <span className="max-w-[14rem] truncate">{value}</span>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter ${value}`}
        title={`Remove ${label} filter`}
        className="ml-0.5 rounded-full px-1 leading-none text-current opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
      >
        ×
      </button>
    </span>
  )
}
