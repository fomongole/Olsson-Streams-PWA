import type { CSSProperties } from 'react'
import type { IconName } from './icons.generated'

/**
 * The only way the UI renders a Material Symbols icon.
 *
 * Renders the icon's ligature name inside a span with the `.msym` class, which
 * maps text like "wifi_off" to a glyph via the subsetted webfont in
 * `public/fonts`. Always mark icons `aria-hidden`; if an icon carries meaning,
 * give the *parent* an `aria-label` (or visible text) instead.
 *
 * `style` exists for sizes that come from data (the player's per-mode control
 * dimensions, for instance): a dynamic `text-[Npx]` class would never be
 * seen by the Tailwind scanner, while an inline style beats `.msym`'s own
 * font-size outright.
 */
export function Icon({
  name,
  className,
  filled = false,
  style,
}: {
  name: IconName
  className?: string
  filled?: boolean
  style?: CSSProperties
}) {
  return (
    <span
      className={`msym${filled ? ' msym-filled' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden
    >
      {name}
    </span>
  )
}

export type { IconName }
