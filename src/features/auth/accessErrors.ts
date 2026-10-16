/**
 * Copy for access-code verification failures.
 *
 * The server's own `message` is the primary source (404 CODE_INVALID,
 * 403 CODE_REVOKED / DEVICE_MISMATCH, 422 validation all ship a specific,
 * human-written line), so this module only supplies wording where the API
 * has nothing to say — plus the rate-limit countdown, which the API reports
 * as `retry_after` seconds rather than as copy.
 *
 * The constants mirror Android's ErrorUtils so the network/server fallbacks
 * read identically in both apps.
 */

import { ApiError } from '@/shared/api/errors'

const NETWORK_ERROR = "We couldn't reach the service right now. Please try again shortly."
const TIMEOUT_ERROR = 'The request took too long. Please try again.'
const SERVER_ERROR = 'The server is temporarily unavailable. Please try again shortly.'
const FALLBACK = "Couldn't verify the access code right now. Please try again."

function formatWait(seconds: number): string {
  const totalSeconds = Math.max(1, Math.ceil(seconds))
  if (totalSeconds >= 60) {
    const minutes = Math.ceil(totalSeconds / 60)
    return minutes === 1 ? '1 minute' : `${String(minutes)} minutes`
  }
  return totalSeconds === 1 ? '1 second' : `${String(totalSeconds)} seconds`
}

export function verifyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return NETWORK_ERROR

    if (error.code === 'RATE_LIMITED') {
      const wait = error.retryAfterSeconds
      if (wait !== null && wait > 0)
        return `Too many failed attempts. Try again in ${formatWait(wait)}.`
      return error.hasServerMessage
        ? error.message.trim()
        : 'Too many attempts. Please try again shortly.'
    }

    if (error.hasServerMessage) return error.message.trim()
    if (error.status === 408 || error.status === 504) return TIMEOUT_ERROR
    if (error.status >= 500) return SERVER_ERROR
    return FALLBACK
  }

  // 90s call timeout surfaces as an aborted fetch rather than an ApiError.
  if (error instanceof DOMException && error.name === 'AbortError') return TIMEOUT_ERROR
  return FALLBACK
}
