import { useEffect, useState } from 'react'
import { SLOW_REQUEST_HINT_MS } from '@/shared/config/env'

/**
 * Cold-launch splash, mirroring the Android `Theme.App.Starting` screen:
 * `#0E1621` background, the centred white brand glyph, nothing else.
 *
 * Geometry is taken from the committed iOS startup images so the handoff to
 * them does not jump: the glyph is 17.7% of the viewport width and its centre
 * sits 22% of its own height above the viewport centre (measured across five
 * startup images — width 17.68–18.00%, vertical offset 0.219–0.228×glyph
 * height). The inline `#0e1621` HTML background is the same `--color-bg`, so
 * there is no flash before React paints either.
 *
 * Cold launch only: this component mounts when the app boots and stays mounted
 * for the lifetime of the page, so SPA route changes and returns to the
 * foreground never re-show it (bfcache restores keep React state, so those do
 * not re-run it either).
 *
 * Timing: holds for MIN_MS *and* until the boot gate is ready, then fades out.
 * If boot is still pending at CAP_MS the splash stops holding and fades
 * anyway, so the fade lands exactly when ConnectingGate raises its
 * "Connecting…" hint — otherwise the splash would sit on top of that hint for
 * as long as boot takes (up to BootGate's 15s safety net) and the user would
 * never see it.
 */
const MIN_MS = 2_000
/** Keep in sync with `.splash-overlay` in src/theme/tokens.css. */
const FADE_MS = 320
const CAP_MS = SLOW_REQUEST_HINT_MS - FADE_MS

export function SplashGate({ bootReady }: { bootReady: boolean }) {
  // Start at opacity 0 so the fade-in has a frame to animate from.
  const [shown, setShown] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [gone, setGone] = useState(false)
  const [minElapsed, setMinElapsed] = useState(false)
  const [capped, setCapped] = useState(false)

  // Two frames: the first lets React paint opacity 0, the second flips it on.
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  // Minimum display time, and the point where a slow boot stops being held.
  useEffect(() => {
    const minimum = setTimeout(() => setMinElapsed(true), MIN_MS)
    const cap = setTimeout(() => setCapped(true), CAP_MS)
    return () => {
      clearTimeout(minimum)
      clearTimeout(cap)
    }
  }, [])

  useEffect(() => {
    if (dismissing) return
    if (capped || (bootReady && minElapsed)) setDismissing(true)
  }, [dismissing, capped, bootReady, minElapsed])

  // Unmount once the fade-out has finished (no-op under reduced motion, where
  // the overlay is already invisible by then).
  useEffect(() => {
    if (!dismissing) return
    const timer = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(timer)
  }, [dismissing])

  if (gone) return null

  return (
    <div
      aria-hidden
      className="splash-overlay pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg"
      style={{ opacity: shown && !dismissing ? 1 : 0 }}
    >
      <img
        src="/icons/brand-glyph.png"
        alt=""
        width={362}
        height={367}
        className="w-[17.7vw] max-w-[190px] -translate-y-[22%]"
        decoding="async"
      />
    </div>
  )
}
