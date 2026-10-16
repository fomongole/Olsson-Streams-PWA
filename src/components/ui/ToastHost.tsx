import { useEffect, useSyncExternalStore } from 'react'
import { dismissToast, getToast, subscribeToast } from '@/shared/ui/toast'

/** Android Toast.LENGTH_LONG. */
const TOAST_DURATION_MS = 3500

export function ToastHost() {
  const toast = useSyncExternalStore(subscribeToast, getToast, getToast)

  useEffect(() => {
    if (toast === null) return
    const timer = setTimeout(dismissToast, TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast])

  if (toast === null) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-50 flex justify-center px-5 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div
        key={toast.id}
        className="max-w-sm rounded-card border border-border bg-surface px-4 py-3 text-center text-sm leading-snug text-text"
      >
        {toast.message}
      </div>
    </div>
  )
}
