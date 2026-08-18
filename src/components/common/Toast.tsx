import { useEffect, useState } from 'react'
import { useTableStore } from '../../store/useTableStore'

const VISIBLE_MS = 2600
/** An offer to undo is worth reading twice as long as a plain confirmation. */
const ACTIONABLE_MS = 6000

export function Toast() {
  const toast = useTableStore((s) => s.toast)
  const [shownId, setShownId] = useState<number | null>(null)

  useEffect(() => {
    if (!toast) return
    setShownId(toast.id)
    const timer = setTimeout(() => setShownId(null), toast.action ? ACTIONABLE_MS : VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast || shownId !== toast.id) return null

  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div
        className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${
          toast.tone === 'error' ? 'bg-rose-600' : 'bg-slate-900'
        }`}
      >
        <span>{toast.message}</span>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.run()
              setShownId(null)
            }}
            className="rounded px-1.5 py-0.5 font-semibold text-indigo-300 underline decoration-dotted underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
