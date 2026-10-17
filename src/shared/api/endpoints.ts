/**
 * Boot + auth + content endpoints. More arrive with their phases.
 */

import { apiGet, apiRequest } from './client'
import type { ClientSession } from './session'
import { saveSession } from './session'

/* ---- GET /app/config (public) ---- */

export interface AppConfig {
  app_version: {
    latest_version_code: number
    latest_version_name: string
    apk_url: string
    force_update: boolean
    release_notes: string
  }
  playback: {
    supports_casting: boolean
  }
  capabilities: Record<string, unknown>
  support_contact: {
    whatsapp_number: string
    phone_number: string
    support_name: string
    download_price_ugx: number
    download_upgrade_message: string
  }
  announcement: {
    enabled: boolean
    title: string
    message: string
    type: string
  }
}

export function fetchAppConfig(): Promise<AppConfig> {
  return apiGet<AppConfig>('app/config', { public: true })
}

/* ---- POST /auth/device/check ---- */

export interface DeviceCheckData {
  is_authorized: boolean
  token?: string
  token_type?: string
  expires_in?: number
  code?: string
  assigned_to?: string
  can_download?: boolean
  download_status?: string | null
  download_expires_at?: string | null
  redeemed_at?: string | null
}

export type DeviceCheckResult =
  | { kind: 'authorized'; session: ClientSession }
  | { kind: 'revoked' }
  | { kind: 'network_error' }

/**
 * Mirrors AccessVerificationRepositoryImpl.checkRevocationStatus:
 * save the refreshed session when authorized, clear locally when not,
 * and fail-open on any network error.
 */
export async function checkDevice(
  deviceId: string,
  code: string,
): Promise<DeviceCheckResult> {
  try {
    const { data } = await apiRequest<DeviceCheckData | null>('auth/device/check', {
      method: 'POST',
      body: { device_id: deviceId, code },
    })
    if (data?.is_authorized && data.token) {
      const session: ClientSession = {
        token: data.token,
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + (data.expires_in ?? 0),
        code: data.code ?? code,
        assignedTo: data.assigned_to ?? '',
        canDownload: data.can_download ?? false,
        downloadStatus: data.download_status ?? null,
        downloadExpiresAt: data.download_expires_at ?? null,
      }
      saveSession(session)
      return { kind: 'authorized', session }
    }
    return { kind: 'revoked' }
  } catch {
    // Network errors (and unexpected failures) fail open, like Android.
    return { kind: 'network_error' }
  }
}

/* ---- POST /auth/access-code/verify ---- */

export interface VerifyResponse {
  token?: string
  token_type?: string
  expires_in?: number
  code?: string
  assigned_to?: string
  status?: string
  can_download?: boolean
  download_status?: string | null
  download_expires_at?: string | null
  device_id?: string
  redeemed_at?: string | null
}

/**
 * `public` on purpose: the caller has no token yet, and a stale one left over
 * from a previous session must not ride along on the verify request.
 * Returns the envelope too — `message` carries the copy the Android app toasts
 * ("Access granted."). `data` is nullable because the Android repository also
 * treats a 200 without a session body as a failure.
 */
export function verifyAccessCodeRequest(code: string, deviceId: string) {
  return apiRequest<VerifyResponse | null>('auth/access-code/verify', {
    method: 'POST',
    body: { code, device_id: deviceId },
    public: true,
  })
}

/* ---- GET /home ---- */

/**
 * The shared wire item: `MovieDto::toArray()` plus `decorate()`'s source
 * reference fields. Used by every movie list (home shelves, category results,
 * related rail) and as the base of the details payload.
 */
export interface Movie {
  id: string | number
  tmdb_id: number
  canonical_tmdb_id: number | null
  title: string
  overview: string
  poster_url: string
  backdrop_url: string
  rating: number
  /** Comma-joined list, e.g. "Action,Thriller". */
  genres: string
  release_date: string
  duration: number
  language: string
  vj: string
  logo_url: string
  origin_country: string
  status: string
  /** Present only when the item belongs to a series. */
  series_id?: string | number | null
  series_title?: string | null
  season_number?: number | null
  episode_number?: number | null
  source_ref?: string
  source_cache_key?: string
  source_movie_open_mode?: string
}

export interface HomeSection {
  id: string
  title: string
  /** Android icon name — mapped to a ligature by @/features/home/sectionIcon.ts. */
  icon: string
  type: string
  genre?: string
  items: Movie[]
}

export interface HomeFeed {
  hero: Movie[]
  latest: Movie[]
  /** Non-empty rails only; the client renders exactly this list. */
  sections: HomeSection[]
  /**
   * Always present for client compatibility: adventure/vj_junior/vj_emmy/vj_ulio
   * are always empty, the rest duplicate their `sections` entry. Nothing reads
   * them — `sections` is the source of truth for the shelves.
   */
  action: Movie[]
  adventure: Movie[]
  vj_junior: Movie[]
  comedy: Movie[]
  drama: Movie[]
  vj_emmy: Movie[]
  animation: Movie[]
  horror: Movie[]
  vj_ulio: Movie[]
  scifi: Movie[]
}

export function fetchHome(): Promise<HomeFeed> {
  return apiGet<HomeFeed>('home')
}

/* ---- GET /movies/{id}  and  GET /catalog/source/{reference} ---- */

export interface StreamServer {
  server_name: string
  /** Already scheme-checked server-side: only http(s) survives the DTO. */
  url: string
  quality: string
  /** Only `referer` / `origin` / `user-agent` are ever forwarded. */
  headers: Record<string, string>
  download_url?: string | null
}

/** `MovieDetailsDto::toArray()` — the `Movie` payload plus the stream servers. */
export interface MovieDetails extends Movie {
  servers: StreamServer[]
  /** Only on `/catalog/source/{reference}`: is the saved item's provider the
   *  one this session is pinned to? Gates browsing chips in Android. */
  source_is_current?: boolean
  content_type?: string
}

/**
 * `sourceRef` switches the lookup to the source-pinned endpoint, which is what
 * Android does whenever the tapped item carried a reference (`pinnedSource`).
 * It fetches the same record from the provider that produced it, so a provider
 * failover between the list and the detail cannot swap the title under you.
 */
export function fetchMovieDetails(id: string, sourceRef?: string): Promise<MovieDetails> {
  return apiGet<MovieDetails>(
    sourceRef
      ? `catalog/source/${encodeURIComponent(sourceRef)}`
      : `movies/${encodeURIComponent(id)}`,
  )
}

/** `GET /movies` — paged list; the details screen uses it for the related rail. */
export interface MovieListResponse {
  items: Movie[]
  page: number
  total_pages: number
  total_results: number
  has_more: boolean
}

export function fetchMoviesByGenre(
  genre: string,
  limit = 15,
): Promise<MovieListResponse> {
  const query = new URLSearchParams({ page: '1', limit: String(limit), genre })
  return apiGet<MovieListResponse>(`movies?${query.toString()}`)
}
