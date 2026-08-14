import type { ColumnDef } from '@tanstack/react-table'
import type { ProductRecord } from '../../types'
import { FIELD_MAP } from '../../data/schema'
import { StatusPill } from './cells/StatusPill'
import { RatingCell } from './cells/RatingCell'
import { BooleanCell } from './cells/BooleanCell'
import { CurrencyCell } from './cells/CurrencyCell'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function buildColumns(
  visibleKeys: string[],
  selection: {
    allSelected: boolean
    someSelected: boolean
    onToggleAll: () => void
    isSelected: (id: string) => boolean
    onToggleRow: (id: string) => void
  },
): ColumnDef<ProductRecord>[] {
  const selectColumn: ColumnDef<ProductRecord> = {
    id: '__select',
    size: 44,
    enableSorting: false,
    header: () => (
      <input
        type="checkbox"
        aria-label="Select all visible rows"
        checked={selection.allSelected}
        ref={(el) => {
          if (el) el.indeterminate = !selection.allSelected && selection.someSelected
        }}
        onChange={selection.onToggleAll}
        className="size-4 accent-indigo-600 cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label={`Select row ${row.original.id}`}
        checked={selection.isSelected(row.original.id)}
        onChange={() => selection.onToggleRow(row.original.id)}
        onClick={(e) => e.stopPropagation()}
        className="size-4 accent-indigo-600 cursor-pointer"
      />
    ),
  }

  const dataColumns: ColumnDef<ProductRecord>[] = visibleKeys.map((key) => {
    const field = FIELD_MAP[key]
    const base: ColumnDef<ProductRecord> = {
      id: key,
      accessorKey: key,
      header: field.label,
      size: field.width,
      sortingFn: field.numeric ? 'alphanumeric' : 'text',
      cell: (info) => renderCell(field.key, field.type, info.getValue()),
    }
    return base
  })

  return [selectColumn, ...dataColumns]
}

function renderCell(key: string, type: string, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-300">—</span>
  }
  switch (type) {
    case 'currency':
      return <CurrencyCell value={value as number} />
    case 'boolean':
      return <BooleanCell value={value as boolean} />
    case 'rating':
      return <RatingCell value={value as number} />
    case 'url':
      return (
        <a
          href={value as string}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:underline truncate block"
          onClick={(e) => e.stopPropagation()}
        >
          {value as string}
        </a>
      )
    case 'number':
      return <span className="tabular-nums">{Number(value).toLocaleString()}</span>
    default:
      break
  }
  if (key === 'status') return <StatusPill value={value as string} />
  return <span className="truncate block">{String(value)}</span>
}

export { currencyFormatter }
