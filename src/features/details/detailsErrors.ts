import { ApiError } from '@/shared/api/errors'

/**
 * Android's `ErrorUtils.sanitize(message, fallback)` for the details load.
 * Shared by the details screen and the player, which resolve the same
 * endpoint and must explain its failures the same way.
 */
export function detailsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.hasServerMessage && error.message) return error.message
    if (error.isNetworkError) {
      return 'Unable to reach the server. Check your connection and try again.'
    }
  }
  return "Couldn't load this title right now. Please try again."
}

/**
 * Android decides `notFoundOnServer` by looking for "not found" in the message.
 * This API's 404 copy reads "could not be found", so the status is checked too —
 * same state, reached on the copy the Laravel API actually returns.
 */
export function isNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || /not found/i.test(error.message))
  )
}
