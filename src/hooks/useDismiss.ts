import { useEffect } from 'react'

/**
 * Escape always dismisses. Pass a ref to also dismiss on a click landing
 * outside it (popovers); leave it off for modals, which have a backdrop.
 */
export function useDismiss(onDismiss: () => void, ref?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    function onMouseDown(e: MouseEvent) {
      if (!ref?.current || ref.current.contains(e.target as Node)) return
      onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    if (ref) document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [ref, onDismiss])
}
