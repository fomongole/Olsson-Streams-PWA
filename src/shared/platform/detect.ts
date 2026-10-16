/** Platform + install-mode detection used by banners and shell layout. */

export function isIos(): boolean {
  const ua = navigator.userAgent
  if (['iPad', 'iPhone', 'iPod'].some((token) => ua.includes(token))) return true
  // iPadOS 13+ reports itself as a Mac but has touch.
  return ua.includes('Macintosh') && navigator.maxTouchPoints > 1
}

export function isAndroid(): boolean {
  return navigator.userAgent.includes('Android')
}

export function isStandalone(): boolean {
  // iOS Safari exposes navigator.standalone (not in the standard types).
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true
  // Chromium / Android TWA / desktop installed
  return window.matchMedia('(display-mode: standalone)').matches
}

export function isDesktop(): boolean {
  return !isIos() && !isAndroid()
}
