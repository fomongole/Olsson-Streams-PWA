# Olsson Streams PWA — agent conventions

## Layout rules

### The mobile guardrail

Everything below `1024px` is the **mobile** design. It mirrors the Android app
bottom sheet for bottom sheet, and it must not drift.

- Do not restyle, reflow, or re-break the layout below `1024px`.
- The bottom pill nav is mobile-only and must stay visible below `1024px`.
- Every desktop-only change is scoped with `lg:` (Tailwind's `min-width: 1024px`
  breakpoint), never `md:` (`768px`).

### The desktop rule (≥1024px)

No screen may look like a stretched phone. At `min-width: 1024px`:

1. **Shared container.** Page content lives in `.page-container`
   (`tokens.css`): `max-width: 1600px`, centred, `padding-inline: 32px`
   (applied via the `lg:px-8` utility on the call site). The desktop nav,
   the hero text block, shelf headers and shelf rows must all use it, so
   they share one left edge. Full-bleed art (backdrops, the hero image,
   hero scrims) is exempt and stays edge-to-edge.
2. **Multi-column.** Detail is two columns (poster + actions beside the
   synopsis); category, search, series and genre listings are poster
   grids; the access screen is a centred card. Never a single narrow
   phone column on a wide viewport.
3. **Sheets become modals.** Bottom sheets and dialogs render as centred
   modals (or side panels), not bottom sheets.
4. **Shelves get desktop affordances.** Hover-revealed arrow buttons,
   arrow-key scrolling, a right-edge fade while more content is reachable,
   and a card hover state (scale, accent border, play overlay).
5. **Typography and controls.** Reading text keeps a limited measure
   (~600px in the hero). Tap-sized controls may shrink on desktop; they
   never grow just because the viewport did.
6. **Logic is shared.** Same data, same hooks, same behaviour at every
   width — only layout and presentation change.

### Screens under a fixed desktop header

The desktop header in `AppShell` is `position: fixed`, `72px` tall, and
transparent only over the Home hero (`pathname === '/'` and not scrolled).
Screens inside `AppShell` that do **not** start with full-bleed art must
clear it with `lg:pt-[72px]` on their root. `HomeScreen` deliberately omits
it so the hero runs under the transparent nav.

## The player screen (Phase 6)

`src/features/player/` renders at `/play/:movieId` **outside `AppShell`** (like
the details screen), so neither the desktop header nor the mobile dock sits
over the video. Anything Phase 7 reuses should follow these rules:

- **Navigation** comes from `playPath(movie)` in `src/app/routes.ts`. The route
  takes `title` and `sourceRef` in the query string as display fallbacks; the
  canonical details still come from `useMovieDetails(movieId, sourceRef)`.
- **Modes** are Android's: `compact` (video box over a details column),
  `full` (`fixed inset-0 z-50`) and `landscape` (same, plus the Fullscreen API
  where the browser allows it). Back is mode-aware — it drops a mode before
  it pops the route, exactly like `handlePlayerBack`.
- **Stream choice** is the first non-blank `servers[].url`, and HLS (`.m3u8`)
  is loaded through a dynamic `import('hls.js')` so the 574 KB chunk only
  downloads when a title actually plays. Keep it lazy.
- **Controls** live in `PlayerControlsOverlay`: the tap layer is a _sibling_ of
  the controls, the controls wrapper is always `pointer-events-none`, and each
  real control opts back in with `pointer-events-auto`. Do not regress that —
  a wrapper that hit-tests would swallow every tap on empty space.
- **Progress** is stored per key from `progressKeyFor(details)`; see
  `playbackProgress.ts` for the resume/clear rules. `useUpNext` also excludes
  by provider id because Beera sets every `tmdb_id = 0`.
