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
