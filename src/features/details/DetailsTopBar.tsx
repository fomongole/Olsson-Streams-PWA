import { Icon } from '@/components/ui/Icon'
import { useGoBack } from '@/shared/navigation/useGoBack'

/**
 * DetailsTopFloatingBar.kt — the back affordance that stays pinned while the
 * backdrop scrolls underneath (Android keeps it in the outer Box, outside the
 * scrollable Column).
 *
 * Android's right-hand pill holds a bookmark and a cast button; the bookmark
 * arrives with the watchlist in Phase 9 and there is no Chromecast on the web,
 * so only the back circle renders for now.
 */
export function DetailsTopBar() {
  const goBack = useGoBack()

  return (
    <div
      className="fixed inset-x-0 top-0 z-30 flex justify-between px-4"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))', paddingBottom: '8px' }}
    >
      <button
        type="button"
        aria-label="Back"
        onClick={goBack}
        className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-border/50 bg-surface/92 text-white shadow-[0_8px_32px_rgba(0,0,0,0.7)] transition-colors hover:bg-surface"
      >
        <Icon name="arrow_back" className="text-[22px]" />
      </button>
      {/* Right pill (bookmark / cast) lands with Phase 9. */}
      <span aria-hidden="true" />
    </div>
  )
}
