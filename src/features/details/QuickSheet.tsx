import { useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { downloadsEnabled } from '@/features/config/AppConfigProvider'
import { releaseYear } from '@/features/home/movieMeta'
import { showToast } from '@/shared/ui/toast'
import type { Movie } from '@/shared/api/endpoints'

/** Android's join separator; kept verbatim and rendered with `whitespace-pre-wrap`. */
const SHEET_META_SEP = '  ·  '

/**
 * `MovieQuickSheet.kt`'s metadata list: series title (when the item belongs to
 * a series), `S{n}E{n}`, year, one-decimal rating, genres. Built from the
 * tapped item — Android never refetches to render the sheet.
 */
function sheetMetadata(movie: Movie): string {
  const isEpisode = movie.series_id != null
  const sxe =
    isEpisode && movie.season_number != null && movie.episode_number != null
      ? `S${String(movie.season_number)}E${String(movie.episode_number)}`
      : ''
  return [
    isEpisode ? (movie.series_title ?? '') : '',
    sxe,
    releaseYear(movie.release_date),
    movie.rating > 0 ? movie.rating.toFixed(1) : '',
    movie.genres.trim(),
  ]
    .filter((part) => part !== '')
    .join(SHEET_META_SEP)
}

/**
 * CompactMediaBottomSheet.kt, in movie form (`showOverview = false`).
 *
 * Android presents this as a ModalBottomSheet; below `md` the PWA does the
 * same. On a desktop-width viewport it becomes a centred modal instead —
 * a bottom sheet on a 1440px screen looks like an accident.
 */
export function QuickSheet({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const vj = movie.vj.trim()
  const metadata = sheetMetadata(movie)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 bg-black/[0.64]"
      />

      <div className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-[28px] bg-surface text-white shadow-[0_-8px_32px_rgba(0,0,0,0.6)] md:inset-auto md:left-1/2 md:top-1/2 md:w-[560px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[16px]">
        {/* Material3's default sheet drag handle — hidden on the desktop modal. */}
        <span className="mx-auto mt-[8px] h-[4px] w-[32px] shrink-0 rounded-[2px] bg-white/40 md:hidden" />

        <div className="overflow-y-auto px-[20px] pt-[12px] pb-[20px] md:pt-[20px]">
          <div className="flex items-end gap-[16px]">
            <div className="relative h-[210px] w-[140px] shrink-0 overflow-hidden rounded-[8px] bg-surface-variant">
              <img
                src={movie.poster_url || movie.backdrop_url}
                alt=""
                className="h-full w-full object-cover"
              />
              {downloadsEnabled && (
                <button
                  type="button"
                  aria-label="Download for offline"
                  onClick={() => showToast('Downloads arrive in Phase 11.')}
                  className="absolute right-[5px] top-[5px] flex h-[44px] w-[44px] items-center justify-center rounded-[8px] bg-[rgba(16,25,35,0.87)] text-white"
                >
                  <Icon name="file_download" className="text-[24px]" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="t-title-lg line-clamp-3 font-bold">{movie.title}</p>

              {vj !== '' && (
                <p className="t-label-md mt-[10px] font-bold uppercase text-accent">
                  {vj}
                </p>
              )}

              {metadata !== '' && (
                <p className="t-body-sm mt-[8px] line-clamp-2 whitespace-pre-wrap">
                  {metadata}
                </p>
              )}

              <div className="mt-[20px]">
                <button
                  type="button"
                  onClick={() => showToast('Streaming arrives in Phase 6.')}
                  className="flex h-[50px] w-full items-center justify-center rounded-[8px] bg-accent text-white active:bg-accent-pressed"
                >
                  <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white/20">
                    <Icon name="play_arrow" className="text-[18px]" />
                  </span>
                  <span className="t-title-md ml-[10px] font-semibold">Play</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
