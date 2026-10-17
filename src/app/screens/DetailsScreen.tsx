import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { ErrorState } from '@/components/ui/ErrorState'
import { genreCategoryPath, vjCategoryPath } from '@/app/routes'
import { downloadsEnabled } from '@/features/config/AppConfigProvider'
import { usePresentation } from '@/features/capabilities/presentation-hooks'
import { useOnlineStatus } from '@/features/connection/useOnlineStatus'
import { CategorySection } from '@/features/home/CategorySection'
import { ShelfSkeleton } from '@/features/home/HomeSkeleton'
import { useOpenMovie } from '@/features/details/useOpenMovie'
import { useMovieDetails, useRelatedMovies } from '@/features/details/useMovieDetails'
import { DetailsBackdrop } from '@/features/details/DetailsBackdrop'
import { DetailsHeader } from '@/features/details/DetailsHeader'
import { DetailsSkeleton } from '@/features/details/DetailsSkeleton'
import { DetailsTopBar } from '@/features/details/DetailsTopBar'
import { ApiError } from '@/shared/api/errors'
import { useGoBack } from '@/shared/navigation/useGoBack'
import type { HomeSection } from '@/shared/api/endpoints'
import { showToast } from '@/shared/ui/toast'

/** Android's `ErrorUtils.sanitize(message, fallback)` for the details load. */
function detailsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.hasServerMessage && error.message) return error.message
    if (error.isNetworkError) {
      return 'Unable to reach the server. Check your connection and try again.'
    }
  }
  return "Couldn't load this title right now. Please try again."
}

/**
 * Android decides `notFoundOnServer` by looking for "not found" in the message.
 * This API's 404 copy reads "could not be found", so the status is checked too —
 * same screen, reached on the copy the Laravel API actually returns.
 */
function isNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || /not found/i.test(error.message))
  )
}

export function DetailsScreen() {
  const { movieId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const titleParam = searchParams.get('title') ?? ''
  const sourceRef = searchParams.get('sourceRef') ?? undefined

  const navigate = useNavigate()
  const goBack = useGoBack()
  const openMovie = useOpenMovie()
  const isOnline = useOnlineStatus()
  const { heroImageMode } = usePresentation()

  const { data, error, isError, refetch } = useMovieDetails(movieId, sourceRef)
  const details = data
  const sourceIsCurrent = details?.source_is_current !== false
  const related = useRelatedMovies(details, details !== undefined && sourceIsCurrent)

  const [overviewExpanded, setOverviewExpanded] = useState(false)
  const [darkness, setDarkness] = useState(0)

  useEffect(() => {
    const previous = document.title
    const next = details?.title ?? titleParam
    document.title = next !== '' ? next : 'Olsson Streams'
    return () => {
      document.title = previous
    }
  }, [details?.title, titleParam])

  // Android measures 280.dp of scroll as a full backdrop, reaching 0.85f.
  useEffect(() => {
    function update() {
      const height = window.innerWidth >= 768 ? 460 : 280
      setDarkness(Math.min(window.scrollY / height, 1) * 0.85)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  if (details === undefined) {
    if (movieId === '' || (isError && isNotFound(error))) {
      return (
        <MovieNotFound
          message={
            error === undefined
              ? "This title is not available on the server you're currently connected to."
              : detailsErrorMessage(error)
          }
          onBack={goBack}
        />
      )
    }
    if (isError) {
      return (
        <div className="min-h-dvh">
          <ErrorState
            title={isOnline ? 'Something went wrong' : "You're offline"}
            icon={isOnline ? 'error' : 'wifi_off'}
            message={detailsErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        </div>
      )
    }
    return <DetailsSkeleton />
  }

  const pinned = sourceRef !== undefined && sourceRef !== ''
  const itemSourceRef = details.source_ref ?? ''
  // Android: `!pinnedSource || itemSourceRef.isNullOrBlank() || sourceIsCurrent`.
  const canBrowse = !pinned || itemSourceRef === '' || sourceIsCurrent

  const genres = details.genres
    .split(',')
    .map((genre) => genre.trim())
    .filter((genre) => genre !== '')
  const overview = details.overview.trim()

  const primaryStreamUrl =
    details.servers.find((server) => server.url.trim() !== '')?.url ?? ''
  const hasStream = primaryStreamUrl !== ''

  const relatedMovies = related.data?.items ?? []
  const similarSection: HomeSection = {
    id: 'similar',
    title: 'Similar & Related Movies',
    icon: 'movie',
    type: 'similar',
    items: relatedMovies,
  }

  return (
    <div className="relative min-h-dvh bg-bg">
      <DetailsBackdrop
        details={details}
        posterMode={heroImageMode === 'poster'}
        darkness={darkness}
      />
      <DetailsTopBar />

      <div className="relative z-10">
        <DetailsHeader
          details={details}
          canBrowse={canBrowse}
          onVjClick={(name) => void navigate(vjCategoryPath(name))}
        />

        {/*
         * The body carries the transparent → background ramp over its first
         * 180px. On desktop the last three blocks become two columns: identity
         * and actions on the left, the synopsis reading column on the right.
         */}
        <div className="body-fade px-4 pt-[14px] md:grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:gap-x-10 md:px-6 md:pt-[20px]">
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-[8px] md:col-start-1 md:row-start-1">
              {genres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  disabled={!canBrowse}
                  onClick={() => navigate(genreCategoryPath(genre))}
                  className={`t-label-md rounded-[6px] border-[0.6px] border-border bg-surface-variant px-[10px] py-[4px] text-white ${
                    canBrowse ? 'transition-colors hover:bg-border' : 'cursor-default'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}

          <div className="mt-[16px] md:col-start-1 md:row-start-2">
            <button
              type="button"
              disabled={!hasStream}
              onClick={() => showToast('Streaming arrives in Phase 6.')}
              className="flex h-[50px] w-full items-center justify-center rounded-[12px] bg-accent text-white disabled:bg-accent/35 disabled:text-white/70"
            >
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[0.22]">
                <Icon name="play_arrow" className="text-[18px] text-current" />
              </span>
              <span className="ml-[10px] text-[14px] font-bold leading-[20px]">
                Stream Movie
              </span>
            </button>

            {downloadsEnabled && (
              <button
                type="button"
                onClick={() => showToast('Downloads arrive in Phase 11.')}
                className="mt-[10px] flex h-[50px] w-full items-center justify-center rounded-[12px] border border-border bg-surface-variant text-white"
              >
                <Icon name="file_download" className="text-[20px] text-accent" />
                <span className="t-label-lg ml-[8px]">Download for Offline</span>
              </button>
            )}
          </div>

          {/* Sparse metadata must not leave a heading with nothing under it. */}
          {overview !== '' && (
            <div className="mt-[20px] md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0">
              <div className="flex items-center">
                <span className="h-[20px] w-[4px] rounded-[2px] bg-accent" />
                <h2 className="t-headline-md ml-[8px] font-bold">Storyline</h2>
              </div>
              <p
                className={`t-body-lg mt-[6px] text-white/90 ${
                  overviewExpanded ? '' : 'line-clamp-4'
                }`}
              >
                {overview}
              </p>
              {details.overview.length > 180 && (
                <button
                  type="button"
                  onClick={() => setOverviewExpanded((open) => !open)}
                  className="t-label-md mt-[4px] font-bold text-accent"
                >
                  {overviewExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>

        {related.isLoading ? (
          <ShelfSkeleton />
        ) : relatedMovies.length > 0 ? (
          <CategorySection section={similarSection} onMovieClick={openMovie} />
        ) : null}
      </div>
    </div>
  )
}

/**
 * MovieNotFoundOnServer.kt — the bookmark action needs the watchlist store,
 * which lands in Phase 9, so only the back affordance renders for now.
 */
function MovieNotFound({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-[32px] text-center">
      <Icon name="movie" className="text-[56px] text-text-muted" />
      <div className="h-[16px]" />
      <p className="t-title-md">Not Available on Current Server</p>
      <div className="h-[8px]" />
      <p className="t-body-md max-w-md">{message}</p>
      <div className="h-[24px]" />
      <button
        type="button"
        onClick={onBack}
        className="t-label-lg flex items-center rounded-[12px] border border-outline px-[16px] py-[8px] text-accent"
      >
        <Icon name="arrow_back" className="mr-[8px] text-[18px]" />
        Back
      </button>
    </div>
  )
}
