/**
 * Content + catalog version tracking, mirroring the Android
 * ContentSessionVersionProvider and the API's doc guidance.
 *
 * Primary source: X-Content-Session-Version / X-Catalog-Version response
 * headers (exposed via CORS since the API change). Fallback: the
 * authenticated GET /me/content-context body, where Android uses it.
 */

const CONTENT_SESSION_DEFAULT = 'DEFAULT_SESSION'

let contentSessionVersion: string | null = null
let catalogVersion: string | null = null

type Listener = () => void
const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function contentSessionVersionOrNull(): string | null {
  return contentSessionVersion
}

export function catalogVersionOrNull(): string | null {
  return catalogVersion
}

/** Returns true when the revision actually changed (Android parity). */
export function updateContentSessionVersion(version: string): boolean {
  const normalized = version.trim()
  if (normalized === '') return false
  if (contentSessionVersion === normalized) return false
  contentSessionVersion = normalized
  emit()
  return true
}

export function updateCatalogVersion(version: string): boolean {
  const normalized = version.trim()
  if (normalized === '') return false
  if (catalogVersion === normalized) return false
  catalogVersion = normalized
  emit()
  return true
}

export function clearContentVersions(): void {
  contentSessionVersion = null
  catalogVersion = null
  emit()
}

export function subscribeContentVersions(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Fallback from GET /me/content-context (body), used when the headers
 * were not readable or the app has not received an authenticated
 * response yet. Mirrors ContentContextFallback.kt.
 */
export function applyContentContextFallback(body: {
  catalog_version?: string | null
  content_session_version?: string | null
}): void {
  if (body.content_session_version) {
    updateContentSessionVersion(body.content_session_version)
  } else if (contentSessionVersion === null) {
    contentSessionVersion = CONTENT_SESSION_DEFAULT
    emit()
  }
  if (body.catalog_version) {
    updateCatalogVersion(body.catalog_version)
  }
}
