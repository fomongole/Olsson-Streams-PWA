import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatPlaybackTime } from './formatTime'

/**
 * `CustomSeekBar.kt`: a 14px canvas over a 3px track (4.5px while dragging),
 * accent gradient played portion, accent ring with a white core, tap-to-seek
 * and drag-to-seek. Pointer events stand in for Android's touch/pointer
 * gestures so a mouse works the same way.
 *
 * The interaction is consumed here (a drag must not toggle the controls the
 * way a plain tap on the video does) — the overlay keeps its tap layer as a
 * sibling, so nothing needs stopping.
 */
export function PlayerSeekBar({
  positionMs,
  durationMs,
  onSeek,
  label = 'Seek',
}: {
  positionMs: number
  durationMs: number
  onSeek: (ms: number) => void
  label?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragMs, setDragMs] = useState<number | null>(null)
  const dragging = dragMs !== null

  const shownMs = dragMs ?? positionMs
  const progress = durationMs > 0 ? clamp(shownMs / durationMs, 0, 1) : 0

  // Thumb diameter 11px idle / 16px dragging; white core is the outer ring
  // minus 2px each way, and the drag halo sits 5px outside the ring.
  const radius = dragging ? 8 : 5.5
  const thumb = radius * 2
  const core = (radius - 2) * 2
  const halo = (radius + 5) * 2
  const trackHeight = dragging ? 4.5 : 3
  const thumbLeft = `calc(${String(radius)}px + (100% - ${String(thumb)}px) * ${String(progress)})`

  function msAt(clientX: number): number {
    const track = trackRef.current
    if (track === null || durationMs <= 0) return 0
    const rect = track.getBoundingClientRect()
    const fraction = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
    return fraction * durationMs
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (durationMs <= 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragMs(msAt(event.clientX))
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragMs === null) return
    setDragMs(msAt(event.clientX))
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragMs === null) return
    const targetMs = msAt(event.clientX)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragMs(null)
    onSeek(targetMs)
  }

  function cancelDrag() {
    setDragMs(null)
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancelDrag}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, Math.floor(durationMs / 1000))}
      aria-valuenow={Math.max(0, Math.floor(shownMs / 1000))}
      aria-valuetext={`${formatPlaybackTime(shownMs)} of ${formatPlaybackTime(durationMs)}`}
      className="pointer-events-auto relative h-[14px] w-full cursor-pointer touch-none select-none outline-none focus-visible:ring-1 focus-visible:ring-accent/70"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-white/[0.28]"
        style={{ height: trackHeight }}
      />
      <span
        aria-hidden
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent/85 to-accent"
        style={{ height: trackHeight, width: `${String(progress * 100)}%` }}
      />
      {dragging && (
        <span
          aria-hidden
          className="absolute top-1/2 rounded-full bg-accent/35"
          style={{
            left: thumbLeft,
            width: halo,
            height: halo,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
      <span
        aria-hidden
        className="absolute top-1/2 rounded-full bg-accent"
        style={{
          left: thumbLeft,
          width: thumb,
          height: thumb,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <span
        aria-hidden
        className="absolute top-1/2 rounded-full bg-white"
        style={{
          left: thumbLeft,
          width: core,
          height: core,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
