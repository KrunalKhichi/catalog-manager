import { useCallback, useRef, useState } from 'react'
import { useDismiss } from '../../hooks/useDismiss'
import { useTableStore, type SavedView } from '../../store/useTableStore'
import { BookmarkIcon } from '../common/icons'
import { BUTTON } from '../common/ui'

/**
 * A view is a named snapshot of search + filters + sort + columns + page size,
 * kept in localStorage. No backend exists for this app, and a view is a few
 * hundred bytes — localStorage is the whole storage layer.
 */
export function SavedViews() {
  const savedViews = useTableStore((s) => s.savedViews)
  const applyView = useTableStore((s) => s.applyView)
  const saveView = useTableStore((s) => s.saveView)
  const deleteView = useTableStore((s) => s.deleteView)
  const notify = useTableStore((s) => s.notify)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(close, ref)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    saveView(trimmed)
    setName('')
    notify(`View “${trimmed}” saved`)
  }

  function handleApply(view: SavedView) {
    applyView(view)
    setOpen(false)
    notify(`Switched to “${view.name}”`)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className={BUTTON}>
        <BookmarkIcon />
        Views
        {savedViews.length > 0 && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-500">
            {savedViews.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="max-h-64 overflow-y-auto p-2">
            {savedViews.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-slate-400">
                No saved views yet. Set up a search, filters and columns, then save them here.
              </p>
            ) : (
              savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-1 rounded-md px-1 hover:bg-slate-50"
                >
                  <button
                    onClick={() => handleApply(view)}
                    className="min-w-0 flex-1 truncate px-1 py-1.5 text-left text-sm text-slate-700 hover:text-indigo-700"
                  >
                    {view.name}
                  </button>
                  <button
                    onClick={() => {
                      deleteView(view.id)
                      notify(`View “${view.name}” removed`)
                    }}
                    aria-label={`Delete view ${view.name}`}
                    title="Delete view"
                    className="rounded px-1.5 text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSave} className="flex gap-2 border-t border-slate-100 p-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Save current view as…"
              aria-label="Name for the current view"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={name.trim() === ''}
              className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
