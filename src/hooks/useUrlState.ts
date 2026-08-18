import { useEffect } from 'react'
import { FIELD_MAP } from '../data/schema'
import type { SortState } from '../types'
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_FILTERS,
  MULTI_KEYS,
  PAGE_SIZES,
  RANGE_KEYS,
  useTableStore,
  type Filters,
} from '../store/useTableStore'

/**
 * Table state lives in the URL so a view can be refreshed and shared. There
 * is no router in this app and one param string does not justify adding one —
 * `history.replaceState` plus a `popstate` listener is the whole mechanism.
 *
 * Every parameter is validated on the way in: an unknown sort column, a page
 * size that isn't offered, or a junk page number falls back to the default
 * instead of putting the table into a state the UI can't represent.
 */

const SORT_SEPARATOR = '_'

function parseSort(raw: string | null): SortState {
  if (!raw) return null
  // lastIndexOf, not indexOf: field keys are camelCase but a future snake_case
  // key would otherwise split in the wrong place.
  const at = raw.lastIndexOf(SORT_SEPARATOR)
  if (at === -1) return null
  const key = raw.slice(0, at)
  const direction = raw.slice(at + 1)
  if (!FIELD_MAP[key] || (direction !== 'asc' && direction !== 'desc')) return null
  return { key, direction }
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DATE_RANGE_KEYS: readonly string[] = ['createdFrom', 'createdTo']

/**
 * Range bounds are stored as strings, so an unusable one would otherwise sit
 * in state looking active: the worker ignores it but the filter chip still
 * renders it, as "$NaN+". Dropping it here keeps state and UI honest.
 */
function parseRangeBound(key: string, raw: string | null): string {
  if (raw === null || raw === '') return ''
  if (DATE_RANGE_KEYS.includes(key)) {
    return ISO_DATE.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : ''
  }
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? raw : ''
}

function readUrl() {
  const params = new URLSearchParams(window.location.search)
  const filters: Filters = { ...EMPTY_FILTERS }

  for (const key of MULTI_KEYS) {
    const raw = params.get(key)
    filters[key] = raw ? raw.split(',').map((v) => v.trim()).filter(Boolean) : []
  }
  for (const [min, max] of RANGE_KEYS) {
    filters[min] = parseRangeBound(min, params.get(min))
    filters[max] = parseRangeBound(max, params.get(max))
  }

  const size = Number(params.get('size'))
  return {
    searchQuery: params.get('search') ?? '',
    filters,
    sort: parseSort(params.get('sort')),
    page: parsePositiveInt(params.get('page'), 1),
    pageSize: PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE,
  }
}

function buildQuery(state: {
  searchQuery: string
  filters: Filters
  sort: SortState
  page: number
  pageSize: number
}): string {
  const params = new URLSearchParams()
  if (state.searchQuery) params.set('search', state.searchQuery)
  for (const key of MULTI_KEYS) {
    if (state.filters[key].length > 0) params.set(key, state.filters[key].join(','))
  }
  for (const [min, max] of RANGE_KEYS) {
    if (state.filters[min]) params.set(min, state.filters[min])
    if (state.filters[max]) params.set(max, state.filters[max])
  }
  if (state.sort) params.set('sort', `${state.sort.key}${SORT_SEPARATOR}${state.sort.direction}`)
  // Defaults stay out of the URL so a plain view has a clean address.
  if (state.page > 1) params.set('page', String(state.page))
  if (state.pageSize !== DEFAULT_PAGE_SIZE) params.set('size', String(state.pageSize))
  const query = params.toString()
  return query ? `?${query}` : window.location.pathname
}

/**
 * Called once from the entry point, before React mounts, so a shared link
 * never flashes the unfiltered dataset on the way to the filtered one.
 */
export function hydrateFromUrl() {
  useTableStore.setState(readUrl())
}

export function useUrlState() {
  const searchQuery = useTableStore((s) => s.searchQuery)
  const filters = useTableStore((s) => s.filters)
  const sort = useTableStore((s) => s.sort)
  const page = useTableStore((s) => s.page)
  const pageSize = useTableStore((s) => s.pageSize)

  useEffect(() => {
    function onPopState() {
      useTableStore.setState(readUrl())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const next = buildQuery({ searchQuery, filters, sort, page, pageSize })
    const current = window.location.search || window.location.pathname
    // replaceState, not pushState: typing in the search box should not bury
    // the previous page under a hundred history entries.
    if (next !== current) window.history.replaceState(null, '', next)
  }, [searchQuery, filters, sort, page, pageSize])
}
