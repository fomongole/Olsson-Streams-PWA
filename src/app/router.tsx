import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app-shell/AppShell'
import {
  GenresScreen,
  HomeScreen,
  NotFoundScreen,
  SearchScreen,
  SeriesScreen,
} from './screens/Placeholders'

export function AppRouter() {
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
