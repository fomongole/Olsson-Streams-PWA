import type { IconName } from './icons.generated'

/**
 * The only way the UI renders a Material Symbols icon.
 *
 * Renders the icon's ligature name inside a span with the `.msym` class, which
 * maps text like "wifi_off" to a glyph via the subsetted webfont in
 * public/fonts. Always mark icons `aria-hidden`; if an icon carries meaning,
 * give the *parent* an `aria-label` (or visible text) instead.
 */
export function Icon({
  name,
  className,
  filled = false,
}: {
  name: IconName
  className?: string
  filled?: boolean
}) {
  return (
    <span
      className={`msym${filled ? ' msym-filled' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {name}
    </span>
  )
}

export type { IconName }
