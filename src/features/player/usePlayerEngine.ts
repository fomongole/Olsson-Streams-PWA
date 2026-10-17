import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type HlsInstance from 'hls.js'
import { showToast } from '@/shared/ui/toast'

/**
 * The `<video>` wrapper: source attachment (HLS through a lazily imported
 * hls.js, everything else straight onto the element), playback state, and the
 * error copy Android's `PlayerViewModel` surfaces.
 *
 * Mirrors of the Android timings live here too: 500 ms-class position
 * updates come from `timeupdate`, buffering gives up after 60 s with a toast,
 * and resume is applied silently once metadata lands.
 */

const BUFFERING_TIMEOUT_MS = 60_000
const BUFFERING_TIMEOUT_MESSAGE =
  'Loading is taking longer than usual. Try exiting and replaying the video.'

const OFFLINE_MESSAGE =
  "You're offline. Connect to the internet to stream this title, then try again."
const NETWORK_MESSAGE =
  'Unable to reach the stream server. Check your connection and try again.'
const UNSUPPORTED_MESSAGE = "Your device can't play this video's format. Try again later!"
const GENERIC_MESSAGE = 'Unable to play this stream right now. Please try again shortly.'

const MEDIA_ERR_NETWORK = 2
const MEDIA_ERR_DECODE = 3

function playbackErrorMessage(input: {
  online: boolean
  code?: number
  status?: number
}): string {
  if (!input.online) return OFFLINE_MESSAGE
  // 401/403 only reaches us when the response is CORS-readable (hls.js XHR);
  // a browser-blocked stream usually reports a generic media error instead.
  if (input.status === 401 || input.status === 403) {
    return `HTTP ${String(input.status)} — the stream server refused this request. Try again shortly.`
  }
  if (input.status !== undefined && input.status > 0) return NETWORK_MESSAGE
  if (input.code === MEDIA_ERR_NETWORK) return NETWORK_MESSAGE
  // SRC_NOT_SUPPORTED (4) is what a refused or missing file also reports, so
  // it does not earn the "wrong format" copy.
  if (input.code === MEDIA_ERR_DECODE) return UNSUPPORTED_MESSAGE
  return GENERIC_MESSAGE
}

export interface PlayerEngineOptions {
  /** Blank while details (and therefore the server list) are still loading. */
  streamUrl: string
  resumeAtMs: number
  online: boolean
  onEnded: () => void
}

export interface PlayerEngine {
  videoRef: RefObject<HTMLVideoElement | null>
  playing: boolean
  buffering: boolean
  positionMs: number
  durationMs: number
  error: string | null
  togglePlay: () => void
  skip: (deltaMs: number) => void
  seek: (ms: number) => void
  retry: () => void
}

export function usePlayerEngine({
  streamUrl,
  resumeAtMs,
  online,
  onEnded,
}: PlayerEngineOptions): PlayerEngine {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Starts true: Android opens the player showing buffering while it resolves
  // the deferred stream, and that is exactly the state details-loading is.
  const [buffering, setBuffering] = useState(true)
  const [positionMs, setPositionMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onlineRef = useRef(online)
  const resumeRef = useRef(resumeAtMs)
  const onEndedRef = useRef(onEnded)
  const appliedResumeRef = useRef(false)

  // Declared before the source effect: effects run in declaration order, so
  // the ref is current by the time a freshly resolved stream attaches.
  useEffect(() => {
    onlineRef.current = online
  }, [online])
  useEffect(() => {
    resumeRef.current = resumeAtMs
  }, [resumeAtMs])
  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    // Capture first, then alias with a declared type: TypeScript re-widens
    // `videoRef.current` to `HTMLVideoElement | null` inside the event
    // closures below, even though it cannot be null past this point.
    const mediaElement = videoRef.current
    if (mediaElement === null) return
    if (streamUrl === '') return
    const video: HTMLVideoElement = mediaElement

    let cancelled = false
    let hls: HlsInstance | null = null

    appliedResumeRef.current = false
    setPlaying(false)
    setPositionMs(0)
    setDurationMs(0)
    setError(null)
    setBuffering(true)

    function onLoadedMetadata() {
      const duration = readVideoDuration(video)
      setDurationMs(duration)
      if (appliedResumeRef.current) return
      appliedResumeRef.current = true
      const at = resumeRef.current
      if (at > 0 && duration > 0 && at < duration - 5_000) {
        video.currentTime = at / 1000
        setPositionMs(Math.round(at))
      }
      // Android prepares the player with `playWhenReady = true`. A browser may
      // refuse (no user activation left by the time metadata arrives); the
      // rejection is then swallowed and the paused controls simply stay up.
      void video.play().catch(() => undefined)
    }
    function onDurationChange() {
      setDurationMs(readVideoDuration(video))
    }
    function onTimeUpdate() {
      setPositionMs(Math.round(video.currentTime * 1000))
    }
    function onPlaying() {
      setPlaying(true)
      setBuffering(false)
    }
    function onPause() {
      setPlaying(false)
    }
    function onWaiting() {
      setBuffering(true)
    }
    function onCanPlay() {
      setBuffering(false)
    }
    function onSeeking() {
      setBuffering(true)
    }
    function onSeeked() {
      setBuffering(false)
    }
    function onEnded() {
      setPlaying(false)
      setBuffering(false)
      onEndedRef.current()
    }
    function onMediaError() {
      setPlaying(false)
      setBuffering(false)
      setError(
        playbackErrorMessage({ online: onlineRef.current, code: video.error?.code ?? 0 }),
      )
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('loadstart', onWaiting)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('seeking', onSeeking)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onMediaError)

    const isHls = /\.m3u8(\?|$)/i.test(streamUrl)
    const nativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== ''

    if (isHls && !nativeHls) {
      void import('hls.js')
        .then(({ default: HlsCtor }) => {
          if (cancelled) return
          if (!HlsCtor.isSupported()) {
            setError(UNSUPPORTED_MESSAGE)
            setBuffering(false)
            return
          }
          hls = new HlsCtor({
            // `index.html` sets `<meta name="referrer" content="no-referrer">`,
            // which is what actually governs these requests: `referrerpolicy`
            // is not defined on media elements or on XMLHttpRequest, so the
            // document policy is the only lever a browser exposes. A stream
            // that still refuses us falls through to the error state's Retry.
            enableWorker: true,
          })
          hls.loadSource(streamUrl)
          hls.attachMedia(video)
          // ExoPlayer retries the obvious transients on its own; hls.js gives
          // up immediately. Two cheap restarts of each kind mirror that, while
          // a definite 4xx (403 above all) is answered at once.
          const recovery = { network: 0, media: 0 }
          hls.on(HlsCtor.Events.ERROR, (_event, data) => {
            if (cancelled || !data.fatal) return
            const status = data.response?.code ?? 0
            const retriableStatus = status === 0 || status >= 500
            if (
              data.type === HlsCtor.ErrorTypes.NETWORK_ERROR &&
              retriableStatus &&
              recovery.network < 2
            ) {
              recovery.network += 1
              hls?.startLoad()
              return
            }
            if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR && recovery.media < 2) {
              recovery.media += 1
              hls?.recoverMediaError()
              return
            }
            setBuffering(false)
            setError(
              playbackErrorMessage({
                online: onlineRef.current,
                status,
              }),
            )
          })
        })
        .catch(() => {
          if (cancelled) return
          setError(GENERIC_MESSAGE)
          setBuffering(false)
        })
    } else {
      video.src = streamUrl
      video.load()
    }

    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('loadstart', onWaiting)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('seeking', onSeeking)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onMediaError)
      hls?.destroy()
      hls = null
      video.removeAttribute('src')
    }
  }, [streamUrl, attempt])

  // Android gives up on a stream after 60 s of continuous buffering.
  useEffect(() => {
    if (!buffering) return
    const timer = setTimeout(
      () => showToast(BUFFERING_TIMEOUT_MESSAGE),
      BUFFERING_TIMEOUT_MS,
    )
    return () => clearTimeout(timer)
  }, [buffering])

  const seek = useCallback((ms: number) => {
    const video = videoRef.current
    if (video === null) return
    const duration = readVideoDuration(video)
    if (duration <= 0) return
    const clamped = Math.max(0, Math.min(ms, duration))
    video.currentTime = clamped / 1000
    setPositionMs(Math.round(clamped))
  }, [])

  const skip = useCallback(
    (deltaMs: number) => {
      const video = videoRef.current
      if (video === null) return
      seek(video.currentTime * 1000 + deltaMs)
    },
    [seek],
  )

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (video === null) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }, [])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  return {
    videoRef,
    playing,
    buffering,
    positionMs,
    durationMs,
    error,
    togglePlay,
    skip,
    seek,
    retry,
  }
}

function readVideoDuration(video: HTMLVideoElement): number {
  return Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : 0
}
