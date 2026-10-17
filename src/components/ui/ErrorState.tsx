import { Icon } from './Icon'
import type { IconName } from './icons.generated'

/**
 * Full-height error panel from Android's ErrorComponent: icon, title, message
 * and a single retry action. Reused by every screen that can fail to load.
 */
export function ErrorState({
  title,
  message,
  icon,
  onRetry,
  actionLabel = 'Try Again',
}: {
  title: string
  message: string
  icon: IconName
  onRetry: () => void
  actionLabel?: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-[32px] py-[32px] text-center">
      <Icon name={icon} className="text-[64px] text-accent" />
      <h2 className="mt-[16px] text-[22px] font-bold leading-[28px]">{title}</h2>
      <p className="mt-[8px] text-[14px] leading-[20px] text-text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-[24px] rounded-[8px] bg-accent px-[24px] py-[10px] text-[14px] font-semibold leading-[20px] text-white"
      >
        {actionLabel}
      </button>
    </div>
  )
}
