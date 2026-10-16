import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  capabilitiesAreSourced,
  getPresentation,
  subscribeBoot,
  subscribePresentation,
  type ClientPresentation,
} from '@/shared/api/presentation'

/**
 * React binding for the presentation capability store. The store itself
 * is updated from response headers (primary) and /app/config (fallback)
 * inside the API client.
 */
export function usePresentation(): ClientPresentation {
  return useSyncExternalStore(subscribePresentation, getPresentation)
}

/** Convenience for the quick-sheet vs details decision (Phase 4/5). */
export function useMovieOpenMode(): 'details' | 'quick_sheet' {
  return usePresentation().movieOpenMode
}

interface BootState {
  /** True once the first /app/config (or first authed response) resolved. */
  ready: boolean
}

const BootContext = createContext<BootState>({ ready: false })

export function BootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(capabilitiesAreSourced())
  useEffect(() => {
    // Boot completes when capabilities arrive (response header or
    // /app/config body — AppConfigProvider marks the latter on settle).
    if (capabilitiesAreSourced()) return
    return subscribeBoot(() => setReady(true))
  }, [])
  // Safety net: never hang the shell behind a dead network. Device check
  // and session refresh both fail open, so a 15s grace is safe.
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => setReady(true), 15_000)
    return () => clearTimeout(timer)
  }, [ready])
  return <BootContext.Provider value={{ ready }}>{children}</BootContext.Provider>
}

export function useBootReady(): boolean {
  return useContext(BootContext).ready
}
