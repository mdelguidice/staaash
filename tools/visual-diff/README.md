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
| `--single-capture` | capture once instead of twice (skips the agreement check) |
| `--config=<path>` | use a different config file |

## Every run captures twice

A delta is only worth reporting if the capture it came from is reproducible, so
each screen is captured in **two independent launches** and the two are compared
before anything is scored. If they disagree, the harness **refuses to report a
delta for that screen**, records the disagreement, carries on with the remaining
screens, and exits non-zero.

`report.json` records the outcome per screen:

```json
"captureAgreement": { "captures": 2, "identical": true, "diffPixels": 0 }
```

`--single-capture` opts out when you want speed over certainty. `--calibrate`
remains the explicit gate — it additionally names *what* moved.

## Exact colour check

pixelmatch cannot see a flat-colour drift below ~27/255 (see Sensitivity). That
is a structural blind spot, not a tuning choice, so colour is also checked
directly and independently.

For each region the harness walks a grid, keeps only points whose 5×5
neighbourhood is a single uniform colour in **both** images — flat interior, no
text or edges — and reports the exact RGB difference there. Findings are split
by magnitude:

- **drift** (Δ ≤ 8) — a genuine colour difference on a flat fill, almost always
  invisible to the pixel delta. This is the signal.
- **structural** (Δ > 8) — the two images simply have different content at that
  point. The pixel delta already reports that; it is counted, not listed.

```
colour sidebar   783/44,281 exact   drift #0a0a0a→#0a0a09 Δ1(×42230)   · 20 structural
```

That line is a real finding: the design paints the sidebar `#0a0a0a`, the app
paints `#0a0a09`. It covers ~42k sampled points and scores **0.000%** in the
pixel delta.

## Token audit

Independent of pixels entirely — a token can be wrong by an amount nothing can
see, and still be wrong. For every pair in the config's `tokenMap`, the app's
computed `:root` custom property is compared **exactly** against the Figma
variable:

```
tokens   7/7 exact   · 2 element colour(s) match no token
  ? #0a0a09 on .sb background-color — no Figma token
  ? #201e1e on .ask background-color — no Figma token
```

A `tokenMap` entry takes three forms:

| Form | Meaning |
|---|---|
| `'ink/500'` | a Figma variable, compared as hex |
| `{ color, alpha, over: 'ink/500' }` | translucent fill composited over a base token, compared as the resulting flat hex |
| `{ color, alpha }` | translucent value compared as rgba, channel for channel |

The composite form exists because parts of the design are specified as a
translucent fill over another token, so the colour they render exists nowhere as
a variable. The sidebar is `#F6F3F3` at 1% over `#080808`, which composites to
`(10.38, 10.35, 10.35)` → `#0a0a0a`. The app hardcodes `#0a0a09` — a
hand-flattened approximation with the blue channel rounded down — and the audit
now catches it:

```
tokens   1 mismatched
  ✗ --sidebar should be #F6F3F3 @1% over ink/500
    app #0a0a09  expected #0a0a0a  Δ(0,0,-1)  (value differs)
```

Figma values come from `visual-diff/figma/<screen>.variables.json`; refresh with
the Figma MCP `get_variable_defs` and paste into that file. If a screen has no
variables file the `everything` one is borrowed and the report says so.

Colours painted by the probed elements that match **no** Figma token are listed
too — those are hardcoded or drifted values. Fully transparent backgrounds are
correctly ignored rather than reported as `#000000`.

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
opened.** Note that `HOME` here is a naming convention only — it is resolved to
an appData path for the shim and then *stripped* before launch, because passing
a redirected `HOME` breaks the macOS keychain lookup (see "Current status").
Set `env: {}` to run against the real library anyway — useful for eyeballing the
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
`userData` from it at module scope. That shim is the entire mechanism.

`HOME` is **not** passed through. It was, originally, to stop the legacy
migration finding `~/staaash/.cache/data.json` and importing the real library
into a fixture — but that is already prevented by the seeder setting
`migrated_v1`, which makes `migrate.js:23` return before it ever reads `HOME`.
Passing it caused the keychain dialog described above, so it is now stripped and
`assertFixtureSafe()` checks the `migrated_v1` precondition directly instead:
the harness refuses to launch a fixture without it.

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

### Current status: clean — 16/16 consecutive

**Root cause was a macOS keychain dialog, caused by the harness itself.**

The harness used to pass a redirected `HOME` to the app. macOS resolves the
login keychain through the home directory, so Chromium's profile encryption
(OSCrypt — initialised by every Electron app, whether or not it calls
`safeStorage`) could not find a keychain and popped:

> A keychain cannot be found to store "staaash Key."

That modal stole focus from the app window at a nondeterministic point relative
to capture, and persisted until dismissed. It explains every symptom: bistable
rather than noisy (captured before vs after the dialog); immune to longer waits
(both states are stable); and identical within one process but divergent across
processes (the dialog appears once and stays).

`HOME` is no longer passed — it is only a naming convention for selecting the
fixture. It was originally redirected to stop the legacy migration importing the
real library, which turned out to be unnecessary: the seeder sets `migrated_v1`,
so `migrate.js:23` short-circuits first. `assertFixtureSafe()` now enforces that
precondition instead of trusting it.

Result: **16/16 consecutive clean calibrations**, against ~4/5 before. At the old
failure rate that streak has probability ≈ 0.003.

### Untested (not disproven): fractional column width

Before the real cause was found, the leading hypothesis was fractional column
width forcing image resampling. The experiment below **was confounded by the
keychain dialog and therefore proves nothing** — it measured dialog-induced
variance, not column geometry. The hypothesis remains **untested**. `colW` is
`(viewportW − 344) / 3`, integral when `viewportW % 3 == 2`. Ten calibrations at
each of four widths, re-seeding the fixture at each so card crops matched the
layout:

| viewport | colW | | clean | residual when it fires |
|---|---|---|---|---|
| 1436 | 364 | integral | 6/10 | 2,471 px |
| 1438 | 364.667 | fractional | 7/10 | 6,846 px |
| 1439 | 365 | integral | 8/10 | 2,976 px |
| 1440 | 365.333 | fractional | 6/10 | 3,621 px |

Integral 14/20 clean vs fractional 13/20. That null result is **not evidence
about column width** — every run in the table was contaminated by the dialog,
whose focus change dominated the signal. The per-width magnitudes (2,471 / 6,846
/ 2,976 / 3,621 px) just reflect how much content the focus change touched at
each width. To actually test the hypothesis, re-run this sweep now that
calibration is clean; if every width scores 0.00%, column width was never
implicated either way.

Any calibration above 0.00% is now a real regression. Read the element list.

Other sources of drift found along the way, all handled automatically now:

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

The current `everything` score is **2.24%** whole-screen, and it is now
reproducible run to run. (Earlier write-ups said 2.10% — that was one of the two
focus states the keychain dialog produced; 2.24% is the stable value.) With the
fixture in place the number is dominated by genuine design-vs-code differences
rather than by content, which is what makes it worth tracking.

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

Measured with `--mutate` against a same-run baseline. **Calibration is 0.00%, so
the noise floor is zero and any non-zero delta is signal** — the practical limit
is one pixel crossing pixelmatch's per-pixel threshold, not run-to-run variance.

**Geometry** — `.sb { padding-left }` shifted from its default 20px:

| shift | whole-screen | sidebar region | changed px |
|---|---|---|---|
| +0.1px | 0.003% | 0.015% | 124 |
| +0.25px | 0.020% | 0.108% | 900 |
| +0.5px | 0.041% | 0.223% | 1,863 |
| +1px | 0.186% | 1.014% | 8,481 |
| +2px | 0.381%\* | 1.644%\* | — |
| +3px | 0.288%\* | 1.568%\* | — |

\* measured before the keychain fix, so these carry ~0.08% of noise.

**Even a 0.1px shift is caught** — 124 pixels change. There is no geometric floor
worth quoting; the limit is one pixel.

Note the whole-screen column is not monotonic at larger shifts — a 3px shift can
score below a 2px one, because what is counted is glyph-edge antialiasing at
different subpixel offsets, not displacement. **Judge geometric changes on the
region, not the whole-screen number.**

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
| vs baseline | 0.993% | **1.459%** |
| vs Figma | 2.841% (unmutated 2.230%) | **2.935%** (unmutated 1.852%) |

**The gallery region catches it, unmistakably.** The cropping scheme does not
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
