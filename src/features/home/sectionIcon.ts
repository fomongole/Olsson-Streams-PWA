import type { IconName } from '@/components/ui/Icon'

/**
 * Maps a home section's provider-supplied icon name (or, as a fallback, its
 * section id) to a subsetted Material Symbols ligature. Mirrors
 * HomeScreen.kt's `homeSectionIcon`, including the id fallbacks — the icon
 * string and the section id are both stable parts of the API contract.
 */
export function sectionIcon(icon: string, id: string): IconName {
  const key = icon.toLowerCase()
  if (key === 'schedule' || id === 'latest') return 'schedule'
  if (key === 'flash' || id === 'action') return 'flash_on'
  if (key === 'smile' || id === 'comedy') return 'sentiment_satisfied_alt'
  if (key === 'theater' || id === 'drama') return 'theater_comedy'
  if (key === 'palette' || id === 'animation') return 'animation'
  if (key === 'moon' || id === 'horror') return 'nightlight_round'
  if (key === 'rocket' || id === 'scifi') return 'rocket_launch'
  // The details screen builds its "Similar & Related Movies" rail through
  // CategorySection and asks for `Icons.Rounded.Movie` by ligature name.
  if (key === 'movie') return 'movie'
  return 'explore'
}
