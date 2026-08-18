import { useEffect, useState } from 'react'
import { useTableStore } from '../../store/useTableStore'

const VISIBLE_MS = 2600

export function Toast() {
  const toast = useTableStore((s) => s.lastToast)
  const [shownId, setShownId] = useState<number | null>(null)

  useEffect(() => {
    if (!toast) return
    setShownId(toast.id)
    const timer = setTimeout(() => setShownId(null), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast || shownId !== toast.id) return null

  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${
          toast.tone === 'error' ? 'bg-rose-600' : 'bg-slate-900'
        }`}
      >
        {toast.message}
      </div>
    </div>
  )
}
