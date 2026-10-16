import { useEffect, useState } from 'react'
import { isAndroid, isDesktop, isIos, isStandalone } from '@/shared/platform/detect'
import { useAppConfig } from '@/features/config/AppConfigProvider'
import { Icon } from '@/components/ui/Icon'

const IOS_DISMISSED_KEY = 'install_banner_ios_dismissed'
const APK_DISMISSED_KEY = 'install_banner_apk_dismissed'

function isDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return true // Storage disabled: don't nag.
  }
}

function dismiss(key: string): void {
  try {
    localStorage.setItem(key, 'true')
  } catch {
    // Ignore.
  }
}

/**
 * Install banners:
 * - iOS: instructions banner (Share → Add to Home Screen), iOS browsers only
 * - Android: APK download banner, Android browsers only
 * - never on desktop, never in standalone mode; both dismissible + remembered
 */
export function InstallBanners() {
  const { apkUrl, supportWhatsApp } = useAppConfig()
  const [visible, setVisible] = useState<'ios' | 'apk' | null>(null)

  useEffect(() => {
    if (isStandalone() || isDesktop()) return
    if (isIos() && !isDismissed(IOS_DISMISSED_KEY)) {
      setVisible('ios')
      return
    }
    if (isAndroid() && !isDismissed(APK_DISMISSED_KEY)) {
      setVisible('apk')
    }
  }, [])

  if (visible === null) return null

  if (visible === 'ios') {
    return (
      <div className="sticky top-0 z-40 border-b border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-3xl items-start gap-3">
          <Icon name="ios_share" className="mt-0.5 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">Install Olsson Streams</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Tap the Share button, then choose{' '}
              <span className="font-semibold text-text">Add to Home Screen</span>.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss install hint"
            className="msym -m-1 shrink-0 p-1 text-text-muted"
            onClick={() => {
              dismiss(IOS_DISMISSED_KEY)
              setVisible(null)
            }}
          >
            close
          </button>
        </div>
      </div>
    )
  }

  // Android APK banner
  if (!apkUrl) return null
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-3xl items-start gap-3">
          <Icon name="android" className="mt-0.5 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">Get the app</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Install the Android app for the best experience.{' '}
            <a
              href={apkUrl}
              className="font-semibold text-accent underline"
              rel="noopener noreferrer"
            >
              Download APK
            </a>{' '}
            or{' '}
            <a
              href={`https://wa.me/${supportWhatsApp.replace(/^\+/, '')}`}
              className="font-semibold text-accent underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp Fred
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss download banner"
          className="msym -m-1 shrink-0 p-1 text-text-muted"
          onClick={() => {
            dismiss(APK_DISMISSED_KEY)
            setVisible(null)
          }}
        >
          close
        </button>
      </div>
    </div>
  )
}
