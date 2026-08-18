import type { FieldDef } from '../../types'
import { StatusPill } from './cells/StatusPill'
import { RatingCell } from './cells/RatingCell'
import { BooleanCell } from './cells/BooleanCell'
import { CurrencyCell } from './cells/CurrencyCell'
import { number } from '../../utils/format'

export function renderCell(field: FieldDef, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-300">—</span>
  }
  switch (field.type) {
    case 'currency':
      return <CurrencyCell value={Number(value)} />
    case 'boolean':
      return <BooleanCell value={Boolean(value)} />
    case 'rating':
      return <RatingCell value={Number(value)} />
    case 'number':
      return <span className="tabular-nums">{number.format(Number(value))}</span>
    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-indigo-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      )
    case 'enum':
      if (field.key === 'status') return <StatusPill value={String(value)} />
      break
  }
  return <span className="block truncate">{String(value)}</span>
}
