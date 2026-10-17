import { Icon } from '@/components/ui/Icon'
import type { Movie } from '@/shared/api/endpoints'
import { cardMetaText } from './movieMeta'

/**
 * Poster card used by every Home shelf. Mirrors MovieCard.kt: a 135x195
 * poster with the VJ badge and the rating badge pinned flush to two of its
 * corners (inward-rounded so they read as integrated, not overlaid), then a
 * one-line title and a one-line year • genre meta.
 */
export function MovieCard({
  movie,
  onClick,
}: {
  movie: Movie
  onClick: (movie: Movie) => void
}) {
  const meta = cardMetaText(movie)
  const vj = movie.vj.trim()

  return (
    <button
      type="button"
      onClick={() => onClick(movie)}
      className="w-[135px] shrink-0 text-left"
    >
      <div className="relative h-[195px] w-[135px] overflow-hidden rounded-[12px] border-[0.8px] border-border bg-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
        <img
          src={movie.poster_url || movie.backdrop_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {vj !== '' && (
          <span className="absolute left-0 top-0 rounded-br-[8px] bg-accent px-[6px] py-[2.5px] text-[8.5px] font-bold text-white">
            {vj}
          </span>
        )}

        {movie.rating > 0 && (
          <span className="absolute bottom-0 right-0 flex items-center rounded-tl-[8px] bg-[rgba(14,22,33,0.9)] px-[8px] py-[3.5px]">
            <Icon name="star" filled className="mr-[3px] text-[10.5px] text-gold" />
            <span className="text-[9px] font-bold text-white">
              {movie.rating.toFixed(1)}
            </span>
          </span>
        )}
      </div>

      <p className="t-label-md mt-[6px] truncate">{movie.title}</p>
      {meta !== '' && (
        <p className="truncate text-[10.5px] leading-[16px] text-text-muted">{meta}</p>
      )}
    </button>
  )
}
