/** Placeholder screens for Phase 1 — real content arrives with later phases. */

function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">{hint}</p>
      <div className="mt-8 h-40 rounded-card bg-surface" />
    </div>
  )
}

export function HomeScreen() {
  return (
    <Placeholder
      title="Home"
      hint="Featured content, continue watching and shelves arrive in Phase 4."
    />
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

export function NotFoundScreen() {
  return <Placeholder title="Page not found" hint="That route doesn’t exist." />
}
