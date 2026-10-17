import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { ErrorState } from '@/components/ui/ErrorState'
import { CategorySection } from '@/features/home/CategorySection'
import { ShelfSkeleton } from '@/features/home/HomeSkeleton'
import { useOpenMovie } from '@/features/details/useOpenMovie'
import { useMovieDetails } from '@/features/details/useMovieDetails'
import { detailsErrorMessage, isNotFound } from '@/features/details/detailsErrors'
import { useOnlineStatus } from '@/features/connection/useOnlineStatus'
import { useUpNext, upNextItems } from '@/features/player/useUpNext'
import { usePlayerEngine } from '@/features/player/usePlayerEngine'
import {
  PlayerControlsOverlay,
  type PlayerMode,
  type ResizeMode,
} from '@/features/player/PlayerControlsOverlay'
import {
  clearProgress,
  loadProgress,
  progressKeyFor,
  saveProgress,
} from '@/features/player/playbackProgress'
import { formatDuration, releaseYear } from '@/features/home/movieMeta'
import { useGoBack } from '@/shared/navigation/useGoBack'
import type { HomeSection } from '@/shared/api/endpoints'

/** Android hides the controls 5 s into playback. */
const CONTROLS_AUTO_HIDE_MS = 5_000

/** Android's `periodic_5s` progress flush. */
const PERIODIC_SAVE_MS = 5_000

const NO_STREAM_MESSAGE = 'No stream is available for this movie.'
const FALLBACK_TITLE = 'Olsson Streams'

/**
 * `ScreenOrientation.lock` is in the spec but absent from TypeScript's
 * lib.dom (only `unlock` was added), and browsers refuse it outside Android
 * Chrome — so it is probed rather than assumed, behind the Fullscreen API.
 */
interface MaybeLockableOrientation extends ScreenOrientation {
  lock?: (extension: string) => Promise<void>
}

/**
 * `PlayerScreen.kt` for the web: video box + controls overlay, with the
 * details column underneath in compact mode.
 *
 * Three Android screen modes survive the trip — `PORTRAIT_COMPACT` (video box
 * over a details column), `PORTRAIT_FULLSCREEN` (video fills the viewport via
 * `position: fixed`) and `LANDSCAPE_FULLSCREEN` (the same, plus the Fullscreen
 * API where the browser allows it). Back is mode-aware exactly as
 * `handlePlayerBack` is.
 *
 * The player renders outside `AppShell` (like the details screen) so neither
 * the desktop header nor the mobile dock sits over the video.
 */
export function PlayerScreen() {
  const { movieId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const titleParam = searchParams.get('title') ?? ''
  const sourceRef = searchParams.get('sourceRef') ?? undefined

  const goBack = useGoBack()
  const openMovie = useOpenMovie()
  const isOnline = useOnlineStatus()

  const { data, error: loadError, isError, refetch } = useMovieDetails(movieId, sourceRef)
  const details = data

  const [mode, setMode] = useState<PlayerMode>('compact')
  const [resizeMode, setResizeMode] = useState<ResizeMode>('fit')
  const [showControls, setShowControls] = useState(true)
  const [pointerActive, setPointerActive] = useState(false)
  const [overviewExpanded, setOverviewExpanded] = useState(false)

  const displayTitle = details?.title ?? titleParam
  const streamUrl = useMemo(
    () => details?.servers.find((server) => server.url.trim() !== '')?.url ?? '',
    [details],
  )
  const progressKey = details === undefined ? '' : progressKeyFor(details)
  const resumeAtMs = useMemo(
    () => (progressKey === '' ? 0 : (loadProgress(progressKey)?.positionMs ?? 0)),
    [progressKey],
  )

  const handleEnded = useCallback(() => {
    if (progressKey !== '') clearProgress(progressKey)
  }, [progressKey])

  const hasDetails = details !== undefined
  const upNext = useUpNext(details, hasDetails)

  const engine = usePlayerEngine({
    streamUrl,
    resumeAtMs,
    online: isOnline,
    onEnded: handleEnded,
  })

  /* ---- Progress persistence ---- */

  const positionRef = useRef({ positionMs: 0, durationMs: 0 })
  useEffect(() => {
    positionRef.current.positionMs = engine.positionMs
    positionRef.current.durationMs = engine.durationMs
  })

  const persist = useCallback(() => {
    if (details === undefined || streamUrl === '') return
    saveProgress({
      progressKey: progressKeyFor(details),
      streamUrl,
      title: displayTitle !== '' ? displayTitle : details.title,
      tmdbId: details.canonical_tmdb_id ?? details.tmdb_id,
      pbId: String(details.id),
      posterUrl: details.poster_url,
      overview: details.overview,
      positionMs: positionRef.current.positionMs,
      durationMs: positionRef.current.durationMs,
      updatedAt: Date.now(),
      sourceRef: details.source_ref ?? '',
      sourceCacheKey: details.source_cache_key ?? '',
    })
  }, [details, streamUrl, displayTitle])

  useEffect(() => {
    if (!engine.playing) return
    const timer = setInterval(persist, PERIODIC_SAVE_MS)
    return () => clearInterval(timer)
  }, [engine.playing, persist])

  // Leaving the tab or the screen both count as an exit Android would flush on.
  useEffect(() => {
    const onPageHide = () => {
      persist()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      persist()
    }
  }, [persist])

  /* ---- Controls visibility ---- */

  // Android keeps the overlay up while paused or buffering, whatever
  // `showControls` says.
  const controlsVisible = showControls || !engine.playing || engine.buffering

  useEffect(() => {
    if (!controlsVisible || !engine.playing || pointerActive) return
    const timer = setTimeout(() => setShowControls(false), CONTROLS_AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [controlsVisible, engine.playing, pointerActive])

  /* ---- Screen modes and the Fullscreen API ---- */

  const containerRef = useRef<HTMLDivElement>(null)

  const enterLandscape = useCallback(() => {
    setMode('landscape')
    setShowControls(true)
    const container = containerRef.current
    void (async () => {
      try {
        if (container !== null && document.fullscreenElement === null) {
          await container.requestFullscreen()
        }
        // Android Chrome only; everywhere else the fixed video box is already
        // a full-viewport surface, so a refusal costs nothing.
        const orientation = screen.orientation as MaybeLockableOrientation
        if (orientation.lock !== undefined && orientation.type.startsWith('portrait')) {
          await orientation.lock('landscape')
        }
      } catch {
        /* the CSS layout still fills the screen */
      }
    })()
  }, [])

  const exitToPortraitFull = useCallback(() => {
    setMode('full')
    setShowControls(true)
    try {
      screen.orientation.unlock()
    } catch {
      /* not every browser exposes an unlock */
    }
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const exitToCompact = useCallback(() => {
    setMode('compact')
    setShowControls(true)
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  // Android's `handlePlayerBack` walks the modes down before leaving.
  const handleBack = () => {
    if (mode === 'landscape') {
      exitToPortraitFull()
      return
    }
    if (mode === 'full') {
      exitToCompact()
      return
    }
    persist()
    goBack()
  }

  // Esc (or the browser's own exit control) leaving fullscreen returns to
  // portrait-full, matching the mode step Android takes.
  useEffect(() => {
    function onFullscreenChange() {
      if (document.fullscreenElement !== null) return
      setMode((current) => (current === 'landscape' ? 'full' : current))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (mode === 'compact') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mode])

  // Never leave a stranded fullscreen session behind on unmount.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement !== null) {
        void document.exitFullscreen().catch(() => undefined)
      }
    }
  }, [])

  /* ---- Keyboard (the desktop affordance for the phone's tap controls) ---- */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === ' ' || event.key === 'k') {
        event.preventDefault()
        engine.togglePlay()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        engine.skip(10_000)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        engine.skip(-10_000)
        return
      }
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        if (mode === 'compact') {
          setMode('full')
          setShowControls(true)
        } else if (mode === 'full') {
          enterLandscape()
        } else {
          exitToPortraitFull()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, engine.togglePlay, engine.skip, enterLandscape, exitToPortraitFull])

  /* ---- Keep the screen awake while playing (Android's FLAG_KEEP_SCREEN_ON) ---- */

  useEffect(() => {
    if (!engine.playing) return
    let cancelled = false
    let released: { release: () => Promise<void> } | null = null
    void navigator.wakeLock
      .request('screen')
      .then((handle) => {
        if (cancelled) {
          void handle.release().catch(() => undefined)
          return
        }
        released = handle
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (released !== null) void released.release().catch(() => undefined)
    }
  }, [engine.playing])

  /* ---- Document title ---- */

  useEffect(() => {
    const previous = document.title
    document.title = displayTitle !== '' ? displayTitle : FALLBACK_TITLE
    return () => {
      document.title = previous
    }
  }, [displayTitle])

  /* ---- States with no playable stream ---- */

  if (details === undefined) {
    if (movieId === '' || (isError && isNotFound(loadError))) {
      return (
        <PlayerUnavailable
          message={
            loadError === undefined
              ? "This title is not available on the server you're currently connected to."
              : detailsErrorMessage(loadError)
          }
          onBack={goBack}
        />
      )
    }
    if (isError) {
      return (
        <div className="relative flex min-h-dvh flex-col bg-bg text-white">
          <BackCircle onClick={goBack} />
          <div className="flex min-h-0 flex-1">
            <ErrorState
              title={isOnline ? 'Something went wrong' : "You're offline"}
              icon={isOnline ? 'error' : 'wifi_off'}
              message={detailsErrorMessage(loadError)}
              onRetry={() => void refetch()}
            />
          </div>
        </div>
      )
    }
  }

  /* ---- Ready (or still resolving) ---- */

  const overlayError =
    engine.error ?? (hasDetails && streamUrl === '' ? NO_STREAM_MESSAGE : null)
  const handleRetry = engine.error !== null ? engine.retry : () => void refetch()
  const overlayTitle = displayTitle !== '' ? displayTitle : FALLBACK_TITLE
  const compact = mode === 'compact'

  const metaText =
    details === undefined
      ? ''
      : [
          releaseYear(details.release_date),
          details.rating > 0 ? details.rating.toFixed(1) : '',
          formatDuration(details.duration),
          details.language.trim(),
        ]
          .filter((part) => part !== '' && part !== 'N/A')
          .join(' · ')
  const overview = details?.overview.trim() ?? ''

  const upNextMovies =
    details === undefined ? [] : upNextItems(details, upNext.data?.items ?? [])
  const upNextSection: HomeSection = {
    id: 'up-next',
    title: 'Up Next',
    icon: 'movie',
    type: 'similar',
    items: upNextMovies,
  }

  return (
    <div className="min-h-dvh bg-bg text-white">
      <div
        ref={containerRef}
        className={
          compact
            ? 'relative h-[260px] w-full bg-black lg:h-[60vh] lg:max-h-[540px]'
            : 'fixed inset-0 z-50 bg-black'
        }
      >
        <video
          ref={engine.videoRef}
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit:
              resizeMode === 'fit' ? 'contain' : resizeMode === 'zoom' ? 'cover' : 'fill',
          }}
          playsInline
          preload="metadata"
        />
        <PlayerControlsOverlay
          mode={mode}
          title={overlayTitle}
          playing={engine.playing}
          buffering={engine.buffering}
          positionMs={engine.positionMs}
          durationMs={engine.durationMs}
          error={overlayError}
          resizeMode={resizeMode}
          showControls={controlsVisible}
          onToggleControls={() => setShowControls((value) => !value)}
          onPointerActivityChange={setPointerActive}
          onBack={handleBack}
          onPlayPause={engine.togglePlay}
          onSkip={engine.skip}
          onSeek={engine.seek}
          onCycleResize={() =>
            setResizeMode((value) =>
              value === 'fit' ? 'zoom' : value === 'zoom' ? 'fill' : 'fit',
            )
          }
          onEnterFull={() => {
            setMode('full')
            setShowControls(true)
          }}
          onExitToCompact={exitToCompact}
          onEnterLandscape={enterLandscape}
          onExitToPortraitFull={exitToPortraitFull}
          onRetry={handleRetry}
        />
      </div>

      {compact && (
        <>
          {details === undefined ? (
            <PlayerDetailsSkeleton />
          ) : (
            <div className="page-container px-[16px] pb-[16px] pt-[12px] lg:px-8">
              <h1 className="t-headline-lg line-clamp-2">{overlayTitle}</h1>

              {metaText !== '' && <p className="t-body-md mt-[6px]">{metaText}</p>}

              {overview !== '' && (
                <>
                  <p
                    className={`t-body-lg mt-[8px] text-white/90 ${
                      overviewExpanded ? '' : 'line-clamp-4'
                    }`}
                  >
                    {overview}
                  </p>
                  {details.overview.length > 180 && (
                    <button
                      type="button"
                      onClick={() => setOverviewExpanded((value) => !value)}
                      className="t-label-md mt-[4px] font-bold text-accent"
                    >
                      {overviewExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {hasDetails &&
            (upNext.isLoading ? (
              <ShelfSkeleton />
            ) : upNextMovies.length > 0 ? (
              <CategorySection section={upNextSection} onMovieClick={openMovie} />
            ) : null)}
        </>
      )}
    </div>
  )
}

/** DetailsSkeleton's shape, in the player's compact column. */
function PlayerDetailsSkeleton() {
  return (
    <>
      <div className="page-container px-[16px] pb-[8px] pt-[12px] lg:px-8">
        <div className="h-[24px] w-[62%] rounded-[6px] shimmer" />
        <div className="mt-[10px] h-[14px] w-[44%] rounded-[6px] shimmer" />
        <div className="mt-[16px] h-[14px] w-full rounded-[6px] shimmer" />
        <div className="mt-[6px] h-[14px] w-full rounded-[6px] shimmer" />
        <div className="mt-[6px] h-[14px] w-[60%] rounded-[6px] shimmer" />
      </div>
      <ShelfSkeleton />
    </>
  )
}

/** `MovieNotFoundOnServer.kt` — no watchlist action until Phase 9. */
function PlayerUnavailable({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-[32px] text-center text-white">
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

/** The details screen's pinned back circle, for the states with no video box. */
function BackCircle({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="flex justify-start px-4 pb-[8px]"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
    >
      <button
        type="button"
        aria-label="Back"
        onClick={onClick}
        className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-border/50 bg-surface/92 text-white shadow-[0_8px_32px_rgba(0,0,0,0.7)] transition-colors hover:bg-surface"
      >
        <Icon name="arrow_back" className="text-[22px]" />
      </button>
    </div>
  )
}
