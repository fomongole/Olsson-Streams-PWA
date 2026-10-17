import type { MovieDetails } from '@/shared/api/endpoints'

/**
 * Watch-position persistence, mirroring Android's `PlaybackProgressRepository`
 * (Room table → localStorage here, same key derivation and the same rules for
 * when a position is worth keeping or should be forgotten).
 *
 * Resume is silent: no "Resume / Start over" prompt exists on Android, so none
 * is rendered here either.
 */

const STORAGE_KEY = 'olsson.playback_progress.v1'

/** `PlaybackProgressKey`'s default namespace — part of the key, so it must
 *  match what a future Android-side reader would compute. */
const NAMESPACE = 'OLSSON_STREAMS_API'

/** Below this a position is a stray tap, not a session worth restoring. */
export const MIN_RESUME_POSITION_MS = 30_000

/** Within this of the end counts as watched, so history is dropped. */
const FINISHED_REMAINING_MS = 120_000

/** Same ratio `PlaybackProgress.COMPLETION_RATIO` uses. */
const COMPLETION_RATIO = 0.95

/** localStorage is small; keep the most recent sessions and drop the rest. */
const MAX_ENTRIES = 60

export interface PlaybackProgress {
  progressKey: string
  streamUrl: string
  title: string
  tmdbId: number
  /** Provider item id — Android's `pbId`. */
  pbId: string
  posterUrl: string
  overview: string
  positionMs: number
  durationMs: number
  updatedAt: number
  sourceRef: string
  sourceCacheKey: string
}

/**
 * `PlaybackProgressKey.forMedia(...)`, movies edition. Android tries a series
 * key first, so the movie chain here starts at the stable source cache key and
 * walks down to the provider id; the last fallback ("unknown") never fires
 * because every details payload carries an id.
 */
export function progressKeyFor(details: MovieDetails): string {
  const canonicalTmdbId = details.canonical_tmdb_id ?? details.tmdb_id
  const sourceCacheKey = details.source_cache_key?.trim() ?? ''
  const sourceRef = details.source_ref?.trim() ?? ''
  const pbId = String(details.id).trim()

  if (sourceCacheKey !== '') return `source_movie_${sourceCacheKey}`
  if (sourceRef !== '') return `source_${sourceRef}`
  if (canonicalTmdbId > 0) return `movie_${NAMESPACE}_${String(canonicalTmdbId)}`
  if (pbId !== '') return `pb_${NAMESPACE}_${pbId}`
  return 'unknown'
}

function readAll(): Record<string, PlaybackProgress> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as Record<string, PlaybackProgress>
  } catch {
    // Private mode or a corrupt payload: start over rather than lose playback.
    return {}
  }
}

/**
 * Newest record per key wins, and only the most recent `MAX_ENTRIES` survive —
 * localStorage is small, and a stale session costs less than a quota failure.
 *
 * Takes a list rather than a map so callers never need `delete`, which the
 * lint rules rightly refuse on computed keys.
 */
function writeAll(entries: PlaybackProgress[]): void {
  const newestFirst = [...entries].sort((a, b) => b.updatedAt - a.updatedAt)
  const pruned: Record<string, PlaybackProgress> = {}
  for (const entry of newestFirst) {
    if (entry.progressKey in pruned) continue
    pruned[entry.progressKey] = entry
    if (Object.keys(pruned).length >= MAX_ENTRIES) break
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
  } catch {
    // Quota exceeded: dropping the history costs less than breaking playback.
  }
}

export function loadProgress(progressKey: string): PlaybackProgress | null {
  return readAll()[progressKey] ?? null
}

export function clearProgress(progressKey: string): void {
  const records = readAll()
  if (!(progressKey in records)) return
  writeAll(Object.values(records).filter((entry) => entry.progressKey !== progressKey))
}

/**
 * Applies Android's write rules: nothing without a duration or a URL, nothing
 * before the resume threshold, and a position near the end (or past 95%)
 * clears the record so the title restarts next time.
 *
 * Returns true when a record was written.
 */
export function saveProgress(record: PlaybackProgress): boolean {
  if (record.streamUrl === '' || record.durationMs <= 0) return false
  if (record.progressKey === 'unknown') return false

  const remainingMs = record.durationMs - record.positionMs
  const finished =
    (remainingMs >= 0 && remainingMs <= FINISHED_REMAINING_MS) ||
    record.positionMs / record.durationMs >= COMPLETION_RATIO
  if (finished) {
    clearProgress(record.progressKey)
    return false
  }
  if (record.positionMs < MIN_RESUME_POSITION_MS) return false

  writeAll([...Object.values(readAll()), record])
  return true
}
