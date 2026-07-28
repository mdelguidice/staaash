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
| `--frame=WxH` | override the capture viewport (calibrate / mutate only) |
| `--mutate=<sel>:<prop>:<val>` | inject a style override and score it (repeatable) |
| `--config=<path>` | use a different config file |

## Mutation testing — `--mutate`

Injects a temporary style override, captures, and scores it against an
unmutated baseline captured in the same run. Repeatable; the baseline is
captured once and reused, so a sweep costs one launch per mutation plus one.

```bash
node tools/visual-diff/index.mjs \
  --mutate=.sb:padding-left:21px \
  --mutate=.sb:background-color:#0b0b0a
```

The spec is parsed **from the right**, so selectors containing colons still
work (`a:hover:color:red`). Each mutation reports its delta against the
baseline and, when the frame was not overridden, against the Figma reference
too — plus every configured region. Results land in
`visual-diff/<id>.mutations.json`.

This is how you find the harness's detection floor: mutate by a known amount
and see whether the score moves out of the noise. See "Sensitivity" below.

## `--frame=WxH`

Overrides the capture viewport. Calibration and mutation runs compare app
captures to each other, so the Figma frame size is irrelevant to them and the
width is free. The Figma diff ignores this flag's usefulness — a score against
a reference is only valid at the reference's own size.

`seed-fixture.mjs` takes the same flag, because card crops are measured at the
seeding viewport. **Re-seed at the config frame afterwards**, or the Figma diff
will compare wrongly-sized artwork.

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
processes disagree.

**The fractional-column-width hypothesis was tested and is wrong.** `colW` is
`(viewportW − 344) / 3`, integral when `viewportW % 3 == 2`. Ten calibrations at
each of four widths, re-seeding the fixture at each so card crops matched the
layout:

| viewport | colW | | clean | residual when it fires |
|---|---|---|---|---|
| 1436 | 364 | integral | 6/10 | 2,471 px |
| 1438 | 364.667 | fractional | 7/10 | 6,846 px |
| 1439 | 365 | integral | 8/10 | 2,976 px |
| 1440 | 365.333 | fractional | 6/10 | 3,621 px |

Integral 14/20 clean vs fractional 13/20 — indistinguishable at this n. Making
the column width integral does **not** fix it, so the app-side change that idea
implied is not worth making. Each width is bimodal between 0 and one
width-specific value; the magnitude when it fires is somewhat smaller at
integral widths (mean 0.057% vs 0.110%), but with only two widths per group that
is weak and does not follow cleanly from integrality either.

Root cause remains open. What is now ruled out: timing/convergence, cold-vs-warm
profile, GPU rasterization, hover, tied sort order, and fractional column width.

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

## Sensitivity — what the harness can actually see

Measured with `--mutate` against a same-run baseline. Region noise floor is
0.000% for `sidebar`/`topbar`/`ask-bar` and 0.117% for `gallery`; whole-screen
noise is 0.079% (the calibration residual above).

**Geometry** — `.sb { padding-left }` shifted from its default 20px:

| shift | whole-screen | sidebar region | verdict |
|---|---|---|---|
| +0.25px | 0.099% | 0.108% | marginal — at the noise floor |
| +0.5px | 0.120% | 0.223% | detectable, ~2× noise |
| +0.75px | 0.213% | 0.729% | clear |
| +1px | 0.265% | 1.014% | unambiguous, ~9× noise |
| +2px | 0.381% | 1.644% | unambiguous |
| +3px | 0.288% | 1.568% | unambiguous |

Note the whole-screen column is not monotonic — a 3px shift can score lower
than a 2px one, because what is being counted is glyph-edge antialiasing at
different subpixel offsets, not displacement. **Read the region, not the
whole-screen number, when judging a geometric change.**

**Colour** — `.sb { background-color }` stepped up from `--sidebar: #0a0a09`:

| step | sidebar region |
|---|---|
| +1, +2, +4, +8, +16, +20, +24, +26 | **0.000% — invisible** |
| +27 | 90.558% |
| +28 | 92.323% |
| +32 | 93.897% |

This is a cliff, not a ramp, and it is a real blind spot. `pixelmatch` counts a
pixel only when its YIQ distance exceeds `35215 × threshold²`; for a neutral
grey that is `0.5053 × Δ² > 352.15`, i.e. **Δ > 26.4 of 255**. Measured floor
sits between +26 and +27, matching exactly.

So: **a flat colour can drift by up to ~10% of the 0–255 range and score
0.000%.** A subtly wrong background or token value will pass silently. If you
care about colour fidelity, lower `defaults.threshold` — at the cost of
counting more text-antialiasing noise, which is what 0.1 was chosen to suppress.

**Card displacement** — one card offset 10px (`margin-top`), which matters
because card artwork is cropped from the reference at app-measured rects:

| | whole-screen | gallery region |
|---|---|---|
| vs baseline | 0.993% | **1.459%** (noise 0.117%) |
| vs Figma | 2.841% (unmutated 2.230%) | **2.935%** (unmutated 1.852%) |

**The gallery region catches it, ~12× over noise.** The cropping scheme does not
mask movement: crops are baked into image files at seed time, so moving a card
at render time carries those pixels to a position where the reference has
different content. Cropping neutralises *artwork*, not *geometry* — which is the
intended trade.

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
