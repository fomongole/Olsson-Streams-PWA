/**
 * Presentation capabilities, mirroring the Android ClientPresentationStore.
 *
 * Primary source: the X-Client-Presentation response header (exposed via
 * CORS since the API change). Fallback: the `capabilities` object in the
 * public GET /app/config body — used before the first authenticated
 * response arrives.
 */

export interface ClientPresentation {
  supportsCasting: boolean
  supportsMovieGenres: boolean
  supportsSeriesGenres: boolean
  supportsSeriesCountries: boolean
  seriesDisplayMode: 'rails' | 'grid'
  supportsVjs: boolean
  heroImageMode: string
  movieOpenMode: 'details' | 'quick_sheet'
  seriesOpenMode: string
  episodeOpenMode: string
  searchResultMode: string
  categoryResultMode: string
}

export const DEFAULT_PRESENTATION: ClientPresentation = {
  supportsCasting: false,
  supportsMovieGenres: true,
  supportsSeriesGenres: true,
  supportsSeriesCountries: false,
  seriesDisplayMode: 'rails',
  supportsVjs: true,
  heroImageMode: 'backdrop',
  movieOpenMode: 'details',
  seriesOpenMode: 'details',
  episodeOpenMode: 'play',
  searchResultMode: 'mixed',
  categoryResultMode: 'mixed',
}

export function parsePresentation(json: string): ClientPresentation {
  const obj = JSON.parse(json) as Record<string, unknown>
  const str = (key: string, fallback: string): string =>
    typeof obj[key] === 'string' && obj[key] !== '' ? obj[key] : fallback
  const bool = (key: string, fallback: boolean): boolean =>
    typeof obj[key] === 'boolean' ? obj[key] : fallback

  return {
    supportsCasting: bool('supports_casting', DEFAULT_PRESENTATION.supportsCasting),
    supportsMovieGenres: bool(
      'supports_movie_genres',
      DEFAULT_PRESENTATION.supportsMovieGenres,
    ),
    supportsSeriesGenres: bool(
      'supports_series_genres',
      DEFAULT_PRESENTATION.supportsSeriesGenres,
    ),
    supportsSeriesCountries: bool(
      'supports_series_countries',
      DEFAULT_PRESENTATION.supportsSeriesCountries,
    ),
    seriesDisplayMode: str(
      'series_display_mode',
      DEFAULT_PRESENTATION.seriesDisplayMode,
    ) as 'rails' | 'grid',
    supportsVjs: bool('supports_vjs', DEFAULT_PRESENTATION.supportsVjs),
    heroImageMode: str('hero_image_mode', DEFAULT_PRESENTATION.heroImageMode),
    movieOpenMode: str('movie_open_mode', DEFAULT_PRESENTATION.movieOpenMode) as
      'details' | 'quick_sheet',
    seriesOpenMode: str('series_open_mode', DEFAULT_PRESENTATION.seriesOpenMode),
    episodeOpenMode: str('episode_open_mode', DEFAULT_PRESENTATION.episodeOpenMode),
    searchResultMode: str('search_result_mode', DEFAULT_PRESENTATION.searchResultMode),
    categoryResultMode: str(
      'category_result_mode',
      DEFAULT_PRESENTATION.categoryResultMode,
    ),
  }
}

/* ---- Observable store ---- */

type Listener = (presentation: ClientPresentation) => void

let current: ClientPresentation = { ...DEFAULT_PRESENTATION }
const listeners = new Set<Listener>()

export function getPresentation(): ClientPresentation {
  return current
}

export function setPresentation(presentation: ClientPresentation): void {
  current = presentation
  markCapabilitiesSourced()
  for (const listener of listeners) listener(current)
}

export function updateFromHeader(value: string): void {
  try {
    setPresentation(parsePresentation(value))
  } catch {
    // Malformed header: keep the current values.
  }
}

/** Fallback used at boot / on public routes before any authenticated response. */
export function updateFromAppConfig(capabilities: unknown): void {
  if (capabilities === null || typeof capabilities !== 'object') return
  const json = JSON.stringify(capabilities)
  updateFromHeader(json)
}

export function resetPresentation(): void {
  current = { ...DEFAULT_PRESENTATION }
  for (const listener of listeners) listener(current)
}

export function subscribePresentation(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/* ---- Boot signal ---- */

let capabilitiesSourced = false
const bootListeners = new Set<() => void>()

/**
 * Called by the API client whenever a response carried capabilities, and
 * by AppConfigProvider when the public /app/config request settles. The
 * boot gate opens on the first of these.
 */
export function markCapabilitiesSourced(): void {
  if (capabilitiesSourced) return
  capabilitiesSourced = true
  for (const listener of bootListeners) listener()
}

export function capabilitiesAreSourced(): boolean {
  return capabilitiesSourced
}

export function subscribeBoot(listener: () => void): () => void {
  bootListeners.add(listener)
  return () => bootListeners.delete(listener)
}
