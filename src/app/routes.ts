import type { HomeSection } from '@/shared/api/endpoints'

/**
 * Route builders, mirroring Android's `Screen.*.createRoute`. Every screen
 * identity lives in the URL rather than router state, so a refresh or a
 * shared link lands on the same title instead of a placeholder.
 */

/**
 * `details/{id}?title=…&sourceRef=…` — the provider id is what `GET /movies/{id}`
 * resolves, `title` is the display fallback while details load (or if they
 * never do), and a non-blank `sourceRef` pins the fetch to the record the
 * tapped item came from, exactly like Android's `pinnedSource`.
 */
export function detailsPath(movie: {
  id: string | number
  title: string
  source_ref?: string
}): string {
  const params = new URLSearchParams()
  if (movie.title !== '') params.set('title', movie.title)
  if (movie.source_ref) params.set('sourceRef', movie.source_ref)
  const query = params.toString()
  return `/details/${encodeURIComponent(String(movie.id))}${query ? `?${query}` : ''}`
}

/** Android: `category/{title}/{genre}/{filterKey}`, each segment URI-encoded. */
export function categoryPath(title: string, genre: string, filterKey: string): string {
  return [
    '/category',
    encodeURIComponent(title),
    encodeURIComponent(genre),
    encodeURIComponent(filterKey),
  ].join('/')
}

/** Home "See All" — same three arguments HomeScreen.kt passes. */
export function sectionCategoryPath(section: HomeSection): string {
  return categoryPath(
    section.title,
    section.genre ?? 'ALL',
    section.type === 'latest' ? 'latest' : 'none',
  )
}

/** Details genre chip → "<Genre> Movies". */
export function genreCategoryPath(genre: string): string {
  return categoryPath(`${genre} Movies`, genre, 'none')
}

/** Details VJ chip → "<VJ> Translations" over `filterKey = vj:<VJ>`. */
export function vjCategoryPath(vj: string): string {
  return categoryPath(`${vj} Translations`, 'ALL', `vj:${vj}`)
}
