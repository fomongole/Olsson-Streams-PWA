# Olsson Streams PWA

Mobile-first web app for Olsson Streams (Vite + React + TypeScript + Tailwind CSS 4).

## Getting started

```bash
npm install
npm run dev        # start dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build locally
npm run typecheck  # TypeScript only
npm run lint       # ESLint only
npm run format     # Prettier
```

## Icons

All UI icons come from a **subsetted** copy of
[Material Symbols Rounded](https://fonts.google.com/icons?icon.family=Material+Symbols+Rounded),
shipped in `public/fonts/material-symbols-rounded.woff2` (~55 KB). The full font
is ~5.4 MB, which is far too heavy to ship to phones on mobile data, so we cut
it down to only the glyphs this app uses.

The subset is built by ligature, the same way the font is used at runtime —
`<Icon name="wifi_off" />` renders the text `wifi_off` and the font's `rlig`
lookup maps that string to a single glyph.

### Using an icon

`<Icon>` in `src/components/ui/Icon.tsx` is the **only** way the UI renders an
icon. Never hand-roll a `<span className="msym">` — use the component, so the
font stays the single source of truth and names stay type-checked.

```tsx
import { Icon } from '@/components/ui/Icon'

// Decorative: always aria-hidden (the default). Give the *parent* the label.
<Icon name="wifi_off" className="text-accent" />

// Filled variant (FILL axis = 1):
<Icon name="star" filled />
```

`name` is typed as `IconName`, so a typo or a name that was never subsetted is a
compile error.

### Icons currently in the subset

| Name            | Name                      | Name            |
| --------------- | ------------------------- | --------------- |
| `android`       | `animation`               | `arrow_back`    |
| `bookmark_add`  | `call`                    | `category`      |
| `chat`          | `check`                   | `chevron_left`  |
| `chevron_right` | `close`                   | `dark_mode`     |
| `delete`        | `download`                | `error`         |
| `expand_more`   | `explore`                 | `file_download` |
| `flag`          | `flash_on`                | `fullscreen`    |
| `grid_view`     | `home`                    | `info`          |
| `ios_share`     | `language`                | `live_tv`       |
| `lock`          | `mail`                    | `more_vert`     |
| `movie`         | `nightlight_round`        | `open_in_new`   |
| `pause`         | `person`                  | `play_arrow`    |
| `refresh`       | `rocket_launch`           | `schedule`      |
| `search`        | `sentiment_satisfied_alt` | `settings`      |
| `share`         | `signal_cellular_alt`     | `star`          |
| `support_agent` | `theater_comedy`          | `tv`            |
| `volume_up`     | `wifi`                    | `wifi_off`      |

### Adding an icon

1. Find the icon's **ligature name** on the
   [Material Symbols site](https://fonts.google.com/icons) (it's the text under
   the icon — e.g. `bookmark_add`, not `bookmark-add`).
2. Add it to the `icons` array in `scripts/material-symbols.icons.json`.
3. Run `npm run icons`.
4. Commit the regenerated font **and** `src/components/ui/icons.generated.ts`
   alongside the JSON change — all three must land together.

A few legacy names from the old Android app no longer exist in the current font
and must use their modern equivalents: `error_outline` → `error`,
`mail_outline` → `mail`, `phone` → `call`. Watch for names that look valid but
aren't: the Android `FlashOn` icon has no `flash` ligature — only `flash_on`,
`flash_off` and `flash_auto` exist.

The build script refuses to finish if a name in the JSON has no matching
ligature in the font, so a typo fails loudly rather than shipping a blank icon.

### How the subsetting works

`scripts/build-icons.py` (run by `npm run icons`):

1. Downloads the full 5.4 MB font into `.font-cache/` (gitignored, cached
   after the first run).
2. Walks the font's `rlig` lookups and collects every glyph each requested icon
   needs — the ligature's component glyphs **and** its output glyph. Pyftsubset
   drops a ligature rule if _any_ component is missing, so all of them must be
   kept.
3. Runs `pyftsubset` with an explicit glyph list and `--no-layout-closure`.
   Without that flag, GSUB closure pulls in all ~6600 glyphs and the "subset"
   comes out at ~5.3 MB.
4. Verifies the result: every name in the JSON must still have a `rlig` rule in
   the output font. If one is missing, the build fails with the name that broke.
5. Regenerates `src/components/ui/icons.generated.ts`, the `IconName` union
   the `Icon` component is typed against.

Unicode-based subsetting (`--unicodes=U+0020-007E`) does **not** work here for
the same reason — it triggers full GSUB closure. Subsetting by explicit glyph
list is the whole point of the script.

### Script dependencies

The script manages its own virtualenv in `.venv-icons/` (gitignored), created
automatically on first run. It needs Python 3 and installs `fonttools` and
`brotli` into that venv. If you'd rather manage it yourself:

```bash
python3 -m venv .venv-icons
.venv-icons/bin/pip install --upgrade fonttools brotli
```

To point the script at an existing `pyftsubset` instead:

```bash
PYFTSUBSET=/path/to/pyftsubset npm run icons
```

`.font-cache/` and `.venv-icons/` are both gitignored. The full font is never
committed.

### Fonts loaded at runtime

- `public/fonts/material-symbols-rounded.woff2` — the icon subset (~55 KB),
  variable font (FILL/wght/GRAD/opsz axes).
- `public/fonts/sora-{400,600,700}.ttf` — the Sora text faces.
