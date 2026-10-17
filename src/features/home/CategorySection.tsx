import { Icon } from '@/components/ui/Icon'
import type { Movie, HomeSection } from '@/shared/api/endpoints'
import { MovieCard } from './MovieCard'
import { sectionIcon } from './sectionIcon'
import { stableMovieKey } from './movieMeta'

/**
 * One Home shelf: icon + title + "See All", then a horizontally scrolling row
 * of posters. Mirrors CategorySection.kt, including the row's edge-to-edge
 * 16px padding so posters bleed past the header's own padding.
 */
export function CategorySection({
  section,
  onMovieClick,
  onViewAllClick,
}: {
  section: HomeSection
  onMovieClick: (movie: Movie) => void
  /** Omitted by the details screen's "Similar" rail, which has no listing to open. */
  onViewAllClick?: (section: HomeSection) => void
}) {
  return (
    <section className="pb-[16px]">
      <div className="flex items-center py-[10px] pl-[16px] pr-[16px]">
        <Icon
          name={sectionIcon(section.icon, section.id)}
          className="text-[20px] text-accent"
        />
        {/* headlineMedium + `.copy(fontWeight = FontWeight.Bold)` = 18sp/700. */}
        <h2 className="t-headline-md ml-[8px] min-w-0 flex-1 truncate font-bold">
          {section.title}
        </h2>
        {onViewAllClick !== undefined && (
          <button
            type="button"
            onClick={() => onViewAllClick(section)}
            className="t-label-lg shrink-0 py-[4px] pl-[12px] pr-[4px] text-accent"
          >
            See All
          </button>
        )}
      </div>

      <div className="no-scrollbar flex gap-[12px] overflow-x-auto px-[16px] pb-[4px]">
        {section.items.map((movie, index) => (
          <MovieCard
            key={stableMovieKey(movie, index)}
            movie={movie}
            onClick={onMovieClick}
          />
        ))}
      </div>
    </section>
  )
}
