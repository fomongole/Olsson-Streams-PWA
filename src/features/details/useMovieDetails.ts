import { useQuery } from '@tanstack/react-query'
import {
  fetchMovieDetails,
  fetchMoviesByGenre,
  type MovieDetails,
} from '@/shared/api/endpoints'
import { primaryGenre } from '@/features/home/movieMeta'
import { ApiError } from '@/shared/api/errors'

/**
 * A 404 means the title genuinely is not on the current provider's catalog,
 * so retrying it only delays the "not found" state Android shows. Transient
 * network and 5xx failures still get two more attempts.
 */
export function retryUnlessMissing(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

/**
 * `GET /movies/{id}`, or `GET /catalog/source/{sourceRef}` when the tapped
 * item pinned one. The id and the pin both live in the URL (see routes.ts),
 * so a refresh resolves the same record the first render did.
 */
export function useMovieDetails(id: string, sourceRef?: string) {
  return useQuery({
    queryKey: ['movie-details', id, sourceRef ?? ''],
    queryFn: () => fetchMovieDetails(id, sourceRef),
    staleTime: 5 * 60_000,
    retry: retryUnlessMissing,
    enabled: id !== '',
  })
}

/** The "Similar Movies" rail: the details' first genre, first page. */
export function useRelatedMovies(details: MovieDetails | undefined, enabled: boolean) {
  const genre = details === undefined ? '' : primaryGenre(details.genres)
  return useQuery({
    queryKey: ['movies', 'genre', genre],
    queryFn: () => fetchMoviesByGenre(genre),
    enabled: enabled && genre !== '',
    staleTime: 5 * 60_000,
    retry: retryUnlessMissing,
  })
}
