import { Icon } from '@/components/ui/Icon'
import type { Movie } from '@/shared/api/endpoints'
import { cardMetaText } from './movieMeta'

/**
 * Poster card used by every Home shelf. Mirrors MovieCard.kt: a 135x195
 * poster with the VJ badge and the rating badge pinned flush to two of its
 * corners (inward-rounded so they read as integrated, not overlaid), then a
 * one-line title and a one-line year • genre meta.
 *
 * On desktop the rail sets `--poster-w` on `.shelf-row`, so the card grows
 * with the viewport (~207px at 1440) while keeping the Android aspect ratio,
 * and gains a hover state: scale, accent border and a play overlay. The
 * overlay stays `display:none` below 1024px so touch never latches a hover.
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
      className="group/card w-[135px] shrink-0 text-left lg:w-[var(--poster-w)]"
    >
      <div className="relative h-[195px] w-full overflow-hidden rounded-[12px] border-[0.8px] border-border bg-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-out lg:group-hover/card:scale-[1.05] lg:group-hover/card:border-accent lg:group-hover/card:shadow-[0_8px_24px_rgba(0,0,0,0.55)] lg:group-hover/card:ring-1 lg:group-hover/card:ring-accent/60 lg:group-active/card:scale-[1.02] lg:h-auto lg:aspect-[135/195]">
        <img
          src={movie.poster_url || movie.backdrop_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />

        <span className="absolute inset-0 hidden items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 lg:flex lg:group-hover/card:opacity-100">
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-accent shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
            <Icon name="play_arrow" className="text-[26px] text-white" />
          </span>
        </span>

        {vj !== '' && (
          <span className="absolute left-0 top-0 rounded-br-[8px] bg-accent px-[6px] py-[2.5px] text-[8.5px] font-bold text-white lg:text-[9.5px]">
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
        <p className="truncate text-[10.5px] leading-[16px] text-text-muted lg:text-[11.5px]">
          {meta}
        </p>
      )}
    </button>
  )
}
