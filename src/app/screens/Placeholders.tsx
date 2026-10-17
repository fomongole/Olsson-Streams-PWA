/** Placeholder screens for the routes that arrive with later phases. */

import { useParams } from 'react-router-dom'

function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    // Clears the fixed 72px desktop header (AGENTS.md), and on desktop turns
    // the block into a centred card instead of a phone column stretched wide.
    <div className="page-container mx-auto flex min-h-dvh flex-col justify-center px-6 py-12 lg:items-center lg:px-8 lg:pt-[104px]">
      <div className="w-full lg:max-w-[560px] lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">{hint}</p>
        <div className="mt-8 h-40 rounded-card bg-surface lg:bg-surface-variant" />
      </div>
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

export function CategoryScreen() {
  const { title } = useParams()
  return (
    <Placeholder
      title={title ?? 'Category'}
      hint="The full category listing arrives in Phase 8."
    />
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
