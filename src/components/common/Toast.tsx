import { useEffect, useState } from 'react'
import { useTableStore } from '../../store/useTableStore'

export function Toast() {
  const lastToast = useTableStore((s) => s.lastToast)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!lastToast) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2600)
    return () => clearTimeout(t)
  }, [lastToast])

  if (!lastToast || !visible) return null

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-white ${
          lastToast.tone === 'error' ? 'bg-rose-600' : 'bg-slate-900'
        }`}
      >
        {lastToast.message}
      </div>
    </div>
  )
}
