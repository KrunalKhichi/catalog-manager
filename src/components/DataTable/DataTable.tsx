import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ProductRecord, SortState } from '../../types'
import { FIELD_MAP } from '../../data/schema'
import { renderCell } from './renderCell'
import { useColumnWidths } from './useColumnWidths'
import { EditIcon, TrashIcon } from '../common/icons'
import { BUTTON } from '../common/ui'

const ROW_HEIGHT = 40
const SELECT_WIDTH = 44
/** Wide enough for two 28px icon buttons plus padding, and no wider. */
const ACTIONS_WIDTH = 104

// Header cells carry their own sticky + background + bottom rule. Putting any
// of it on <thead> or <tr> instead breaks under border-collapse: rows paint
// over the stuck header and collapsed borders detach from it.
const HEADER_CELL = 'sticky top-0 z-20 bg-slate-100 shadow-[inset_0_-1px_0_0_#cbd5e1]'
// Every edge rule here is an *inset* shadow. An outer one is drawn outside the
// cell's own box, where the next cell's opaque background paints straight over
// it, so the pinned columns end up with no visible seam at all.
const HEADER_CELL_PINNED_LEFT =
  'sticky top-0 z-30 bg-slate-100 shadow-[inset_0_-1px_0_0_#cbd5e1,inset_-1px_0_0_0_#cbd5e1]'
const HEADER_CELL_PINNED_RIGHT =
  'sticky top-0 z-30 bg-slate-100 shadow-[inset_0_-1px_0_0_#cbd5e1,inset_1px_0_0_0_#cbd5e1]'

interface DataTableProps {
  /** The current page only — never the whole result set. */
  records: ProductRecord[]
  visibleColumns: string[]
  selectedIds: Set<string>
  sort: SortState
  onToggleSort: (key: string) => void
  onToggleRow: (id: string) => void
  onSelectPage: (ids: string[]) => void
  onDeselectPage: (ids: string[]) => void
  onOpenRecord: (record: ProductRecord) => void
  onEditRecord: (record: ProductRecord) => void
  onDeleteRecord: (record: ProductRecord) => void
  /** Dims the body while a sort or filter is still resolving. */
  isPending: boolean
  isNarrowed: boolean
  onClearFilters: () => void
}

export function DataTable({
  records,
  visibleColumns,
  selectedIds,
  sort,
  onToggleSort,
  onToggleRow,
  onSelectPage,
  onDeselectPage,
  onOpenRecord,
  onEditRecord,
  onDeleteRecord,
  isPending,
  isNarrowed,
  onClearFilters,
}: DataTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const columns = useMemo(
    () => visibleColumns.map((key) => FIELD_MAP[key]).filter(Boolean),
    [visibleColumns],
  )

  const defaultWidths = useMemo(
    () => Object.fromEntries(columns.map((f) => [f.key, f.width])),
    [columns],
  )
  const { widthOf, startResize, resizing } = useColumnWidths(defaultWidths)

  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalHeight = rowVirtualizer.getTotalSize()
  const padTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const padBottom = virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0

  const gridWidth = columns.reduce((sum, f) => sum + widthOf(f.key), SELECT_WIDTH + ACTIONS_WIDTH)

  // "All" means all rows on this page. Selection itself persists across pages,
  // so the header box must never imply it covers the whole result set.
  const { allOnPageSelected, someOnPageSelected } = useMemo(() => {
    let hits = 0
    for (const record of records) if (selectedIds.has(record.id)) hits++
    return {
      allOnPageSelected: hits > 0 && hits === records.length,
      someOnPageSelected: hits > 0,
    }
  }, [records, selectedIds])

  if (columns.length === 0) {
    return (
      <EmptyState
        title="No columns selected"
        hint="Pick a preset or a few fields from the Columns menu to bring the table back."
      />
    )
  }

  if (records.length === 0) {
    return (
      <EmptyState
        title="No products found"
        hint={
          isNarrowed
            ? 'Try changing your search or filters.'
            : 'This dataset is empty — add a record or import a CSV to get started.'
        }
        action={
          isNarrowed ? (
            <button onClick={onClearFilters} className={`${BUTTON} mt-3`}>
              Clear filters
            </button>
          ) : null
        }
      />
    )
  }

  return (
    <div
      ref={scrollRef}
      className={`relative flex-1 overflow-auto overscroll-x-contain ${resizing ? 'select-none' : ''}`}
    >
      <table
        className="border-collapse bg-white text-sm"
        style={{ minWidth: gridWidth, width: '100%', tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            <th
              style={{ width: SELECT_WIDTH, left: 0 }}
              className="sticky top-0 z-30 bg-slate-100 px-3 py-2 shadow-[inset_0_-1px_0_0_#cbd5e1]"
            >
              <input
                type="checkbox"
                aria-label={`Select all ${records.length} rows on this page`}
                title={`Select all ${records.length} rows on this page`}
                checked={allOnPageSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected
                }}
                onChange={() => {
                  const ids = records.map((r) => r.id)
                  if (allOnPageSelected) onDeselectPage(ids)
                  else onSelectPage(ids)
                }}
                className="size-4 align-middle accent-indigo-600"
              />
            </th>

            {columns.map((field, idx) => {
              const active = sort?.key === field.key ? sort.direction : null
              return (
                <th
                  key={field.key}
                  scope="col"
                  aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
                  style={{ width: widthOf(field.key), left: idx === 0 ? SELECT_WIDTH : undefined }}
                  className={`${idx === 0 ? HEADER_CELL_PINNED_LEFT : HEADER_CELL} relative select-none whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleSort(field.key)}
                    title={sortTitle(field.label, active)}
                    className={`flex w-full items-center gap-1 rounded-sm hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
                      field.numeric ? 'justify-end' : ''
                    }`}
                  >
                    <span className="truncate">{field.label}</span>
                    <SortIcon direction={active} />
                  </button>
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${field.label}`}
                    onMouseDown={(e) => startResize(field.key, e)}
                    className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-indigo-400 ${
                      resizing === field.key ? 'bg-indigo-500' : ''
                    }`}
                  />
                </th>
              )
            })}

            {/* Soaks up leftover width so the sized columns keep their exact
                widths — fixed layout would otherwise stretch all of them.
                It sits before Actions, which is pinned to the viewport edge
                and so paints over whatever slack ends up here. */}
            <th aria-hidden className={HEADER_CELL} />

            <th
              scope="col"
              style={{ width: ACTIONS_WIDTH, right: 0 }}
              className={`${HEADER_CELL_PINNED_RIGHT} whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600`}
            >
              Actions
            </th>
          </tr>
        </thead>

        <tbody className={isPending ? 'opacity-60 transition-opacity' : ''}>
          {padTop > 0 && (
            <tr aria-hidden style={{ height: padTop }}>
              <td colSpan={columns.length + 3} />
            </tr>
          )}

          {virtualRows.map((virtualRow) => {
            const record = records[virtualRow.index]
            const isSelected = selectedIds.has(record.id)
            // Sticky cells sit on top of scrolled content, so their background
            // has to be fully opaque and has to repaint on hover — the <tr>'s
            // own background is underneath them, not visible through them.
            const bg = isSelected ? 'bg-indigo-50' : virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
            const hover = isSelected ? 'hover:bg-indigo-100' : 'hover:bg-slate-100'
            const hoverCell = isSelected ? 'group-hover:bg-indigo-100' : 'group-hover:bg-slate-100'
            const label = String(record.sku ?? record.id)

            return (
              <tr
                key={record.id}
                tabIndex={0}
                style={{ height: ROW_HEIGHT }}
                onClick={(e) => {
                  // Don't hijack a click the user made to select text.
                  if (window.getSelection()?.toString()) return
                  if ((e.target as HTMLElement).closest('a,input,button')) return
                  onOpenRecord(record)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) onOpenRecord(record)
                }}
                className={`group cursor-pointer border-b border-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${bg} ${hover}`}
              >
                <td style={{ width: SELECT_WIDTH, left: 0 }} className={`sticky z-[5] px-3 ${bg} ${hoverCell}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${label}`}
                    checked={isSelected}
                    onChange={() => onToggleRow(record.id)}
                    className="size-4 align-middle accent-indigo-600"
                  />
                </td>

                {columns.map((field, idx) => (
                  <td
                    key={field.key}
                    style={{ width: widthOf(field.key), left: idx === 0 ? SELECT_WIDTH : undefined }}
                    className={`overflow-hidden text-ellipsis whitespace-nowrap px-3 text-slate-700 ${
                      field.numeric ? 'text-right' : ''
                    } ${idx === 0 ? `sticky z-[5] shadow-[inset_-1px_0_0_0_#e2e8f0] ${bg} ${hoverCell}` : ''}`}
                  >
                    {renderCell(field, record[field.key])}
                  </td>
                ))}

                <td aria-hidden />

                <td
                  style={{ width: ACTIONS_WIDTH, right: 0 }}
                  className={`sticky z-[5] px-2 shadow-[inset_1px_0_0_0_#e2e8f0] ${bg} ${hoverCell}`}
                >
                  <div className="flex items-center gap-1">
                    <RowAction
                      label={`Edit ${label}`}
                      tooltip="Edit product"
                      onClick={() => onEditRecord(record)}
                      className="hover:bg-indigo-100 hover:text-indigo-700"
                    >
                      <EditIcon />
                    </RowAction>
                    <RowAction
                      label={`Delete ${label}`}
                      tooltip="Delete product"
                      onClick={() => onDeleteRecord(record)}
                      className="hover:bg-rose-100 hover:text-rose-700"
                    >
                      <TrashIcon />
                    </RowAction>
                  </div>
                </td>
              </tr>
            )
          })}

          {padBottom > 0 && (
            <tr aria-hidden style={{ height: padBottom }}>
              <td colSpan={columns.length + 3} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * `title` gives the native tooltip on hover; `aria-label` names the row it
 * acts on, so screen-reader users hear "Delete SKU-TOY-009976" rather than
 * 250 identically-named buttons.
 */
function RowAction({
  label,
  tooltip,
  onClick,
  className,
  children,
}: {
  label: string
  tooltip: string
  onClick: () => void
  className: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={tooltip}
      onClick={onClick}
      className={`inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${className}`}
    >
      {children}
    </button>
  )
}

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-sm text-slate-500">{hint}</p>
      {action}
    </div>
  )
}

function sortTitle(label: string, direction: 'asc' | 'desc' | null): string {
  if (direction === 'asc') return `Sort ${label} descending`
  if (direction === 'desc') return `Clear sorting on ${label}`
  return `Sort by ${label}`
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) return <span className="text-xs text-slate-300">↕</span>
  return <span className="text-xs text-indigo-600">{direction === 'asc' ? '↑' : '↓'}</span>
}
