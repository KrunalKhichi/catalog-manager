import { useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ProductRecord } from '../../types'
import { buildColumns } from './columns'
import { RecordDetailPanel } from '../RecordDetailPanel/RecordDetailPanel'

const ROW_HEIGHT = 40
const SELECT_COL_WIDTH = 44

interface DataTableProps {
  records: ProductRecord[]
  visibleColumns: string[]
  selectedIds: Set<string>
  onToggleRow: (id: string) => void
  onToggleAllVisible: (ids: string[]) => void
  onDeselectVisible: (ids: string[]) => void
  onDeleteRecord: (id: string) => void
}

export function DataTable({
  records,
  visibleColumns,
  selectedIds,
  onToggleRow,
  onToggleAllVisible,
  onDeselectVisible,
  onDeleteRecord,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [activeRecord, setActiveRecord] = useState<ProductRecord | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const allSelected = records.length > 0 && records.every((r) => selectedIds.has(r.id))
  const someSelected = records.some((r) => selectedIds.has(r.id))

  const columns = useMemo(
    () =>
      buildColumns(visibleColumns, {
        allSelected,
        someSelected,
        onToggleAll: () => {
          if (allSelected) onDeselectVisible(records.map((r) => r.id))
          else onToggleAllVisible(records.map((r) => r.id))
        },
        isSelected: (id) => selectedIds.has(id),
        onToggleRow,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleColumns, allSelected, someSelected, selectedIds, records],
  )

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalHeight = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0

  const totalTableWidth = table.getAllColumns().reduce((sum, c) => sum + c.getSize(), 0)

  if (records.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        No records match your search and filters.
      </div>
    )
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        <table
          className="border-collapse text-sm"
          style={{ width: totalTableWidth, tableLayout: 'fixed' }}
        >
          <thead className="sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                {headerGroup.headers.map((header, idx) => {
                  const isSticky = idx === 0 || idx === 1
                  const leftOffset = idx === 0 ? 0 : idx === 1 ? SELECT_COL_WIDTH : undefined
                  return (
                    <th
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        left: leftOffset,
                      }}
                      className={`text-left font-semibold text-slate-600 px-3 py-2 select-none whitespace-nowrap overflow-hidden ${
                        isSticky ? 'sticky z-10 bg-slate-50' : ''
                      } ${idx === 1 ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]' : ''}`}
                    >
                      {header.isPlaceholder ? null : header.column.id === '__select' ? (
                        flexRender(header.column.columnDef.header, header.getContext())
                      ) : (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-slate-900 w-full truncate"
                          onClick={header.column.getToggleSortingHandler()}
                          title={`Sort by ${String(header.column.columnDef.header)}`}
                        >
                          <span className="truncate">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <SortIcon direction={header.column.getIsSorted()} />
                        </button>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr style={{ height: paddingTop }}>
                <td colSpan={columns.length} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]
              const isSelected = selectedIds.has(row.original.id)
              return (
                <tr
                  key={row.id}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => setActiveRecord(row.original)}
                  className={`cursor-pointer border-b border-slate-100 hover:bg-indigo-50/60 ${
                    isSelected ? 'bg-indigo-50' : virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  {row.getVisibleCells().map((cell, idx) => {
                    const isSticky = idx === 0 || idx === 1
                    const leftOffset = idx === 0 ? 0 : idx === 1 ? SELECT_COL_WIDTH : undefined
                    return (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize(), left: leftOffset }}
                        className={`px-3 overflow-hidden text-ellipsis whitespace-nowrap text-slate-700 ${
                          isSticky ? `sticky z-[5] ${isSelected ? 'bg-indigo-50' : virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}` : ''
                        } ${idx === 1 ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {paddingBottom > 0 && (
              <tr style={{ height: paddingBottom }}>
                <td colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <RecordDetailPanel
        record={activeRecord}
        onClose={() => setActiveRecord(null)}
        onDelete={(id) => {
          setActiveRecord(null)
          onDeleteRecord(id)
        }}
      />
    </>
  )
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (!direction) {
    return <span className="text-slate-300 text-xs">↕</span>
  }
  return <span className="text-indigo-600 text-xs">{direction === 'asc' ? '↑' : '↓'}</span>
}
