/**
 * API gateway host failover, mirroring the Android
 * ApiGatewayHostPolicy + ApiHostFailoverInterceptor:
 * remember the last working host; on a DNS-style network failure
 * (fetch TypeError), retry the alternate host once (browser equivalent
 * of UnknownHostException + validated internet).
 */

const PREFERRED_HOST_KEY = 'api_gateway_host.preferred_base_url'

function normalizeBase(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

export function isGatewayBase(url: string): boolean {
  const base = normalizeBase(url)
  return base === normalizeBase(primaryBase) || base === normalizeBase(fallbackBase)
}

export let primaryBase = ''
export let fallbackBase = ''

/** Called once at startup with env values. */
export function configureHosts(primary: string, fallback: string): void {
  primaryBase = normalizeBase(primary)
  fallbackBase = normalizeBase(fallback)
}

export function preferredBase(): string {
  try {
    const stored = localStorage.getItem(PREFERRED_HOST_KEY)
    if (stored && isGatewayBase(stored)) return normalizeBase(stored)
  } catch {
    // Private mode / storage disabled: fall through to primary.
  }
  return primaryBase
}

export function alternateBase(current: string): string | null {
  const cur = normalizeBase(current)
  if (cur === primaryBase) return fallbackBase
  if (cur === fallbackBase) return primaryBase
  return null
}

export function rememberWorkingBase(base: string): void {
  try {
    localStorage.setItem(PREFERRED_HOST_KEY, normalizeBase(base))
  } catch {
    // Ignore storage failures; next launch just uses the primary host.
  }
}
