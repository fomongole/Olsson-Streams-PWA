import type { HomeMovie, HomeSection } from '@/shared/api/endpoints'

/**
 * Router state carried between screens. Phase 4 passes the tapped item so the
 * placeholder destinations can name what was opened; Phase 5 replaces the
 * details placeholder with a screen that re-fetches by id rather than
 * trusting this object to still be the full record.
 */
export interface DetailsNavState {
  movie: HomeMovie
}

export interface CategoryNavState {
  section: HomeSection
}
