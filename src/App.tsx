import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EMPTY_FILTERS, useTableStore } from './store/useTableStore'
import { useFilteredRecords } from './hooks/useFilteredRecords'
import { useSortedPage } from './hooks/useSortedPage'
import { useCatalogSummary, LOW_STOCK_THRESHOLD } from './hooks/useCatalogSummary'
import { useUrlState } from './hooks/useUrlState'
import { Toolbar } from './components/Toolbar/Toolbar'
import { DataTable } from './components/DataTable/DataTable'
import { Pagination } from './components/DataTable/Pagination'
import { SummaryCards } from './components/SummaryCards'
import { BulkActionBar } from './components/BulkActionBar'
import { ExportDialog, type ExportScope } from './components/ExportDialog'
import { RecordForm } from './components/RecordForm/RecordForm'
import { RecordDetailPanel } from './components/RecordDetailPanel/RecordDetailPanel'
import { CsvUploadModal } from './components/CsvUpload/CsvUploadModal'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { Toast } from './components/common/Toast'
import { nextId } from './data/generateData'
import { FIELD_SCHEMA } from './data/schema'
import { downloadTextFile, recordsToCsv } from './utils/csv'
import { nextSortState } from './utils/sort'
import type { ProductRecord } from './types'

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; record: ProductRecord }
  | { kind: 'import' }
  | { kind: 'export' }
  | { kind: 'confirmDelete'; ids: string[]; label: string }

/** The summary card whose filter is currently applied, or null for a custom set. */
type CardPreset = 'all' | 'active' | 'lowStock' | 'discontinued'

export default function App() {
  const records = useTableStore((s) => s.records)
  const selectedIds = useTableStore((s) => s.selectedIds)
  const searchQuery = useTableStore((s) => s.searchQuery)
  const filters = useTableStore((s) => s.filters)
  const sort = useTableStore((s) => s.sort)
  const page = useTableStore((s) => s.page)
  const pageSize = useTableStore((s) => s.pageSize)
  const visibleColumns = useTableStore((s) => s.visibleColumns)
  const datasetSize = useTableStore((s) => s.datasetSize)
  const recordSeq = useTableStore((s) => s.recordSeq)

  const setSearchQuery = useTableStore((s) => s.setSearchQuery)
  const setFilters = useTableStore((s) => s.setFilters)
  const resetFilters = useTableStore((s) => s.resetFilters)
  const clearSearchAndFilters = useTableStore((s) => s.clearSearchAndFilters)
  const setSort = useTableStore((s) => s.setSort)
  const setPage = useTableStore((s) => s.setPage)
  const setPageSize = useTableStore((s) => s.setPageSize)
  const setVisibleColumns = useTableStore((s) => s.setVisibleColumns)
  const regenerateDataset = useTableStore((s) => s.regenerateDataset)
  const addRecord = useTableStore((s) => s.addRecord)
  const updateRecord = useTableStore((s) => s.updateRecord)
  const patchRecords = useTableStore((s) => s.patchRecords)
  const bulkAddRecords = useTableStore((s) => s.bulkAddRecords)
  const deleteRecords = useTableStore((s) => s.deleteRecords)
  const toggleSelected = useTableStore((s) => s.toggleSelected)
  const selectMany = useTableStore((s) => s.selectMany)
  const deselectMany = useTableStore((s) => s.deselectMany)
  const clearSelection = useTableStore((s) => s.clearSelection)
  const notify = useTableStore((s) => s.notify)

  useUrlState()

  const summary = useCatalogSummary(records)
  const { filteredRecords, matchedCount, isFiltering } = useFilteredRecords(records, searchQuery, filters)
  const {
    pageRecords,
    sortedRecords,
    pageCount,
    rangeStart,
    rangeEnd,
    isSorting,
    page: safePage,
  } = useSortedPage(filteredRecords, sort, page, pageSize)

  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [activeRecord, setActiveRecord] = useState<ProductRecord | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isNarrowed = searchQuery !== '' || matchedCount !== records.length

  // "/" jumps to search the way it does in every other data tool, but only
  // when the user isn't already typing somewhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      // The event target is only an element when focus is inside the page —
      // it can be `document` itself, which has no `closest`.
      const target = e.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
        return
      }
      e.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  /**
   * Regenerating and exporting are both multi-second synchronous jobs. Paint
   * the overlay first, then let a timeout run the work on the next frame —
   * otherwise React batches both and the user just sees a frozen tab.
   */
  const runBlocking = useCallback((label: string, work: () => void) => {
    setBusy(label)
    window.setTimeout(() => {
      try {
        work()
      } finally {
        setBusy(null)
      }
    }, 30)
  }, [])

  function handleCreate(values: Omit<ProductRecord, 'id'>) {
    const record = addRecord(values)
    setDialog(null)
    notify(`${record.name || record.id} added to the top of the table`)
  }

  function handleEdit(values: Omit<ProductRecord, 'id'>) {
    if (dialog?.kind !== 'edit') return
    const updated = updateRecord(dialog.record.id, values)
    setDialog(null)
    if (updated) {
      // Keeping the drawer in sync matters: editing from the drawer and
      // landing back on stale values reads as a failed save.
      if (activeRecord?.id === updated.id) setActiveRecord(updated)
      notify(`${updated.sku ?? updated.id} updated`)
    } else {
      notify('That record no longer exists', 'error')
    }
  }

  function handleImport(rows: Omit<ProductRecord, 'id'>[]) {
    if (rows.length === 0) {
      notify('Nothing to import — every row had errors', 'error')
      return
    }
    const count = bulkAddRecords(rows)
    notify(`Imported ${count.toLocaleString()} records`)
  }

  function handleDeleteConfirmed() {
    if (dialog?.kind !== 'confirmDelete') return
    const { ids } = dialog
    const undo = deleteRecords(ids)
    setDialog(null)
    if (ids.some((id) => id === activeRecord?.id)) setActiveRecord(null)
    const noun = `product${ids.length > 1 ? 's' : ''}`
    notify(`Deleted ${ids.length.toLocaleString()} ${noun}`, 'success', {
      label: 'Undo',
      run: () => {
        undo()
        notify(`Restored ${ids.length.toLocaleString()} ${noun}`)
      },
    })
  }

  function handleDatasetSizeChange(size: number) {
    if (size === datasetSize) return
    runBlocking(`Generating ${size.toLocaleString()} records…`, () => {
      regenerateDataset(size)
      clearSearchAndFilters()
      notify(`Generated ${size.toLocaleString()} records`)
    })
  }

  function handleBulkPatch(patch: Record<string, string>, describe: (n: number) => string) {
    notify(describe(patchRecords([...selectedIds], patch)))
  }

  function handleExport(scope: ExportScope, allColumns: boolean) {
    setDialog(null)
    // Each scope reads from the stage of the pipeline it names, so "Filtered"
    // is the whole matching set — not whatever the virtualiser has mounted.
    const rows =
      scope === 'all'
        ? records
        : scope === 'page'
          ? pageRecords
          : scope === 'filtered'
            ? sortedRecords
            : sortedRecords.filter((r) => selectedIds.has(r.id))

    runBlocking('Building CSV…', () => {
      const keys = allColumns ? ['id', ...FIELD_SCHEMA.map((f) => f.key)] : ['id', ...visibleColumns]
      downloadTextFile(`catalog-${scope}-${rows.length}-rows.csv`, recordsToCsv(rows, keys))
      notify(`Exported ${rows.length.toLocaleString()} rows`)
    })
  }

  /** Which summary card, if any, describes exactly the filter that's applied. */
  const activeCard: CardPreset | null = useMemo(() => {
    const statusOnly =
      filters.category.length === 0 &&
      filters.brand.length === 0 &&
      filters.warehouse.length === 0 &&
      filters.createdFrom === '' &&
      filters.createdTo === '' &&
      filters.ratingMin === '' &&
      filters.ratingMax === '' &&
      filters.priceMin === '' &&
      filters.priceMax === '' &&
      filters.stockMin === ''
    if (!statusOnly || searchQuery !== '') return null

    const noStockCap = filters.stockMax === ''
    if (filters.status.length === 0) return noStockCap ? 'all' : null
    if (filters.status.length !== 1) return null
    if (filters.status[0] === 'Discontinued') return noStockCap ? 'discontinued' : null
    if (filters.status[0] !== 'Active') return null
    if (noStockCap) return 'active'
    return filters.stockMax === String(LOW_STOCK_THRESHOLD - 1) ? 'lowStock' : null
  }, [filters, searchQuery])

  function applyCardFilter(preset: CardPreset) {
    // Clicking the card that's already applied clears it, so the cards toggle.
    if (activeCard === preset || preset === 'all') {
      setFilters(EMPTY_FILTERS)
      return
    }
    setFilters({
      ...EMPTY_FILTERS,
      status: preset === 'discontinued' ? ['Discontinued'] : ['Active'],
      stockMax: preset === 'lowStock' ? String(LOW_STOCK_THRESHOLD - 1) : '',
    })
  }

  const deleteLabel = dialog?.kind === 'confirmDelete' ? dialog.label : ''
  const deleteCount = dialog?.kind === 'confirmDelete' ? dialog.ids.length : 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex size-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
          C
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight text-slate-900">Catalog Manager</h1>
          <p className="text-xs leading-tight text-slate-400">Product inventory data table</p>
        </div>
      </header>

      <SummaryCards summary={summary} onApplyFilter={applyCardFilter} activePreset={activeCard} />

      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        filters={filters}
        facetOptions={summary.facetOptions}
        onFiltersChange={setFilters}
        onResetFilters={resetFilters}
        onClearAll={clearSearchAndFilters}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        datasetSize={datasetSize}
        onDatasetSizeChange={handleDatasetSizeChange}
        totalRecords={records.length}
        matchedCount={matchedCount}
        onAddRecord={() => setDialog({ kind: 'add' })}
        onUploadCsv={() => setDialog({ kind: 'import' })}
        onExportCsv={() => setDialog({ kind: 'export' })}
        isFiltering={isFiltering}
        isBusy={busy !== null}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onSetStatus={(status) =>
          handleBulkPatch({ status }, (n) => `${n.toLocaleString()} products set to ${status}`)
        }
        onSetWarehouse={(warehouse) =>
          handleBulkPatch({ warehouse }, (n) => `${n.toLocaleString()} products moved to ${warehouse}`)
        }
        onExport={() => setDialog({ kind: 'export' })}
        onDelete={() =>
          setDialog({
            kind: 'confirmDelete',
            ids: [...selectedIds],
            label: `${selectedIds.size.toLocaleString()} products`,
          })
        }
        onClear={clearSelection}
      />

      <main className="relative flex min-h-0 flex-1 flex-col">
        {busy && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="size-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              {busy}
            </div>
          </div>
        )}

        <DataTable
          records={pageRecords}
          visibleColumns={visibleColumns}
          selectedIds={selectedIds}
          sort={sort}
          onToggleSort={(key) => setSort(nextSortState(sort, key))}
          onToggleRow={toggleSelected}
          onSelectPage={selectMany}
          onDeselectPage={deselectMany}
          onOpenRecord={setActiveRecord}
          onEditRecord={(record) => setDialog({ kind: 'edit', record })}
          onDeleteRecord={(record) =>
            setDialog({ kind: 'confirmDelete', ids: [record.id], label: String(record.sku ?? record.id) })
          }
          isPending={isSorting || isFiltering}
          isNarrowed={isNarrowed}
          onClearFilters={clearSearchAndFilters}
        />

        <Pagination
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={sortedRecords.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </main>

      {activeRecord && (
        <RecordDetailPanel
          record={activeRecord}
          onClose={() => setActiveRecord(null)}
          onEdit={(record) => setDialog({ kind: 'edit', record })}
          onDelete={(id) =>
            setDialog({ kind: 'confirmDelete', ids: [id], label: String(activeRecord.sku ?? id) })
          }
        />
      )}

      {dialog?.kind === 'add' && (
        <RecordForm
          mode="create"
          nextIdPreview={nextId(recordSeq)}
          skuIndex={summary.skuIndex}
          onClose={() => setDialog(null)}
          onSubmit={handleCreate}
        />
      )}

      {dialog?.kind === 'edit' && (
        <RecordForm
          mode="edit"
          record={dialog.record}
          skuIndex={summary.skuIndex}
          onClose={() => setDialog(null)}
          onSubmit={handleEdit}
        />
      )}

      {dialog?.kind === 'import' && (
        <CsvUploadModal
          existingSkus={new Set(summary.skuIndex.keys())}
          onClose={() => setDialog(null)}
          onImport={handleImport}
        />
      )}

      {dialog?.kind === 'export' && (
        <ExportDialog
          counts={{
            all: records.length,
            page: pageRecords.length,
            filtered: sortedRecords.length,
            selected: selectedIds.size,
          }}
          isNarrowed={isNarrowed}
          columnCount={visibleColumns.length}
          onExport={handleExport}
          onClose={() => setDialog(null)}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'confirmDelete'}
        title={deleteCount > 1 ? `Delete ${deleteCount.toLocaleString()} products?` : 'Delete product?'}
        description={
          deleteCount > 1
            ? `${deleteLabel} will be removed from the catalogue. You can undo this from the notification.`
            : `Are you sure you want to delete ${deleteLabel}? You can undo this from the notification.`
        }
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDialog(null)}
      />

      <Toast />
    </div>
  )
}
