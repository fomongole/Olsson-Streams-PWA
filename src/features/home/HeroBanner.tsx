import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { HomeMovie } from '@/shared/api/endpoints'
import { usePresentation } from '@/features/capabilities/presentation-hooks'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import { heroMetaText, primaryGenre, stableMovieKey } from './movieMeta'

const AUTO_SLIDE_MS = 4500

/**
 * The four-stop scrim from AutoSlidingHeroBanner.kt: transparent black, a
 * slightly stronger black, the page background at 88%, then opaque.
 */
const HERO_SCRIM =
  'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.3333) 33.33%, rgba(14,22,33,0.88) 66.67%, #0e1621 100%)'

/**
 * Auto-sliding hero carousel. Backdrop mode is the default: a cropped
 * backdrop under the scrim with badges, title, overview and two actions.
 * Poster mode swaps that for a blurred backdrop behind a centred poster and
 * a shorter caption, and drops the page dots — both driven by the
 * `heroImage_mode` capability.
 */
export function HeroBanner({
  items,
  onMovieClick,
  onWatchNow,
}: {
  items: HomeMovie[]
  onMovieClick: (movie: HomeMovie) => void
  onWatchNow: (movie: HomeMovie) => void
}) {
  const { heroImageMode, supportsMovieGenres, supportsVjs } = usePresentation()
  const posterMode = heroImageMode === 'poster'
  const reducedMotion = usePrefersReducedMotion()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const canSlide = items.length > 1

  useEffect(() => {
    // A single hero never rotates, and reduced motion turns the carousel
    // into a plain (still swipeable) list — matches WCAG 2.2.2.
    if (!canSlide || reducedMotion) return
    const timer = setInterval(() => {
      const el = scrollRef.current
      if (!el) return
      el.scrollTo({
        left: ((index + 1) % items.length) * el.clientWidth,
        behavior: 'smooth',
      })
    }, AUTO_SLIDE_MS)
    return () => clearInterval(timer)
  }, [canSlide, reducedMotion, index, items.length])

  function handleScroll() {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    setIndex((current) => (current === next ? current : next))
  }

  function goTo(next: number) {
    const el = scrollRef.current
    if (!el) return
    setIndex(next)
    el.scrollTo({
      left: next * el.clientWidth,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {items.map((movie, itemIndex) => (
          <HeroSlide
            key={stableMovieKey(movie, itemIndex)}
            movie={movie}
            posterMode={posterMode}
            supportsMovieGenres={supportsMovieGenres}
            supportsVjs={supportsVjs}
            onMovieClick={onMovieClick}
            onWatchNow={onWatchNow}
          />
        ))}
      </div>

      {/* Dots are z-30, not auto: the slide's tap-anywhere button carries
          z-10, so a z-auto dot row would paint underneath it and never
          receive a click. */}
      {!posterMode && canSlide && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center gap-[6px] pt-[10px]">
          {items.map((movie, dotIndex) => (
            <button
              key={stableMovieKey(movie, dotIndex)}
              type="button"
              aria-label={`Go to slide ${String(dotIndex + 1)}`}
              aria-current={dotIndex === index}
              onClick={() => goTo(dotIndex)}
              className={`rounded-full ${
                dotIndex === index
                  ? 'h-[8px] w-[8px] bg-accent'
                  : 'h-[5px] w-[5px] bg-white/35'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HeroSlide({
  movie,
  posterMode,
  supportsMovieGenres,
  supportsVjs,
  onMovieClick,
  onWatchNow,
}: {
  movie: HomeMovie
  posterMode: boolean
  supportsMovieGenres: boolean
  supportsVjs: boolean
  onMovieClick: (movie: HomeMovie) => void
  onWatchNow: (movie: HomeMovie) => void
}) {
  const vj = movie.vj.trim()
  const genre = supportsMovieGenres ? primaryGenre(movie.genres) : ''
  const image = posterMode ? movie.poster_url : movie.backdrop_url || movie.poster_url

  return (
    <article
      className={`relative w-full shrink-0 snap-start ${posterMode ? 'h-[380px]' : 'h-[430px]'}`}
    >
      <div className="absolute inset-0 overflow-hidden bg-bg">
        <img
          src={image}
          alt=""
          className={`h-full w-full object-cover${posterMode ? ' blur-[24px]' : ''}`}
        />
        <div className="absolute inset-0" style={{ background: HERO_SCRIM }} />
      </div>

      {/* Tap-anywhere target, sitting under the caption and its buttons. */}
      <button
        type="button"
        aria-label={movie.title}
        onClick={() => onMovieClick(movie)}
        className="absolute inset-0 z-10"
      />

      {posterMode ? (
        <div className="relative z-20 flex h-full flex-col items-center justify-center px-[20px] py-[16px] text-center">
          <img
            src={movie.poster_url || movie.backdrop_url}
            alt=""
            className="h-[210px] w-[140px] rounded-[8px] object-cover"
          />
          <h2 className="mt-[16px] line-clamp-2 text-[24px] font-extrabold leading-[32px]">
            {movie.title}
          </h2>
          {vj !== '' && supportsVjs && (
            <p className="mt-[10px] text-[12px] font-semibold leading-[16px] text-white/[0.78]">
              {vj.toUpperCase()}
            </p>
          )}
          {heroMetaText(movie) !== '' && (
            <p className="mt-[8px] line-clamp-2 text-[12px] leading-[16px] text-text-muted">
              {heroMetaText(movie)}
            </p>
          )}
        </div>
      ) : (
        <div className="relative z-20 flex h-full flex-col justify-end px-[20px] pb-[24px] pt-[24px]">
          <div className="flex items-center gap-[8px]">
            {vj !== '' && supportsVjs && (
              <span className="rounded-[4px] bg-accent px-[7px] py-[3px] text-[11px] font-bold leading-[16px] text-white">
                {vj}
              </span>
            )}
            {genre !== '' && (
              <span className="rounded-[4px] bg-surface-variant px-[7px] py-[3px] text-[11px] leading-[16px] text-gold">
                {genre.toUpperCase()}
              </span>
            )}
          </div>

          <h2 className="mt-[8px] line-clamp-2 text-[45px] font-bold leading-[52px]">
            {movie.title}
          </h2>

          {movie.overview.trim() !== '' && (
            <p className="mt-[6px] line-clamp-2 text-[14px] leading-[20px] text-text-muted">
              {movie.overview}
            </p>
          )}

          <div className="mt-[16px] flex gap-[12px]">
            <button
              type="button"
              onClick={() => onWatchNow(movie)}
              className="flex h-[44px] items-center rounded-[8px] bg-accent pl-[16px] pr-[16px] text-[14px] font-semibold leading-[20px] text-white"
            >
              <Icon name="play_arrow" className="mr-[6px] text-[20px] text-white" />
              Watch Now
            </button>
            <button
              type="button"
              onClick={() => onMovieClick(movie)}
              className="flex h-[44px] items-center rounded-[8px] border border-white/40 bg-transparent pl-[16px] pr-[16px] text-[14px] font-semibold leading-[20px] text-white"
            >
              <Icon name="info" className="mr-[6px] text-[18px] text-white" />
              Details
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
