import { useQuery } from '@tanstack/react-query'
import { fetchMoviesByGenre, type Movie, type MovieDetails } from '@/shared/api/endpoints'
import { primaryGenre } from '@/features/home/movieMeta'
import { retryUnlessMissing } from '@/features/details/useMovieDetails'

/** Android asks for page 1, limit 12 of the first genre and nothing else. */
const UP_NEXT_LIMIT = 12

export function useUpNext(details: MovieDetails | undefined, enabled: boolean) {
  const genre = details === undefined ? '' : primaryGenre(details.genres)
  return useQuery({
    queryKey: ['movies', 'genre', genre, 'up-next'],
    queryFn: () => fetchMoviesByGenre(genre, UP_NEXT_LIMIT),
    enabled: enabled && genre !== '',
    staleTime: 5 * 60_000,
    retry: retryUnlessMissing,
  })
}

/**
 * Drops the title you are already watching from the rail.
 *
 * Android only compares `tmdb_id`, which empties the rail entirely on
 * BeeraOnline — every item there carries `tmdb_id = 0`, so the filter removes
 * itself along with everything else. Comparing the provider id as well keeps
 * the exclusion working without that trap, and the numeric comparison stays
 * guarded so a `0` current id cannot swallow a page of `0`s.
 */
export function upNextItems(details: MovieDetails, items: Movie[]): Movie[] {
  const currentTmdbId = details.canonical_tmdb_id ?? details.tmdb_id
  const currentId = String(details.id)
  return items.filter(
    (item) =>
      String(item.id) !== currentId &&
      !(currentTmdbId > 0 && item.tmdb_id === currentTmdbId),
  )
}
