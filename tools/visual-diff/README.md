# visual diff harness

Compares Figma frames against the real running app, pixel for pixel.

```bash
node tools/visual-diff/index.mjs
```

Standalone by design: it lives outside `desktop/`, has its own `node_modules`,
and **changes no app code**. It launches the built Electron app and screenshots
it against a seeded fixture database.

## What it does

For every screen in [`visual-diff.config.mjs`](../../visual-diff.config.mjs):

1. Resolves the Figma reference PNG (disk cache first, Figma REST API second).
2. Launches the real Electron app under Playwright, pointed at a **fixture**
   database, pins the **content** area to the frame's exact size, and forces
   `devicePixelRatio` to the config scale.
3. Runs the screen's route steps, hides scrollbars, disables hover, freezes
   animations, waits for fonts, and captures once the page stops repainting.
4. Compares with `pixelmatch` and writes artifacts.

## Output — `visual-diff/`

| File | What it is |
|---|---|
| `<id>.figma.png` | the reference, as exported |
| `<id>.app.png` | the app capture |
| `<id>.diff.png` | differing pixels, magenta over a dimmed reference |
| `<id>.side-by-side.png` | all three panels with labels — start here |
| `<id>.calibrate*.png` | written only when `--calibrate` fails |
| `report.json` | machine-readable deltas, whole-screen and per-region |
| `figma/<id>@<scale>x.png` | cached reference; delete to force a re-fetch |

## Flags

| Flag | Effect |
|---|---|
| `--screen=<id>` | only run one screen (repeatable) |
| `--calibrate` | capture twice, diff the captures, assert 0.00% |
| `--rects` | print measured layout geometry and exit — use to author `regions` |
| `--rects=.a,.b` | same, plus your own selectors |
| `--refresh` | re-fetch references from Figma even if cached |
| `--config=<path>` | use a different config file |

## Fixtures

The harness runs against a seeded SQLite database under
`fixtures/<name>/home/`, selected by `app.env.HOME` in the config:

```js
app: { dir: './desktop', env: { HOME: './tools/visual-diff/fixtures/figma-mock/home' } }
```

**Your real library at `~/Library/Application Support/staaash/` is never
opened.** Set `env: {}` to run against it anyway — useful for eyeballing the
live app, but scores then drift every time you save a bookmark.

### Regenerating

```bash
node tools/visual-diff/seed-fixture.mjs            # default fixture: figma-mock
node tools/visual-diff/seed-fixture.mjs --fixture=other
```

Content is declared in [`fixtures/figma-mock/fixture.mjs`](fixtures/figma-mock/fixture.mjs)
— counts, collections, tags and the visible cards, every value read off the
Figma export rather than invented. Edit that file, re-seed, re-run.

Seeding is two passes:

1. **Database.** Electron runs `seed-app/`, which imports the app's real
   `src/main/db.js` so the fixture schema can never drift from the app's. It
   then verifies the seeded rows against the app's own view predicates and
   fails loudly if a count is off. (It runs under Electron because the app's
   `better-sqlite3` is built for Electron's ABI, and the macOS system `sqlite3`
   ships without the FTS5 module the schema needs.)
2. **Card images.** The app is launched, every `.card-media` box measured, and
   those exact rectangles cropped out of the Figma reference PNG. So card
   artwork matches by construction and the gallery compares *layout and chrome*
   instead of unrelated pictures. Cards straddling the bottom edge are cropped
   to the visible part and padded below the fold.

Bookmark ids are searched so the app's own `cardAspect()` hash lands on the
aspect each card needs — that is how the fixture reproduces the mock's card
proportions without touching app code.

> Timestamps are relative to seed time, so `2 days ago` labels drift if the
> fixture ages past a boundary. Re-seed if they do.

### How the redirect works

The app hardcodes `userData` to `appData/staaash` (`src/main/index.js`). On
macOS, Electron derives `appData` from `NSHomeDirectory()`, which **ignores
`$HOME`** — so env alone cannot move the database. `electron-shim/` patches
`app.getPath('appData')` and then imports the real main, which computes
`userData` from it at module scope. Setting `HOME` still matters separately:
the legacy-data migration reads `process.env.HOME` (`src/main/migrate.js`), so
redirecting it is what keeps migration a no-op inside a fixture.

## Calibration

```bash
node tools/visual-diff/index.mjs --calibrate
```

Captures each screen in **two independent launches** and diffs them. This asks
"does re-running the harness give the same answer?", which has to be true before
any score against Figma means anything. It must print `0.00%`; it exits `1` and
names what moved if not:

```
delta  5.23% (238,597 / 4,561,920 px, two launches)
captures are not reproducible. what changed:
  1038 blk  img.card-img
            at 676,84 → 1020,428 css px
```

Differing pixels are mapped back through `elementFromPoint` to the elements
under them, so you get *what* changed, not just how much.

### Current status: not yet reliably 0.00%

**It passes roughly 4 runs in 5.** The residual failure is a consistent
**0.08% (3,621 px)** difference that appears intermittently — always the same
pixel count, always the same two states. Magnified, the two renders are visually
identical: the difference is antialiasing on glyph and image edges.

It is bistable rather than a timing race — waiting longer makes it *worse*
(`streak=4/gap=700` scored 3/5 against 4/5 for the current settings), and eight
consecutive launches inside a single process were byte-identical while separate
processes disagree. The most likely cause is Chromium's two-stage image
rasterization: cards are 365.33 CSS px wide, so the 730px crops are displayed at
730.67 and must be resampled, and the low- and high-quality raster passes both
hold stable. Fixing it properly probably means making the card width integral,
which would be an app change.

Until then: treat a `0.08%` calibration as noise and re-run; treat anything
larger as a real regression, and read the element list to find it.

The sources of drift below *were* found and fixed, and are handled
automatically now:

- **Tied timestamps.** `listBookmarks()` sorts by `created_at DESC` with no
  tiebreaker (`db.js:158`), so bookmarks sharing a timestamp landed in
  arbitrary slots. The seeder now offsets each card by a minute.
- **Hover.** The window opens under the physical mouse cursor, and cards reveal
  a veil, heart and check on `:hover`. The capture sets `pointer-events: none`
  so the hit test matches nothing and `:hover` can never apply.
- **GPU rasterization.** Disabled, along with LCD subpixel text and partial
  raster — they produce small timing-dependent differences. Override with
  `app.chromiumFlags`.
- **Late paint.** A capture is only used once three consecutive screenshots are
  byte-identical. Two was not enough: on a cold launch the page holds an
  intermediate state long enough to match twice, then paints again.
- **Cold vs warm profile.** Chromium caches inside the fixture are cleared
  before every launch so each run starts identically cold.

## Reading the numbers

The current `everything` score is **2.10%** whole-screen. With the fixture in
place, that number is dominated by genuine design-vs-code differences rather
than by content — which is what makes it worth tracking.

Two divergences it currently surfaces, both real:

- **Collections list.** The design shows five collections then `••• More`; the
  code's `COLLECTIONS_VISIBLE` is 6, so `More` only appears at seven or more and
  a sixth row shows. The fixture seeds seven collections to reproduce the `More`
  row; the extra visible row is the divergence, not a fixture bug.
- **Status pill.** The design reads `235 saved`; the app reads `238`, because
  `savedCount` counts archived bookmarks too (`App.jsx:158`) while `Everything`
  excludes them.

Caveats worth knowing:

- `includeAA: false` is deliberate. Figma and Chromium rasterise text
  differently on essentially every glyph edge; counting anti-aliased pixels
  would bury real defects in font-rendering noise.
- Regions are fixed windows applied to *both* images. If an element moves
  between design and app, the region reports that as a difference — the point.
- Card artwork is cropped from the reference, so it cannot disagree. Image
  *rendering* (fit, radius, letterboxing) is still compared; image *content* is
  deliberately neutralised.

## Authoring regions

Never eyeball the boxes. Measure them:

```bash
node tools/visual-diff/index.mjs --rects
```

```
.sb        {"x":0,"y":0,"width":264,"height":792}
.topbar    {"x":264,"y":0,"width":1176,"height":70}
.ask-wrap  {"x":264,"y":730,"width":1176,"height":46}
```

## Sizing is fatal, not advisory

The capture only happens at the frame's exact size. `getContentSize()` echoes
back whatever you asked for even when the resize has not landed, so the harness
polls the renderer's `innerWidth`/`innerHeight` instead and **hard-fails** if it
never matches — a score taken at the wrong size is meaningless. The app opens at
1520×940, wider than a 14" work area, so macOS zooms it; the harness unmaximizes
first, because `setContentSize` is silently ignored while a window is maximized.

`report.json` records `window.requested` vs `window.settled`, whether either
image had to be `resampled` (and from what size), and `settledAfterFrames`.

## Figma references

The cache is checked first, so the harness runs offline. To export directly:

```bash
export FIGMA_TOKEN=figd_...   # figma.com → Settings → Security → Personal access tokens
node tools/visual-diff/index.mjs --refresh
```

> The cached reference was exported through the Figma MCP server. The
> `FIGMA_TOKEN` REST path is implemented but has **not** been exercised — no
> token was available, so treat it as unverified until you run it.

## Requirements

- The app must be built: `cd desktop && npm run build`.
- Running staaash at the same time is fine; the port 3847 extension server
  fails soft when the port is taken (`httpServer.js:57`).
