/**
 * Client session storage, mirroring the Android LaravelSessionStore
 * (minus Keystore encryption — browsers have no equivalent; the token
 * lives in localStorage like the Android app stores it in prefs).
 */

export interface ClientSession {
  token: string
  expiresAtEpochSeconds: number
  code: string
  assignedTo: string
  canDownload: boolean
  downloadStatus: string | null
  downloadExpiresAt: string | null
}

const SESSION_KEY = 'olsson_laravel_session'
const DEVICE_ID_KEY = 'olsson_device_id'
const CLOCK_SKEW_SECONDS = 60

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const generated = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, generated)
    return generated
  } catch {
    // Storage disabled: a per-tab id still lets verification succeed.
    return crypto.randomUUID()
  }
}

export function saveSession(session: ClientSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore: the user simply re-verifies next launch.
  }
}

export function loadSession(nowEpochSeconds = Math.floor(Date.now() / 1000)): ClientSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClientSession
    if (!parsed.token) return null
    if (parsed.expiresAtEpochSeconds <= nowEpochSeconds + CLOCK_SKEW_SECONDS) return null
    return parsed
  } catch {
    return null
  }
}

/** The stored token even after local expiry — used for /auth/refresh. */
export function loadTokenForRefresh(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClientSession
    return parsed.token || null
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore.
  }
}

/* ---- Unauthorized event bus (mirrors AuthSessionEvents) ---- */

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

export function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) listener()
}
