import { Icon } from '@/components/ui/Icon'
import type { MovieDetails } from '@/shared/api/endpoints'
import { formatDuration } from '@/features/home/movieMeta'

/**
 * DetailsHeader.kt — the scrollable poster + info row that slides over the
 * fixed backdrop. It only reserves `padding-top: 160dp` (240 on desktop,
 * where the backdrop is taller) so the row lands on the backdrop's lower edge
 * and bottoms out there.
 */
export function DetailsHeader({
  details,
  canBrowse,
  onVjClick,
}: {
  details: MovieDetails
  /** Android's `canBrowseProviderCatalog` — false pins browsing to this title. */
  canBrowse: boolean
  onVjClick: (vj: string) => void
}) {
  const vj = details.vj.trim()
  const year = details.release_date.length >= 4 ? details.release_date.slice(0, 4) : ''
  const duration = formatDuration(details.duration)

  return (
    <div className="flex items-end gap-[14px] px-4 pt-[160px] md:px-6 md:pt-[240px]">
      <img
        src={details.poster_url || details.backdrop_url}
        alt=""
        className="h-[168px] w-[115px] shrink-0 rounded-[12px] border-[0.8px] border-border bg-surface-variant object-cover shadow-[0_12px_24px_rgba(0,0,0,0.45)] md:h-[360px] md:w-[246px]"
      />

      <div className="min-w-0 flex-1">
        <h1 className="t-headline-lg line-clamp-3">{details.title}</h1>

        {vj !== '' && (
          <button
            type="button"
            disabled={!canBrowse}
            onClick={() => onVjClick(vj)}
            className={`mt-[6px] inline-block rounded-[5px] bg-accent px-[7px] py-[3px] text-[10px] font-bold leading-[1.3] text-white ${
              canBrowse ? '' : 'cursor-default opacity-70'
            }`}
          >
            {vj}
          </button>
        )}

        <div className="mt-[6px] flex flex-wrap items-center text-[13px] leading-[19px] text-text-muted">
          {details.rating > 0 && (
            <span className="mr-[10px] flex items-center text-[14px] font-bold text-gold">
              <Icon name="star" filled className="mr-[4px] text-[16px]" />
              {details.rating.toFixed(1)}
            </span>
          )}
          {year !== '' && <span>{year}</span>}
          {duration !== '' && <span className="ml-[8px]">• {duration}</span>}
        </div>
      </div>
    </div>
  )
}
