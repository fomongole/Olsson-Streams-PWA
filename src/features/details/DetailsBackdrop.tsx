import type { MovieDetails } from '@/shared/api/endpoints'

/**
 * DetailsBackdrop.kt — the fixed, non-scrolling layer the header slides over.
 *
 * Two overlays stack on top of the image:
 *  1. a four-stop base scrim that lands on solid background at the bottom
 *     edge, so the backdrop always dissolves into the body colour;
 *  2. a scroll-linked darkness that holds flat through 65% of the height and
 *     then fades to 0, so the already-solid bottom edge never darkens and no
 *     seam appears at any scroll position.
 */

const BASE_SCRIM =
  'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(14,22,33,0.75) 72%, #0e1621 100%)'

/** Matches `280.dp` in Android; the desktop width gets a wider crop. */
export const BACKDROP_HEIGHT = 'h-[280px] lg:h-[460px]'

export function DetailsBackdrop({
  details,
  posterMode,
  darkness,
}: {
  details: MovieDetails
  /** `heroImageMode == 'poster'` — Android blurs the poster in that mode. */
  posterMode: boolean
  /** 0 → 0.85, derived from scroll progress over the backdrop height. */
  darkness: number
}) {
  const image =
    posterMode || details.backdrop_url === ''
      ? details.poster_url || details.backdrop_url
      : details.backdrop_url || details.poster_url

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-0 overflow-hidden ${BACKDROP_HEIGHT}`}
    >
      <img
        src={image}
        alt=""
        className={`h-full w-full object-cover${posterMode ? ' blur-[24px]' : ''}`}
      />
      <div className="absolute inset-0" style={{ background: BASE_SCRIM }} />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,${String(darkness)}) 0%, rgba(0,0,0,${String(darkness)}) 65%, rgba(0,0,0,0) 100%)`,
        }}
      />
    </div>
  )
}
