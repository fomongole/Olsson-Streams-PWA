import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import type { Movie, HomeSection } from '@/shared/api/endpoints'
import { MovieCard } from './MovieCard'
import { sectionIcon } from './sectionIcon'
import { stableMovieKey } from './movieMeta'

const CARD_GAP = 16
const CARDS_PER_STEP = 3

/**
 * One Home shelf: icon + title + "See All", then a horizontally scrolling row
 * of posters. Mirrors CategorySection.kt, including the row's edge-to-edge
 * 16px padding so posters bleed past the header's own padding.
 *
 * Desktop (>=1024px) adds the affordances a mouse and keyboard expect:
 * a shared 1600px container, hover-revealed arrow buttons, arrow-key
 * scrolling, a right-edge fade while more content is reachable, and the
 * card hover state defined in MovieCard. See AGENTS.md.
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
  const rowRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return

    const update = () => {
      setCanScrollLeft(row.scrollLeft > 2)
      setCanScrollRight(row.scrollLeft + row.clientWidth < row.scrollWidth - 2)
    }
    update()
    row.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      row.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [section.items.length])

  function scrollByCards(direction: 1 | -1) {
    const row = rowRef.current
    if (!row) return
    const firstCard = row.firstElementChild as HTMLElement | null
    const step =
      firstCard !== null
        ? (firstCard.offsetWidth + CARD_GAP) * CARDS_PER_STEP
        : row.clientWidth * 0.8
    row.scrollBy({
      left: direction * step,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    scrollByCards(event.key === 'ArrowRight' ? 1 : -1)
  }

  const arrowClass = (position: 'left-0' | 'right-0'): string =>
    [
      'shelf-arrow absolute z-20 hidden h-[40px] w-[40px] -translate-y-1/2 items-center justify-center',
      position,
      'rounded-full border border-border bg-surface/95 text-text opacity-0 shadow-[0_6px_20px_rgba(0,0,0,0.5)]',
      'transition-opacity duration-200 hover:border-accent hover:text-accent',
      'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
      'lg:flex lg:group-hover/shelf:opacity-100 lg:group-focus-within/shelf:opacity-100',
    ].join(' ')

  return (
    <section className="group/shelf relative pb-[16px]">
      <div className="page-container flex items-center py-[10px] px-[16px] lg:px-8">
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
            className="t-label-lg shrink-0 py-[4px] pl-[12px] pr-[4px] text-accent transition-opacity lg:hover:opacity-80"
          >
            See All
          </button>
        )}
      </div>

      <div className="shelf-row page-container relative">
        <div
          ref={rowRef}
          onKeyDown={handleRowKeyDown}
          tabIndex={0}
          role="region"
          aria-label={`${section.title} posters`}
          className="no-scrollbar flex gap-[12px] overflow-x-auto px-[16px] pb-[4px] outline-none focus-visible:ring-1 focus-visible:ring-accent/50 lg:gap-[16px] lg:px-8 lg:py-[8px]"
        >
          {section.items.map((movie, index) => (
            <MovieCard
              key={stableMovieKey(movie, index)}
              movie={movie}
              onClick={onMovieClick}
            />
          ))}
        </div>

        {canScrollRight && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-[96px] bg-gradient-to-l from-bg via-bg/75 to-transparent lg:block"
          />
        )}

        {canScrollLeft && (
          <button
            type="button"
            aria-label={`Scroll ${section.title} left`}
            onClick={() => scrollByCards(-1)}
            className={arrowClass('left-0')}
          >
            <Icon name="chevron_left" className="text-[22px]" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            aria-label={`Scroll ${section.title} right`}
            onClick={() => scrollByCards(1)}
            className={arrowClass('right-0')}
          >
            <Icon name="chevron_right" className="text-[22px]" />
          </button>
        )}
      </div>
    </section>
  )
}
