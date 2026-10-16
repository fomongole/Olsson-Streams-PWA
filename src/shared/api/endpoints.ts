/**
 * Endpoints needed for the foundation phase: the public app config and
 * the auth device check. More endpoints arrive with their phases.
 */

import { apiGet, apiPost, apiRequest } from './client'
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
export async function checkDevice(deviceId: string, code: string): Promise<DeviceCheckResult> {
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

/* ---- POST /auth/access-code/verify (used by Phase 3, typed here) ---- */

export interface VerifyResponse {
  token?: string
  token_type?: string
  expires_in?: number
  code?: string
  assigned_to?: string
  can_download?: boolean
  download_status?: string | null
  download_expires_at?: string | null
}

export function verifyAccessCodeRequest(code: string, deviceId: string) {
  return apiPost<VerifyResponse>('auth/access-code/verify', { code, device_id: deviceId })
}
