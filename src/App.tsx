import { useState } from 'react'
import { useTableStore } from './store/useTableStore'
import { useFilteredRecords } from './hooks/useFilteredRecords'
import { Toolbar } from './components/Toolbar/Toolbar'
import { DataTable } from './components/DataTable/DataTable'
import { AddRecordForm } from './components/AddRecordForm/AddRecordForm'
import { CsvUploadModal } from './components/CsvUpload/CsvUploadModal'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { Toast } from './components/common/Toast'
import { nextId } from './data/generateData'
import type { ProductRecord } from './types'

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
  const bulkAddRecords = useTableStore((s) => s.bulkAddRecords)
  const deleteRecords = useTableStore((s) => s.deleteRecords)
  const toggleSelected = useTableStore((s) => s.toggleSelected)
  const setSelected = useTableStore((s) => s.setSelected)
  const notify = useTableStore((s) => s.notify)

  const { filteredRecords, matchedCount, isFiltering } = useFilteredRecords(records, searchQuery, filters)

  const [addOpen, setAddOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  function handleAddRecord(partial: Omit<ProductRecord, 'id'>) {
    const record = addRecord(partial)
    notify(`${record.name || record.id} added`)
    setAddOpen(false)
  }

  function handleCsvImport(newRecords: Omit<ProductRecord, 'id'>[]) {
    const count = bulkAddRecords(newRecords)
    notify(`Imported ${count.toLocaleString()} records`)
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const count = deleteTarget.length
    deleteRecords(deleteTarget)
    notify(`Deleted ${count} record${count > 1 ? 's' : ''}`, 'success')
    setDeleteTarget(null)
  }

  function handleDatasetSizeChange(n: number) {
    if (n === datasetSize) return
    setRegenerating(true)
    // Defer one tick so the "Generating…" overlay actually paints before
    // the synchronous generation work runs on the main thread.
    window.setTimeout(() => {
      regenerateDataset(n)
      setSearchQuery('')
      resetFilters()
      notify(`Generated ${n.toLocaleString()} records`)
      setRegenerating(false)
    }, 30)
  }

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 leading-tight">Catalog Manager</h1>
            <p className="text-xs text-slate-400 leading-tight">Product inventory data table</p>
          </div>
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
        onAddRecord={() => setAddOpen(true)}
        onUploadCsv={() => setCsvOpen(true)}
        onDeleteSelected={() => setDeleteTarget([...selectedIds])}
        isFiltering={isFiltering}
        isRegenerating={regenerating}
      />

      <main className="flex-1 flex flex-col min-h-0 relative">
        {regenerating && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="size-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              Generating dataset…
            </div>
          </div>
        )}
        <DataTable
          records={filteredRecords}
          visibleColumns={visibleColumns}
          selectedIds={selectedIds}
          onToggleRow={toggleSelected}
          onToggleAllVisible={(ids) => setSelected([...new Set([...selectedIds, ...ids])])}
          onDeselectVisible={(ids) => {
            const toRemove = new Set(ids)
            setSelected([...selectedIds].filter((id) => !toRemove.has(id)))
          }}
          onDeleteRecord={(id) => setDeleteTarget([id])}
        />
      </main>

      <AddRecordForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddRecord}
        nextIdPreview={nextId(recordSeq)}
      />

      <CsvUploadModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImport={handleCsvImport}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget && deleteTarget.length > 1 ? `Delete ${deleteTarget.length} records?` : 'Delete this record?'}
        description="This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast />
    </div>
  )
}
