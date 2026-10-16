import { useEffect, useRef } from 'react'
import { checkDevice } from '@/shared/api/endpoints'
import {
  clearSession,
  getOrCreateDeviceId,
  loadSession,
  notifyUnauthorized,
} from '@/shared/api/session'
import { clearContentVersions } from '@/shared/api/contentVersions'
import { resetPresentation } from '@/shared/api/presentation'

/** Re-check after this long away from the tab/app (mirrors ON_START semantics). */
const FOREGROUND_RESUME_THRESHOLD_MS = 5 * 60 * 1000

async function runDeviceCheck(): Promise<void> {
  const session = loadSession()
  if (!session) return
  const result = await checkDevice(getOrCreateDeviceId(), session.code)
  if (result.kind === 'revoked') {
    clearSession()
    clearContentVersions()
    resetPresentation()
    notifyUnauthorized()
  }
  // 'authorized' → session already saved by checkDevice.
  // 'network_error' → fail open; do nothing.
}

/**
 * Runs /auth/device/check:
 * - on every cold launch (mount), and
 * - when the app returns to the foreground after a long absence.
 * Fail-open on network errors (handled inside checkDevice).
 */
export function DeviceCheckRunner() {
  const lastHiddenAt = useRef<number | null>(null)

  useEffect(() => {
    // Cold launch.
    void runDeviceCheck()

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt.current = Date.now()
        return
      }
      const hiddenAt = lastHiddenAt.current
      lastHiddenAt.current = null
      if (hiddenAt !== null && Date.now() - hiddenAt >= FOREGROUND_RESUME_THRESHOLD_MS) {
        void runDeviceCheck()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return null
}
