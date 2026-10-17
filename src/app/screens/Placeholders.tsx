/** Placeholder screens for the routes that arrive with later phases. */

import { useLocation, useParams } from 'react-router-dom'
import type { CategoryNavState, DetailsNavState } from '@/features/home/navState'

function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">{hint}</p>
      <div className="mt-8 h-40 rounded-card bg-surface" />
    </div>
  )
}

export function SeriesScreen() {
  return <Placeholder title="Series" hint="Series grid and feeds arrive in Phase 7." />
}

export function GenresScreen() {
  return (
    <Placeholder
      title="Genres"
      hint="Movie and series genre browsing arrives in Phase 8."
    />
  )
}

export function SearchScreen() {
  return <Placeholder title="Search" hint="Unified search arrives in Phase 8." />
}

export function DetailsScreen() {
  const state = useLocation().state as DetailsNavState | null
  const title = state?.movie.title ?? 'Details'
  return <Placeholder title={title} hint="Movie details arrive in Phase 5." />
}

export function CategoryScreen() {
  const state = useLocation().state as CategoryNavState | null
  const { sectionId } = useParams()
  const title = state?.section.title ?? sectionId ?? 'Category'
  return (
    <Placeholder title={title} hint="The full category listing arrives in Phase 8." />
  )
}

export function ProfileScreen() {
  return (
    <Placeholder
      title="Profile"
      hint="Account, downloads and local lists arrive in Phase 9."
    />
  )
}

export function NotFoundScreen() {
  return <Placeholder title="Page not found" hint="That route doesn’t exist." />
}
