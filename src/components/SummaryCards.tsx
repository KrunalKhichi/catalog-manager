import type { CatalogSummary } from '../hooks/useCatalogSummary'
import { LOW_STOCK_THRESHOLD } from '../hooks/useCatalogSummary'

interface Props {
  summary: CatalogSummary
  onApplyFilter: (preset: 'all' | 'active' | 'lowStock' | 'discontinued') => void
  activePreset: string | null
}

/**
 * Four counts, all derived from the live dataset in the same pass that builds
 * the brand facet. Clicking one applies the matching filter — that's the only
 * reason these are buttons rather than static tiles.
 */
export function SummaryCards({ summary, onApplyFilter, activePreset }: Props) {
  const cards = [
    { key: 'all' as const, label: 'Total products', value: summary.total, hint: 'in this dataset', tone: 'text-slate-900' },
    { key: 'active' as const, label: 'Active', value: summary.active, hint: 'available to sell', tone: 'text-emerald-700' },
    {
      key: 'lowStock' as const,
      label: 'Low stock',
      value: summary.lowStock,
      hint: `active, under ${LOW_STOCK_THRESHOLD} units`,
      tone: 'text-amber-700',
    },
    {
      key: 'discontinued' as const,
      label: 'Discontinued',
      value: summary.discontinued,
      hint: 'no longer stocked',
      tone: 'text-slate-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-4">
      {cards.map((card) => {
        const isActive = activePreset === card.key
        return (
          <button
            key={card.key}
            onClick={() => onApplyFilter(card.key)}
            aria-pressed={isActive}
            title={`Filter to ${card.label.toLowerCase()}`}
            className={`rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
              isActive
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className={`text-xl font-semibold tabular-nums ${card.tone}`}>{card.value.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400">{card.hint}</p>
          </button>
        )
      })}
    </div>
  )
}
