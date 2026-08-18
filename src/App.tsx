import { useState } from 'react'
import { useTableStore } from './store/useTableStore'
import { useFilteredRecords } from './hooks/useFilteredRecords'
import { Toolbar } from './components/Toolbar/Toolbar'
import { DataTable } from './components/DataTable/DataTable'
import { RecordForm } from './components/RecordForm/RecordForm'
import { RecordDetailPanel } from './components/RecordDetailPanel/RecordDetailPanel'
import { CsvUploadModal } from './components/CsvUpload/CsvUploadModal'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { Toast } from './components/common/Toast'
import { nextId } from './data/generateData'
import { downloadTextFile, recordsToCsv } from './utils/csv'
import type { ProductRecord } from './types'

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; record: ProductRecord }
  | { kind: 'import' }
  | { kind: 'confirmDelete'; ids: string[] }

export default function App() {
  const records = useTableStore((s) => s.records)
  const selectedIds = useTableStore((s) => s.selectedIds)
  const searchQuery = useTableStore((s) => s.searchQuery)
  const filters = useTableStore((s) => s.filters)
  const visibleColumns = useTableStore((s) => s.visibleColumns)
  const datasetSize = useTableStore((s) => s.datasetSize)
  const recordSeq = useTableStore((s) => s.recordSeq)

  const setSearchQuery = useTableStore((s) => s.setSearchQuery)
  const setFilters = useTableStore((s) => s.setFilters)
  const resetFilters = useTableStore((s) => s.resetFilters)
  const setVisibleColumns = useTableStore((s) => s.setVisibleColumns)
  const regenerateDataset = useTableStore((s) => s.regenerateDataset)
  const addRecord = useTableStore((s) => s.addRecord)
  const updateRecord = useTableStore((s) => s.updateRecord)
  const bulkAddRecords = useTableStore((s) => s.bulkAddRecords)
  const deleteRecords = useTableStore((s) => s.deleteRecords)
  const toggleSelected = useTableStore((s) => s.toggleSelected)
  const setSelected = useTableStore((s) => s.setSelected)
  const clearSelection = useTableStore((s) => s.clearSelection)
  const notify = useTableStore((s) => s.notify)

  const { filteredRecords, matchedCount, isFiltering } = useFilteredRecords(records, searchQuery, filters)

  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [activeRecord, setActiveRecord] = useState<ProductRecord | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  /**
   * Regenerating and exporting are both multi-second synchronous jobs. Paint
   * the overlay first, then let a timeout run the work on the next frame —
   * otherwise React batches both and the user just sees a frozen tab.
   */
  function runBlocking(label: string, work: () => void) {
    setBusy(label)
    window.setTimeout(() => {
      try {
        work()
      } finally {
        setBusy(null)
      }
    }, 30)
  }

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
      setActiveRecord(updated)
      notify(`${updated.id} updated`)
    } else {
      notify('That record no longer exists', 'error')
    }
  }

  function handleImport(rows: Omit<ProductRecord, 'id'>[]) {
    const count = bulkAddRecords(rows)
    notify(`Imported ${count.toLocaleString()} records`)
  }

  function handleDeleteConfirmed() {
    if (dialog?.kind !== 'confirmDelete') return
    const { ids } = dialog
    deleteRecords(ids)
    setDialog(null)
    setActiveRecord(null)
    notify(`Deleted ${ids.length.toLocaleString()} record${ids.length > 1 ? 's' : ''}`)
  }

  function handleDatasetSizeChange(size: number) {
    if (size === datasetSize) return
    runBlocking(`Generating ${size.toLocaleString()} records…`, () => {
      regenerateDataset(size)
      resetFilters()
      notify(`Generated ${size.toLocaleString()} records`)
    })
  }

  function handleExport() {
    runBlocking('Building CSV…', () => {
      const keys = ['id', ...visibleColumns]
      downloadTextFile(`catalog-${filteredRecords.length}-rows.csv`, recordsToCsv(filteredRecords, keys))
      notify(`Exported ${filteredRecords.length.toLocaleString()} rows`)
    })
  }

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

      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        onResetFilters={resetFilters}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        datasetSize={datasetSize}
        onDatasetSizeChange={handleDatasetSizeChange}
        totalRecords={records.length}
        matchedCount={matchedCount}
        selectedCount={selectedIds.size}
        onAddRecord={() => setDialog({ kind: 'add' })}
        onUploadCsv={() => setDialog({ kind: 'import' })}
        onExportCsv={handleExport}
        onDeleteSelected={() => setDialog({ kind: 'confirmDelete', ids: [...selectedIds] })}
        onClearSelection={clearSelection}
        isFiltering={isFiltering}
        isRegenerating={busy !== null}
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
          records={filteredRecords}
          visibleColumns={visibleColumns}
          selectedIds={selectedIds}
          onToggleRow={toggleSelected}
          onSelectAllVisible={(ids) => setSelected([...new Set([...selectedIds, ...ids])])}
          onDeselectVisible={(ids) => {
            const remove = new Set(ids)
            setSelected([...selectedIds].filter((id) => !remove.has(id)))
          }}
          onOpenRecord={setActiveRecord}
        />
      </main>

      {activeRecord && (
        <RecordDetailPanel
          record={activeRecord}
          onClose={() => setActiveRecord(null)}
          onEdit={(record) => setDialog({ kind: 'edit', record })}
          onDelete={(id) => setDialog({ kind: 'confirmDelete', ids: [id] })}
        />
      )}

      {dialog?.kind === 'add' && (
        <RecordForm
          mode="create"
          nextIdPreview={nextId(recordSeq)}
          onClose={() => setDialog(null)}
          onSubmit={handleCreate}
        />
      )}

      {dialog?.kind === 'edit' && (
        <RecordForm
          mode="edit"
          record={dialog.record}
          onClose={() => setDialog(null)}
          onSubmit={handleEdit}
        />
      )}

      {dialog?.kind === 'import' && (
        <CsvUploadModal onClose={() => setDialog(null)} onImport={handleImport} />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'confirmDelete'}
        title={
          dialog?.kind === 'confirmDelete' && dialog.ids.length > 1
            ? `Delete ${dialog.ids.length.toLocaleString()} records?`
            : 'Delete this record?'
        }
        description="This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDialog(null)}
      />

      <Toast />
    </div>
  )
}
