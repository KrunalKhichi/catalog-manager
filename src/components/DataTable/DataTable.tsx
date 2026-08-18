import { useMemo, useRef, useState, useTransition } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FieldDef, ProductRecord, SortState } from '../../types'
import { FIELD_MAP } from '../../data/schema'
import { renderCell } from './renderCell'
import { useColumnWidths } from './useColumnWidths'

const ROW_HEIGHT = 40
const SELECT_WIDTH = 44
// Header cells carry their own sticky + background + bottom rule. Putting any
// of it on <thead> or <tr> instead breaks under border-collapse: rows paint
// over the stuck header and collapsed borders detach from it.
const HEADER_CELL = 'sticky top-0 z-20 bg-slate-100 shadow-[inset_0_-1px_0_0_#cbd5e1]'
const HEADER_CELL_PINNED =
  'sticky top-0 z-30 bg-slate-100 shadow-[inset_0_-1px_0_0_#cbd5e1,1px_0_0_0_#cbd5e1]'

// sensitivity 'base' so "amber" and "Amber" land together; numeric so
// WH-EAST-02 sorts before WH-EAST-10.
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/** Missing values sort last in both directions — a blank isn't "the smallest". */
function comparator(field: FieldDef, direction: 'asc' | 'desc') {
  const sign = direction === 'asc' ? 1 : -1
  const { key, numeric } = field
  return (a: ProductRecord, b: ProductRecord) => {
    const x = a[key]
    const y = b[key]
    const xEmpty = x === null || x === undefined || x === ''
    const yEmpty = y === null || y === undefined || y === ''
    if (xEmpty || yEmpty) return xEmpty && yEmpty ? 0 : xEmpty ? 1 : -1
    if (numeric) return sign * (Number(x) - Number(y))
    return sign * collator.compare(String(x), String(y))
  }
}

interface DataTableProps {
  records: ProductRecord[]
  visibleColumns: string[]
  selectedIds: Set<string>
  onToggleRow: (id: string) => void
  onSelectAllVisible: (ids: string[]) => void
  onDeselectVisible: (ids: string[]) => void
  onOpenRecord: (record: ProductRecord) => void
}

export function DataTable({
  records,
  visibleColumns,
  selectedIds,
  onToggleRow,
  onSelectAllVisible,
  onDeselectVisible,
  onOpenRecord,
}: DataTableProps) {
  const [sort, setSort] = useState<SortState>(null)
  const [isSorting, startSorting] = useTransition()
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

  // Sorting 100k rows is ~200ms of comparator work. It runs in a transition
  // so the click feels instant and the old rows stay interactive meanwhile.
  const sortedRecords = useMemo(() => {
    if (!sort) return records
    const field = FIELD_MAP[sort.key]
    if (!field) return records
    return records.slice().sort(comparator(field, sort.direction))
  }, [records, sort])

  function toggleSort(key: string) {
    startSorting(() =>
      setSort((current) => {
        if (current?.key !== key) return { key, direction: 'asc' }
        return current.direction === 'asc' ? { key, direction: 'desc' } : null
      }),
    )
  }

  const rowVirtualizer = useVirtualizer({
    count: sortedRecords.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalHeight = rowVirtualizer.getTotalSize()
  const padTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const padBottom = virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0

  const gridWidth = columns.reduce((sum, f) => sum + widthOf(f.key), SELECT_WIDTH)

  const { allSelected, someSelected } = useMemo(() => {
    let hits = 0
    for (const record of records) if (selectedIds.has(record.id)) hits++
    return { allSelected: hits > 0 && hits === records.length, someSelected: hits > 0 }
  }, [records, selectedIds])

  if (columns.length === 0) {
    return <EmptyState title="No columns selected" hint="Pick a preset or a few fields from the Columns menu." />
  }
  if (records.length === 0) {
    return <EmptyState title="Nothing matches" hint="Try a broader search, or clear the active filters." />
  }

  return (
    <div ref={scrollRef} className={`relative flex-1 overflow-auto ${resizing ? 'select-none' : ''}`}>
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
                aria-label="Select all matching rows"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allSelected && someSelected
                }}
                onChange={() => {
                  const ids = records.map((r) => r.id)
                  if (allSelected) onDeselectVisible(ids)
                  else onSelectAllVisible(ids)
                }}
                className="size-4 cursor-pointer align-middle accent-indigo-600"
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
                  className={`${idx === 0 ? HEADER_CELL_PINNED : HEADER_CELL} relative select-none whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(field.key)}
                    title={`Sort by ${field.label}`}
                    className={`flex w-full items-center gap-1 hover:text-slate-900 ${
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
                widths — fixed layout would otherwise stretch all of them. */}
            <th aria-hidden className={HEADER_CELL} />
          </tr>
        </thead>

        <tbody className={isSorting ? 'opacity-60 transition-opacity' : ''}>
          {padTop > 0 && (
            <tr aria-hidden style={{ height: padTop }}>
              <td colSpan={columns.length + 2} />
            </tr>
          )}

          {virtualRows.map((virtualRow) => {
            const record = sortedRecords[virtualRow.index]
            const isSelected = selectedIds.has(record.id)
            // Sticky cells sit on top of scrolled content, so their background
            // has to be fully opaque and has to repaint on hover — the <tr>'s
            // own background is underneath them, not visible through them.
            const bg = isSelected ? 'bg-indigo-50' : virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
            const hover = isSelected ? 'hover:bg-indigo-100' : 'hover:bg-slate-100'
            const hoverCell = isSelected ? 'group-hover:bg-indigo-100' : 'group-hover:bg-slate-100'

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
                  if (e.key === 'Enter') onOpenRecord(record)
                }}
                className={`group cursor-pointer border-b border-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${bg} ${hover}`}
              >
                <td style={{ width: SELECT_WIDTH, left: 0 }} className={`sticky z-[5] px-3 ${bg} ${hoverCell}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${record.sku ?? record.id}`}
                    checked={isSelected}
                    onChange={() => onToggleRow(record.id)}
                    className="size-4 cursor-pointer align-middle accent-indigo-600"
                  />
                </td>

                {columns.map((field, idx) => (
                  <td
                    key={field.key}
                    style={{ width: widthOf(field.key), left: idx === 0 ? SELECT_WIDTH : undefined }}
                    className={`overflow-hidden text-ellipsis whitespace-nowrap px-3 text-slate-700 ${
                      field.numeric ? 'text-right' : ''
                    } ${idx === 0 ? `sticky z-[5] shadow-[1px_0_0_0_#e2e8f0] ${bg} ${hoverCell}` : ''}`}
                  >
                    {renderCell(field, record[field.key])}
                  </td>
                ))}
                <td aria-hidden />
              </tr>
            )
          })}

          {padBottom > 0 && (
            <tr aria-hidden style={{ height: padBottom }}>
              <td colSpan={columns.length + 2} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-sm text-slate-500">{hint}</p>
    </div>
  )
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) return <span className="text-xs text-slate-300">↕</span>
  return <span className="text-xs text-indigo-600">{direction === 'asc' ? '↑' : '↓'}</span>
}
