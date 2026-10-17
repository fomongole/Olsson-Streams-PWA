import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccessScreen } from '@/features/auth/AccessScreen'
import { loadSession, onSessionChanged, onUnauthorized } from '@/shared/api/session'
import { AppShell } from './app-shell/AppShell'
import { DetailsScreen } from './screens/DetailsScreen'
import { HomeScreen } from './screens/HomeScreen'
import {
  CategoryScreen,
  GenresScreen,
  NotFoundScreen,
  ProfileScreen,
  SearchScreen,
  SeriesScreen,
} from './screens/Placeholders'

const REVOKED_NOTICE =
  'Your access has expired or been revoked. Please enter a valid code.'

export function AppRouter() {
  // Re-render when the session changes so the guard below reacts instead of
  // waiting for the next reload: verification only writes the session locally
  // (no other event fires), while a device-check revoke clears it first and
  // then raises the unauthorized event that carries the notice text.
  const [, setTick] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1)
    const unsubscribeSession = onSessionChanged(refresh)
    const unsubscribeUnauthorized = onUnauthorized(() => {
      setNotice(REVOKED_NOTICE)
      refresh()
    })
    return () => {
      unsubscribeSession()
      unsubscribeUnauthorized()
    }
  }, [])

  if (loadSession() === null) return <AccessScreen notice={notice} />

  return (
    <BrowserRouter>
      <Routes>
        {/* Full-bleed: no tab bar or desktop header over the cinematic
            backdrop. The title and any source pin live in the query string so
            a refresh or a shared link resolves the same record (routes.ts). */}
        <Route path="/details/:movieId" element={<DetailsScreen />} />
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="series" element={<SeriesScreen />} />
          <Route path="genres" element={<GenresScreen />} />
          <Route path="search" element={<SearchScreen />} />
          <Route path="category/:title/:genre/:filterKey" element={<CategoryScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
          <Route path="access" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
