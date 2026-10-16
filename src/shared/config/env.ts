function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value.toLowerCase() === 'true'
}

export const config = {
  /** Primary API base URL (Render). Must end with '/'. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  /** Alternate API base URL (duckdns.org). Must end with '/'. */
  apiFailoverBaseUrl: import.meta.env.VITE_API_FAILOVER_BASE_URL,
  features: {
    downloads: bool(import.meta.env.VITE_FEATURE_DOWNLOADS, false),
    push: bool(import.meta.env.VITE_FEATURE_PUSH, false),
  },
} as const

/**
 * OkHttp time limits mirrored from the Android OlssonApiModule:
 * connect 30s, read 60s, write 30s, call 90s. Browsers can't split
 * connect/read/write, so we use a single call timeout of 90s.
 */
export const REQUEST_TIMEOUT_MS = 90_000

/**
 * After this long without a response, UI should show a "connecting"
 * state instead of an error (Render free tier cold starts).
 */
export const SLOW_REQUEST_HINT_MS = 3_000
