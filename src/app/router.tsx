import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { loadSession, onUnauthorized } from '@/shared/api/session'
import { AppShell } from './app-shell/AppShell'
import {
  AccessScreen,
  GenresScreen,
  HomeScreen,
  NotFoundScreen,
  SearchScreen,
  SeriesScreen,
} from './screens/Placeholders'

export function AppRouter() {
  // Re-render when the client clears the session (device check revoke, or a
  // 401 carrying CODE_REVOKED / DEVICE_MISMATCH / AUTH_INVALID) so the guard
  // below reacts instead of waiting for the next reload.
  const [, setTick] = useState(0)
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => setTick((n) => n + 1))
    return () => {
      unsubscribe()
    }
  }, [])

  // Phase 3 replaces this with the real access-code flow.
  if (loadSession() === null) return <AccessScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="series" element={<SeriesScreen />} />
          <Route path="genres" element={<GenresScreen />} />
          <Route path="search" element={<SearchScreen />} />
          {/* Access (auth) and detail/player routes arrive with Phases 3–6. */}
          <Route path="access" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
