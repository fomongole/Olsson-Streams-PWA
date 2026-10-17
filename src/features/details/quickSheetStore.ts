import type { Movie } from '@/shared/api/endpoints'

/**
 * Open/close state for the movie quick sheet.
 *
 * The sheet lives at the app root (outside the router) so it survives route
 * changes, which is how Android treats it too — `quickMovieRequest` is held by
 * the ViewModel graph rather than by a screen.
 */

let current: Movie | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function openQuickSheet(movie: Movie): void {
  current = movie
  emit()
}

export function closeQuickSheet(): void {
  if (current === null) return
  current = null
  emit()
}

export function subscribeQuickSheet(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getQuickSheet(): Movie | null {
  return current
}
