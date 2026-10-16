/**
 * The single fetch wrapper for the Olsson Streams API.
 *
 * Mirrors the Android OkHttp stack:
 * - 90s call timeout (OlssonApiModule)
 * - host failover on network failure (ApiHostFailoverInterceptor)
 * - Bearer auth + single-flight refresh on 401 (LaravelTokenAuthenticator)
 * - response-header capture for presentation + versions
 */

import { ApiError, type ApiEnvelope } from './errors'
import {
  alternateBase,
  configureHosts,
  preferredBase,
  rememberWorkingBase,
} from './hostPolicy'
import { updateCatalogVersion, updateContentSessionVersion } from './contentVersions'
import { updateFromHeader } from './presentation'
import {
  clearSession,
  loadSession,
  loadTokenForRefresh,
  notifyUnauthorized,
  saveSession,
} from './session'
import { config, REQUEST_TIMEOUT_MS } from '@/shared/config/env'

configureHosts(config.apiBaseUrl, config.apiFailoverBaseUrl)

const LOGOUT_ERROR_CODES = new Set(['CODE_REVOKED', 'DEVICE_MISMATCH', 'AUTH_INVALID'])

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** JSON body; omit for GET. */
  body?: unknown
  /** Attach the Bearer token and auto-refresh on 401. Default true. */
  auth?: boolean
  signal?: AbortSignal
  /** Public endpoints skip the auth header entirely. */
  public?: boolean
}

export interface RawResponse<T> {
  data: T
  message: string | null
}

function joinUrl(base: string, path: string): string {
  return `${base}${path.startsWith('/') ? path.slice(1) : path}`
}

function captureHeaders(response: Response): void {
  const presentation = response.headers.get('X-Client-Presentation')
  if (presentation) updateFromHeader(presentation)
  const sessionVersion = response.headers.get('X-Content-Session-Version')
  if (sessionVersion) updateContentSessionVersion(sessionVersion)
  const catalog = response.headers.get('X-Catalog-Version')
  if (catalog) updateCatalogVersion(catalog)
}

function retryAfterSecondsFrom(response: Response, body: unknown): number | null {
  const header = response.headers.get('Retry-After')
  if (header) {
    const asNumber = Number(header)
    if (Number.isFinite(asNumber)) return asNumber
    const asDate = Date.parse(header)
    if (Number.isFinite(asDate)) return Math.max(0, Math.round((asDate - Date.now()) / 1000))
  }
  if (body && typeof body === 'object') {
    const minutesLeft = (body as Record<string, unknown>).minutes_left
    if (typeof minutesLeft === 'number') return minutesLeft * 60
  }
  return null
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON error body.
  }
  const envelope = (body ?? {}) as Partial<ApiEnvelope<unknown>>
  return new ApiError({
    status: response.status,
    code: envelope.error_code ?? null,
    message: envelope.message ?? `Request failed with status ${String(response.status)}.`,
    requestId: envelope.request_id ?? response.headers.get('X-Request-ID'),
    retryAfterSeconds: retryAfterSecondsFrom(response, body),
  })
}

async function doFetch(base: string, path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  // Chain any caller-provided signal into our timeout controller.
  const external = init.signal
  if (external) {
    if (external.aborted) controller.abort()
    else external.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    return await fetch(joinUrl(base, path), { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Single-flight refresh: concurrent 401s share one /auth/refresh call,
 * mirroring LaravelTokenAuthenticator's synchronized refresh.
 */
let refreshPromise: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async () => {
    const token = loadTokenForRefresh()
    if (!token) return false
    try {
      const response = await doFetch(preferredBase(), 'auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      if (!response.ok) {
        const error = await parseError(response)
        if (error.code && LOGOUT_ERROR_CODES.has(error.code)) {
          clearSession()
          notifyUnauthorized()
        }
        return false
      }
      captureHeaders(response)
      const envelope = (await response.json()) as ApiEnvelope<{
        token?: string
        expires_in?: number
        code?: string
        assigned_to?: string
        can_download?: boolean
        download_status?: string | null
        download_expires_at?: string | null
      }>
      const refreshed = envelope.data
      const session = loadSession()
      if (!envelope.success || !refreshed?.token || !session) return false
      saveSession({
        token: refreshed.token,
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 0),
        code: refreshed.code ?? session.code,
        assignedTo: refreshed.assigned_to ?? session.assignedTo,
        canDownload: refreshed.can_download ?? session.canDownload,
        downloadStatus: refreshed.download_status ?? session.downloadStatus,
        downloadExpiresAt: refreshed.download_expires_at ?? session.downloadExpiresAt,
      })
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

/**
 * Core request. Returns the unwrapped envelope `data` plus `message`.
 * Throws ApiError on network failure or non-2xx responses.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<RawResponse<T>> {
  const { method = 'GET', body, auth = true, public: isPublic = false } = options

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const needsAuth = auth && !isPublic
  if (needsAuth) {
    const session = loadSession()
    if (session) headers.Authorization = `Bearer ${session.token}`
  }

  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }

  const attempt = async (): Promise<Response> => {
    const base = preferredBase()
    try {
      const response = await doFetch(base, path, init)
      rememberWorkingBase(base)
      return response
    } catch (failure) {
      // Browser equivalent of UnknownHostException: fetch rejects with a
      // TypeError on DNS/network failure. Mirrors ApiHostFailoverInterceptor.
      const isNetworkFailure =
        failure instanceof TypeError ||
        (failure instanceof DOMException && failure.name === 'AbortError' && !options.signal?.aborted)
      if (!isNetworkFailure || !navigator.onLine) throw failure
      const alternate = alternateBase(base)
      if (!alternate) throw failure
      // Body is a JSON string; safe to resend on the alternate host.
      const response = await doFetch(alternate, path, init)
      rememberWorkingBase(alternate)
      return response
    }
  }

  let response = await attempt()

  // 401 → single-flight refresh → retry once (Android Authenticator parity).
  if (response.status === 401 && needsAuth) {
    const refreshed = await refreshSession()
    if (refreshed) {
      const session = loadSession()
      if (session) {
        headers.Authorization = `Bearer ${session.token}`
        response = await attempt()
      }
    }
  }

  captureHeaders(response)

  if (!response.ok) {
    const error = await parseError(response)
    if (error.code && LOGOUT_ERROR_CODES.has(error.code)) {
      clearSession()
      notifyUnauthorized()
    }
    throw error
  }

  // 204 No Content.
  if (response.status === 204) {
    return { data: undefined as T, message: null }
  }

  const envelope = (await response.json()) as ApiEnvelope<T>
  return { data: envelope.data as T, message: envelope.message ?? null }
}

/** GET helper returning just the data. */
export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await apiRequest<T>(path, { ...options, method: 'GET' })
  return data
}

/** POST helper returning just the data. */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiRequest<T>(path, { method: 'POST', body })
  return data
}
