import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchAppConfig, type AppConfig } from '@/shared/api/endpoints'
import { markCapabilitiesSourced, updateFromAppConfig } from '@/shared/api/presentation'
import { config } from '@/shared/config/env'

/** Fallback when /app/config is unreachable — matches the Android hardcoded value. */
const FALLBACK_WHATSAPP = '+256754348118'

interface AppConfigState {
  config: AppConfig | null
  isLoading: boolean
  error: unknown
  /** WhatsApp deep-link number, normalized to international form. */
  supportWhatsApp: string
  apkUrl: string
  retry: () => void
}

const AppConfigContext = createContext<AppConfigState | null>(null)

function normalizeWhatsApp(raw: string | null | undefined): string {
  if (!raw) return FALLBACK_WHATSAPP
  const trimmed = raw.replace(/[\s-]/g, '')
  if (trimmed.startsWith('+')) return trimmed
  if (trimmed.startsWith('0')) return `+256${trimmed.slice(1)}`
  return FALLBACK_WHATSAPP
}

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchAppConfig()
      .then((data) => {
        if (cancelled) return
        setAppConfig(data)
        // Fallback source for presentation capabilities (primary: headers).
        updateFromAppConfig(data.capabilities)
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure)
      })
      .finally(() => {
        // Unblock the boot gate even on failure — session refresh and
        // device check fail open, so the shell must still render.
        markCapabilitiesSourced()
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const value: AppConfigState = {
    config: appConfig,
    isLoading,
    error,
    supportWhatsApp: normalizeWhatsApp(appConfig?.support_contact.whatsapp_number),
    apkUrl: appConfig?.app_version.apk_url ?? '',
    retry: () => setAttempt((n) => n + 1),
  }

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>
}

export function useAppConfig(): AppConfigState {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig must be used within AppConfigProvider')
  return ctx
}

/** True when downloads should appear in the nav (Phase 1: always false). */
export const downloadsEnabled = config.features.downloads
