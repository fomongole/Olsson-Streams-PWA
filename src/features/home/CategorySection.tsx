import { Icon } from '@/components/ui/Icon'
import type { HomeMovie, HomeSection } from '@/shared/api/endpoints'
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
  onMovieClick: (movie: HomeMovie) => void
  onViewAllClick: (section: HomeSection) => void
}) {
  return (
    <section className="pb-[16px]">
      <div className="flex items-center py-[10px] pl-[16px] pr-[16px]">
        <Icon
          name={sectionIcon(section.icon, section.id)}
          className="text-[20px] text-accent"
        />
        {/* Sora runs wider than Roboto, so the Material3 28sp headline would
            push "See All" off a 375px screen. 22px keeps every shipped title
            on one line at the cost of exact parity. */}
        <h2 className="ml-[8px] min-w-0 flex-1 truncate text-[22px] font-bold leading-[28px]">
          {section.title}
        </h2>
        <button
          type="button"
          onClick={() => onViewAllClick(section)}
          className="shrink-0 py-[4px] pl-[12px] pr-[4px] text-[14px] font-semibold leading-[20px] text-accent"
        >
          See All
        </button>
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
