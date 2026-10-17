import { Icon } from '@/components/ui/Icon'

/**
 * Floating top-right action pill from HomeTopFloatingBar.kt: a translucent
 * SurfaceDark capsule with a 44dp hit target, pinned under the status bar.
 *
 * Deliberate delta from Android: the cast action is omitted. The PWA has no
 * cast implementation, and a button that silently does nothing is worse than
 * an absent one. Hidden on desktop, where the shell header carries Profile.
 */
export function HomeTopFloatingBar({
  onNavigateToProfile,
}: {
  onNavigateToProfile: () => void
}) {
  return (
    <div className="absolute right-[16px] top-[calc(env(safe-area-inset-top)+8px)] z-30 flex h-[52px] items-center rounded-[36px] border border-border/50 bg-surface/[0.92] px-[6px] py-[4px] shadow-[0_4px_32px_rgba(0,0,0,0.45)] md:hidden">
      <button
        type="button"
        aria-label="Profile"
        onClick={onNavigateToProfile}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-full"
      >
        <Icon name="person" className="text-[24px] text-text" />
      </button>
    </div>
  )
}
