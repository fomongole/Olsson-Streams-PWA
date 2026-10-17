import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'
import { formatPlaybackTime } from './formatTime'
import { PlayerSeekBar } from './PlayerSeekBar'

/**
 * `PlayerControlsOverlay.kt`, transposed to the DOM.
 *
 * Structure is a tap layer with every control as a *sibling* above it, so a
 * tap on empty video toggles the controls while a tap on a button never
 * reaches the toggle. Auto-hide (5 s while playing) and the pointer-activity
 * pause are owned by the screen, which owns `showControls`.
 *
 * Sizes switch on the screen mode exactly as Android switches on its
 * "tight container" breakpoint (`maxHeight < 320.dp`, which the 260dp compact
 * video box always trips).
 */
export type PlayerMode = 'compact' | 'full' | 'landscape'
export type ResizeMode = 'fit' | 'zoom' | 'fill'

const SCRIM =
  'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.6) 100%)'

const RESIZE_ICON: Record<ResizeMode, IconName> = {
  fit: 'fit_screen',
  zoom: 'zoom_out_map',
  fill: 'crop_free',
}
const RESIZE_LABEL: Record<ResizeMode, string> = {
  fit: 'Fit',
  zoom: 'Zoom',
  fill: 'Fill',
}

interface ControlSizes {
  play: number
  playIcon: number
  skip: number
  skipIcon: number
  spacing: number
  topPadX: number
  topPadY: number
  topGap: number
  bottomPad: number
  seekPadX: number
  timeSize: number
  titleSize: number
  back: number
  backIcon: number
}

function sizesFor(mode: PlayerMode, tight: boolean): ControlSizes {
  const common = { topPadX: 12, topPadY: 4, topGap: 10, back: 40, backIcon: 26 }
  if (mode === 'landscape') {
    return {
      ...common,
      play: 96,
      playIcon: 64,
      skip: 64,
      skipIcon: 36,
      spacing: 24,
      bottomPad: 10,
      seekPadX: 14,
      timeSize: 16,
      titleSize: 16,
    }
  }
  // Android's rule is the container's own height (`maxHeight < 320.dp`), not
  // the mode: the compact video box trips it at 260dp on a phone but not once
  // a desktop viewport makes that box taller.
  if (mode === 'compact' && tight) {
    return {
      ...common,
      play: 64,
      playIcon: 42,
      skip: 44,
      skipIcon: 24,
      spacing: 16,
      bottomPad: 6,
      seekPadX: 10,
      timeSize: 12,
      titleSize: 14,
      topPadX: 8,
      topPadY: 2,
      topGap: 8,
      back: 36,
      backIcon: 22,
    }
  }
  return {
    ...common,
    play: 84,
    playIcon: 56,
    skip: 52,
    skipIcon: 32,
    spacing: 20,
    bottomPad: 10,
    seekPadX: 14,
    timeSize: 16,
    titleSize: 16,
  }
}

export interface PlayerControlsProps {
  mode: PlayerMode
  title: string
  playing: boolean
  buffering: boolean
  positionMs: number
  durationMs: number
  error: string | null
  resizeMode: ResizeMode
  showControls: boolean
  onToggleControls: () => void
  onPointerActivityChange: (active: boolean) => void
  onBack: () => void
  onPlayPause: () => void
  onSkip: (deltaMs: number) => void
  onSeek: (ms: number) => void
  onCycleResize: () => void
  onEnterFull: () => void
  onExitToCompact: () => void
  onEnterLandscape: () => void
  onExitToPortraitFull: () => void
  onRetry: () => void
}

export function PlayerControlsOverlay(props: PlayerControlsProps) {
  const { mode, title, playing, buffering, positionMs, durationMs, error, resizeMode } =
    props

  const rootRef = useRef<HTMLDivElement>(null)
  // Start tight (the phone layout) and let the observer correct it once the
  // box has a real height, so a desktop viewport does not flash small controls.
  const [tight, setTight] = useState(true)

  useEffect(() => {
    const root = rootRef.current
    if (root === null || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? root.clientHeight
      if (height > 0) setTight(height < 320)
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const sizes = sizesFor(mode, tight)
  const fullscreen = mode !== 'compact'

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-20"
      // Hovering counts as interaction on desktop, exactly as a finger on the
      // screen does on Android: the controls stay up while the pointer is over
      // the video and only restart the 5 s countdown once it leaves.
      onPointerEnter={() => props.onPointerActivityChange(true)}
      onPointerLeave={() => props.onPointerActivityChange(false)}
      onPointerDown={() => props.onPointerActivityChange(true)}
    >
      {/* Tap layer: a sibling of the controls, not their ancestor, so a
          button's click stops with the button. */}
      <div aria-hidden onClick={props.onToggleControls} className="absolute inset-0" />

      {/*
        The wrapper itself never takes pointer events: `pointer-events: none`
        inherits down, so empty space falls through to the tap layer above,
        while each real control opts back in. Without that, a visible wrapper
        would hit-test as one large invisible button and swallow every tap.
      */}
      <div
        inert={!props.showControls}
        className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
          props.showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: SCRIM }}
        />

        {/* ---- Top bar ---- */}
        <div
          className="absolute inset-x-0 top-0 flex items-center"
          style={{
            gap: sizes.topGap,
            paddingLeft: sizes.topPadX,
            paddingRight: sizes.topPadX,
            paddingTop: fullscreen
              ? `max(${String(sizes.topPadY)}px, env(safe-area-inset-top))`
              : sizes.topPadY,
            paddingBottom: sizes.topPadY,
          }}
        >
          <button
            type="button"
            aria-label="Back"
            onClick={props.onBack}
            style={{ width: sizes.back, height: sizes.back }}
            className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full text-white transition-transform duration-150 active:scale-[0.85]"
          >
            <Icon name="arrow_back" style={{ fontSize: sizes.backIcon }} />
          </button>

          <p
            className="min-w-0 flex-1 truncate text-white"
            style={{
              fontSize: sizes.titleSize,
              lineHeight: 1.4,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {title}
          </p>
          {/* Android's cast button has no web equivalent — see the Phase 6 report. */}
          <span aria-hidden className="shrink-0" style={{ width: sizes.back }} />
        </div>

        {/* ---- Centre cluster ---- */}
        {error === null && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ gap: sizes.spacing }}
          >
            <button
              type="button"
              aria-label="Rewind 10 seconds"
              onClick={() => props.onSkip(-10_000)}
              style={{ width: sizes.skip, height: sizes.skip }}
              className="pointer-events-auto flex items-center justify-center rounded-full bg-black/45 text-white transition-transform duration-150 active:scale-[0.85]"
            >
              <Icon name="replay_10" style={{ fontSize: sizes.skipIcon }} />
            </button>

            {buffering && !playing ? (
              <span
                style={{ width: sizes.play, height: sizes.play }}
                className="flex items-center justify-center rounded-full bg-black/45"
              >
                <span
                  style={{ width: sizes.playIcon, height: sizes.playIcon }}
                  className="animate-spin rounded-full border-[4px] border-white/30 border-t-white"
                />
              </span>
            ) : (
              <button
                type="button"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={props.onPlayPause}
                style={{ width: sizes.play, height: sizes.play }}
                className="pointer-events-auto flex items-center justify-center rounded-full bg-black/45 text-white transition-transform duration-150 active:scale-[0.85]"
              >
                <Icon
                  name={playing ? 'pause' : 'play_arrow'}
                  style={{ fontSize: sizes.playIcon }}
                />
              </button>
            )}

            <button
              type="button"
              aria-label="Forward 10 seconds"
              onClick={() => props.onSkip(10_000)}
              style={{ width: sizes.skip, height: sizes.skip }}
              className="pointer-events-auto flex items-center justify-center rounded-full bg-black/45 text-white transition-transform duration-150 active:scale-[0.85]"
            >
              <Icon name="forward_10" style={{ fontSize: sizes.skipIcon }} />
            </button>
          </div>
        )}

        {/* ---- Playback error ---- */}
        {error !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-[40px]">
            <div className="flex w-full max-w-[440px] flex-col items-center text-center">
              <p
                className="font-bold text-[#EF5350]"
                style={{ fontSize: 15, lineHeight: 1.4 }}
              >
                Playback Error
              </p>
              <p
                className="mt-[4px] line-clamp-2 text-white/70"
                style={{ fontSize: 12, lineHeight: '16px' }}
              >
                {error}
              </p>
              <button
                type="button"
                onClick={props.onRetry}
                className="pointer-events-auto mt-[10px] flex items-center gap-[6px] rounded-[8px] border border-accent/60 px-[24px] py-[8px] text-accent transition-transform duration-150 active:scale-[0.97]"
              >
                <Icon name="refresh" style={{ fontSize: 16 }} />
                <span className="t-label-lg font-bold text-accent">Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* ---- Bottom bar ---- */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            paddingBottom: fullscreen
              ? `max(${String(sizes.bottomPad)}px, env(safe-area-inset-bottom))`
              : sizes.bottomPad,
          }}
        >
          <div className="flex items-center justify-between px-[10px]">
            <span
              className="px-[10px] font-medium text-white"
              style={{
                fontSize: sizes.timeSize,
                textShadow: '0 1px 5px rgba(0,0,0,0.95)',
              }}
            >
              {formatPlaybackTime(positionMs)} / {formatPlaybackTime(durationMs)}
            </span>

            <div className="flex items-center gap-[4px]">
              <button
                type="button"
                aria-label={`Resize: ${RESIZE_LABEL[resizeMode]}`}
                onClick={props.onCycleResize}
                style={{ width: 42, height: 42 }}
                className="pointer-events-auto flex items-center justify-center rounded-full text-white transition-transform duration-150 active:scale-[0.85]"
              >
                <Icon name={RESIZE_ICON[resizeMode]} style={{ fontSize: 30 }} />
              </button>

              {mode === 'compact' && (
                <ControlButton
                  label="Enter fullscreen"
                  icon="fullscreen"
                  iconSize={36}
                  onClick={props.onEnterFull}
                />
              )}
              {mode === 'full' && (
                <>
                  <ControlButton
                    label="Switch to landscape fullscreen"
                    icon="screen_rotation_alt"
                    iconSize={24}
                    onClick={props.onEnterLandscape}
                  />
                  <ControlButton
                    label="Exit fullscreen"
                    icon="fullscreen_exit"
                    iconSize={36}
                    onClick={props.onExitToCompact}
                  />
                </>
              )}
              {mode === 'landscape' && (
                <ControlButton
                  label="Exit fullscreen"
                  icon="fullscreen_exit"
                  iconSize={36}
                  onClick={props.onExitToPortraitFull}
                />
              )}
            </div>
          </div>

          <div style={{ paddingLeft: sizes.seekPadX, paddingRight: sizes.seekPadX }}>
            <PlayerSeekBar
              positionMs={positionMs}
              durationMs={durationMs}
              onSeek={props.onSeek}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  label,
  icon,
  iconSize,
  onClick,
}: {
  label: string
  icon: IconName
  iconSize: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{ width: 42, height: 42 }}
      className="pointer-events-auto flex items-center justify-center rounded-full text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-150 active:scale-[0.85]"
    >
      <Icon name={icon} style={{ fontSize: iconSize }} />
    </button>
  )
}
