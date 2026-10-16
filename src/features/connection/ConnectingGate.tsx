import { useEffect, useState, type ReactNode } from 'react'
import { SLOW_REQUEST_HINT_MS } from '@/shared/config/env'

/**
 * Wraps the app during slow first requests (Render cold starts): after
 * SLOW_REQUEST_HINT_MS with no resolution, shows a "connecting" state
 * instead of an error. Wired around the boot gate in App.tsx.
 */
export function ConnectingGate({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  const [showConnecting, setShowConnecting] = useState(false)

  useEffect(() => {
    if (!pending) {
      setShowConnecting(false)
      return
    }
    const timer = setTimeout(() => setShowConnecting(true), SLOW_REQUEST_HINT_MS)
    return () => clearTimeout(timer)
  }, [pending])

  if (pending && showConnecting) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6"
        role="status"
        aria-live="polite"
      >
        <img src="/icons/icon-192.png" alt="" className="size-16 animate-pulse rounded-2xl" />
        <p className="text-base font-semibold text-text">Connecting to Olsson Streams…</p>
        <p className="text-center text-sm text-text-muted">
          The server may be waking up. This can take a moment on first launch.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
