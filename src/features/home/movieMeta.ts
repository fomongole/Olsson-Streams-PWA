import type { HomeMovie } from '@/shared/api/endpoints'

/** First entry of the comma-joined `genres` string, trimmed. */
export function primaryGenre(genres: string): string {
  return (
    genres
      .split(',')
      .map((genre) => genre.trim())
      .find((genre) => genre !== '') ?? ''
  )
}

/** Compose's `String.take(4)` — a bare year prefix, possibly empty. */
export function releaseYear(releaseDate: string): string {
  return releaseDate.slice(0, 4)
}

/** "2018 • Action" — the meta line under a Home poster. Blank when unusable. */
export function cardMetaText(movie: HomeMovie): string {
  return [releaseYear(movie.release_date), primaryGenre(movie.genres)]
    .filter((part) => part !== '' && part !== 'N/A')
    .join(' • ')
}

/**
 * "2018 · 8.5 · Action" — the meta line in the poster-mode hero. Unlike the
 * card, this keeps the full genre string (mirrors AutoSlidingHeroBanner.kt).
 */
export function heroMetaText(movie: HomeMovie): string {
  const rating = movie.rating > 0 ? movie.rating.toFixed(1) : ''
  return [releaseYear(movie.release_date), rating, movie.genres.trim()]
    .filter((part) => part !== '' && part !== 'N/A')
    .join(' · ')
}

/**
 * React key for a movie inside a list. BeeraOnline ids are non-numeric
 * strings and tmdb_id is 0 across that whole catalog, so neither is unique
 * on its own; the index disambiguates a title that appears twice in a shelf.
 */
export function stableMovieKey(movie: HomeMovie, index: number): string {
  return `${String(movie.id)}_${String(movie.tmdb_id)}_${String(index)}`
}
