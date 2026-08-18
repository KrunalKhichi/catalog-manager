import { PAGE_SIZES } from '../../store/useTableStore'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from '../common/icons'

interface Props {
  page: number
  pageCount: number
  pageSize: number
  rangeStart: number
  rangeEnd: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const STEP = 'inline-flex size-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600'

export function Pagination({
  page,
  pageCount,
  pageSize,
  rangeStart,
  rangeEnd,
  total,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const atStart = page <= 1
  const atEnd = page >= pageCount

  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 bg-white px-4 py-2"
    >
      <p className="text-xs text-slate-500">
        Showing{' '}
        <span className="font-medium tabular-nums text-slate-700">
          {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}
        </span>{' '}
        of <span className="font-medium tabular-nums text-slate-700">{total.toLocaleString()}</span>
      </p>

      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        Rows per page
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={atStart}
          aria-label="First page"
          title="First page"
          className={STEP}
        >
          <ChevronsLeftIcon />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={atStart}
          aria-label="Previous page"
          title="Previous page"
          className={STEP}
        >
          <ChevronLeftIcon />
        </button>

        <span aria-live="polite" className="px-2 text-xs text-slate-600">
          Page <span className="font-medium tabular-nums text-slate-900">{page.toLocaleString()}</span> of{' '}
          <span className="tabular-nums">{pageCount.toLocaleString()}</span>
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={atEnd}
          aria-label="Next page"
          title="Next page"
          className={STEP}
        >
          <ChevronRightIcon />
        </button>
        <button
          onClick={() => onPageChange(pageCount)}
          disabled={atEnd}
          aria-label="Last page"
          title="Last page"
          className={STEP}
        >
          <ChevronsRightIcon />
        </button>
      </div>
    </nav>
  )
}
