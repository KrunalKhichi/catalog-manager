import { useCallback, useState } from 'react'

const MIN_WIDTH = 64

/**
 * Drag-to-resize column widths, keyed by field. Listeners live on `window`
 * so the drag survives the pointer leaving the 4px-wide handle.
 */
export function useColumnWidths(defaults: Record<string, number>) {
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [resizing, setResizing] = useState<string | null>(null)

  const widthOf = useCallback(
    (key: string) => overrides[key] ?? defaults[key] ?? 140,
    [overrides, defaults],
  )

  const startResize = useCallback(
    (key: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const startX = event.clientX
      const startWidth = overrides[key] ?? defaults[key] ?? 140
      setResizing(key)

      const onMove = (e: MouseEvent) =>
        setOverrides((w) => ({ ...w, [key]: Math.max(MIN_WIDTH, startWidth + e.clientX - startX) }))
      const onUp = () => {
        setResizing(null)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [overrides, defaults],
  )

  return { widthOf, startResize, resizing }
}
