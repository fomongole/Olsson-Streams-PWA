import { useNavigate } from 'react-router-dom'
import { detailsPath } from '@/app/routes'
import { useMovieOpenMode } from '@/features/capabilities/presentation-hooks'
import type { Movie } from '@/shared/api/endpoints'
import { openQuickSheet } from './quickSheetStore'

/**
 * The single entry point for every title tap (hero, shelf card, related rail).
 *
 * Android branches on the **session-wide** `movie_open_mode` capability in
 * `HomeScreen.openMovieCard`. The item's own `source_movie_open_mode` is
 * carried into the sheet request but deliberately does not decide the branch,
 * so this mirrors that.
 */
export function useOpenMovie(): (movie: Movie) => void {
  const navigate = useNavigate()
  const movieOpenMode = useMovieOpenMode()

  return (movie: Movie): void => {
    if (movieOpenMode === 'quick_sheet') {
      openQuickSheet(movie)
      return
    }
    void navigate(detailsPath(movie))
  }
}
