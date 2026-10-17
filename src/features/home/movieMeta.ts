import type { Movie } from '@/shared/api/endpoints'

/** First entry of the comma-joined `genres` string, trimmed. */
export function primaryGenre(genres: string): string {
  return (
    genres
      .split(',')
      .map((genre) => genre.trim())
      .find((genre) => genre !== '') ?? ''
  )
}

/**
 * Android reads `releaseDate.take(4)` verbatim, which is how a card ends up
 * showing "-108": the API's `release_date` is a passthrough of whatever the
 * provider stored (`FormatHelper::parseReleaseDate` only rewrites empty/`0`
 * and all-digit values), and `movieMeta` never transforms it. The reference
 * Flutter app rejects anything `int.tryParse` can't read but still accepts
 * "-108", so it isn't a real guard either.
 *
 * Show the year only when the first four characters are a plausible calendar
 * year; otherwise return '' so the meta line drops it and shows genre alone.
 */
export function releaseYear(releaseDate: string): string {
  const candidate = releaseDate.slice(0, 4)
  if (!/^\d{4}$/.test(candidate)) return ''
  const year = Number(candidate)
  const maxYear = new Date().getFullYear() + 1
  return year >= 1900 && year <= maxYear ? candidate : ''
}

/** "2018 • Action" — the meta line under a Home poster. Blank when unusable. */
export function cardMetaText(movie: Movie): string {
  return [releaseYear(movie.release_date), primaryGenre(movie.genres)]
    .filter((part) => part !== '' && part !== 'N/A')
    .join(' • ')
}

/**
 * "2018 · 8.5 · Action" — the meta line in the poster-mode hero. Unlike the
 * card, this keeps the full genre string (mirrors AutoSlidingHeroBanner.kt).
 */
export function heroMetaText(movie: Movie): string {
  const rating = movie.rating > 0 ? movie.rating.toFixed(1) : ''
  return [releaseYear(movie.release_date), rating, movie.genres.trim()]
    .filter((part) => part !== '' && part !== 'N/A')
    .join(' · ')
}

/**
 * Android's `FormatUtils.formatDuration` — minutes to "2h 30m" / "2h" / "45m".
 * Blank for a non-positive runtime, which is how Android hides the duration.
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours > 0 && rest > 0) return `${String(hours)}h ${String(rest)}m`
  if (hours > 0) return `${String(hours)}h`
  return `${String(rest)}m`
}

/**
 * React key for a movie inside a list. BeeraOnline ids are non-numeric
 * strings and tmdb_id is 0 across that whole catalog, so neither is unique
 * on its own; the index disambiguates a title that appears twice in a shelf.
 */
export function stableMovieKey(movie: Movie, index: number): string {
  return `${String(movie.id)}_${String(movie.tmdb_id)}_${String(index)}`
}
