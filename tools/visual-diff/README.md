# visual diff harness

Compares Figma frames against the real running app, pixel for pixel.

```bash
node tools/visual-diff/index.mjs
```

> ## 🔒 Maintenance mode — 2026-07-28
>
> **This tool runs and reports. It is not developed further.**
>
> Every screen that has a designed Figma frame is covered, and the findings that
> remain are either closed (see "Accepted, not fixing") or app decisions waiting
> on a product call, not harness gaps. Adding checks now would mean inventing
> expectations the design does not state — which is exactly the failure mode
> the assertion rule below exists to prevent.
>
> **What still happens:** run it, read `styleAudit`, act on findings. Fix it if
> it breaks. Update `everything.styles.json` when the Figma frame changes.
>
> **What justifies reopening development:** new designed frames in Figma. The
> settings modal and the drawer are the obvious two — both are mapped as screens
> already and audit today, but neither has a design to diff against, so their
> `figmaNodeId` is `null` and their specs are borrowed from `everything`.

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
| `report.json` | style, colour and token findings; pixel numbers under `debug` |
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
before anything is scored.

**On disagreement, only the pixel-derived output is suppressed.** The pixel
delta, the region scores and the colour check are withheld; `styleAudit` and
`tokenAudit` are reported as normal, and `report.json` carries a
`pixelOutputSuppressed` note saying so. The run still exits non-zero.

That split is measured, not assumed: across six runs landing in both render
states, the style findings were byte-identical while the colour leads moved
54 → 51 and the delta 2.022% → 2.109% (full table under "Known flake"). The
style audit reads the DOM, and the DOM is not what varies. The one exception is
an `_effectiveBackground` with `method: "painted"`, which samples the capture —
that single assertion is skipped with a reason, like any other pixel-derived
result.

`report.json` records the outcome per screen:

```json
"captureAgreement": { "captures": 2, "identical": true,
                      "diffPixels": 0, "scoredDiffPixels": 0 }
```

Agreement is **byte-exact** — every RGBA channel, not `scorePixels`. The scoring
comparator is tuned to ignore differences on purpose (`threshold: 0.1` discards
any colour distance below ~26/255; `includeAA: false` discards pixels it
classifies as anti-aliased, which is most of the edges a small layout shift
moves), so it is the wrong instrument for "is this reproducible". `diffPixels`
is the exact count; `scoredDiffPixels` is what the tolerant comparator would
have counted. When the second is 0 and the first is not, a tolerance-based gate
would have passed a screen that genuinely differs.

`--calibrate` uses the **same comparator**, so the two gates cannot disagree
about what "reproducible" means.

`--single-capture` opts out when you want speed over certainty.

On disagreement both frames and the mask are written
(`<id>.capture-a.png`, `.capture-b.png`, `.capture-diff.png`). That matters: it
is what made the 20px scroll shift diagnosable — the mask marks every
byte-differing pixel, including ones `scorePixels` discards.

### Resolved: the `everything` bistability was `filter: blur(26px)`

**Fixed 2026-07-28.** `everything` used to disagree with itself on ~21% of runs,
always by exactly the same pixel count — bimodal, two stable rendering states.
The cause was `.card-img-backdrop`'s `filter: blur(26px) saturate(1.15)
brightness(0.55)`, which sits behind every `.is-contain` card. A blur that large
is rasterised in tiles, and the tiling was not deterministic across launches.

The fix is one line in `STABILISE_CSS`, applied at capture time only:

```css
.card-img-backdrop { filter: none !important; }
```

| Arm | Disagreements | Rate |
|---|---|---|
| baseline | 4/19 | 21% |
| `content-visibility: visible` | 5/19 | 26% |
| **blur neutralised** | **0/20** | **0%** |

Twenty consecutive clean calibrations against a 21% baseline is p ≈ 0.9%.

Getting there took four arms, three of which were wrong, and the useful part is
why the last one was findable: **the disagreement was always the same pixel
count**, and that count moved — 605,635 → 600,880 — the moment `META_H` shifted
the cards. A constant that tracks card position is a constant produced by
something drawn at the cards. Rejected along the way, each recorded so nobody
retries them blind: `content-visibility: auto` (20 runs per arm),
`--num-raster-threads=1` (1/5) and `--disable-checker-imaging` (2/6) against a
4/8 baseline. None shipped.

**What neutralising the blur costs.** The app capture no longer paints the
blurred backdrop while the Figma reference still does, so the whole-screen delta
rises. That is acceptable precisely because the delta is diagnostic and lives
under `debug` — nothing gates on it — and the alternative was a harness that
could not report reproducibly at all. The style audit reads the DOM and is
unaffected either way.

**What the flake did and did not affect, while it lasted** — measured over six
single-capture runs landing in both states. This is the evidence behind
suppressing only pixel-derived output on disagreement:

| | State A (4 runs) | State B (2 runs) |
|---|---|---|
| style findings | 4, identical hash | 4, **identical hash** |
| colour findings | 0 | 0 |
| colour **leads** | 54 | **51** |
| pixel delta | 2.022% | **2.109%** |

Also worth keeping: the tolerant comparator scored that disagreement at
**0.07% (3,218 px)**, which reads as noise, while 13.3% of the frame genuinely
differed. The byte-exact gate is what made it visible.

### Region scores can be blind

A region only measures pixels. Because fixture card artwork is cropped from the
reference **at app-measured rects**, images align by construction wherever the
cards sit — so the gallery region cannot see card misplacement at all. A 20px
offset of the entire grid scored 0.00% there. It is named
`gallery-placement-blind` for that reason, and both it and the whole-screen
delta carry a `caveat` in `report.json`. Placement is caught by the style audit,
which reads the DOM.

## Exact colour check

pixelmatch cannot see a flat-colour drift below ~27/255 (see Sensitivity). That
is a structural blind spot, not a tuning choice, so colour is also checked
directly and independently.

For each region the harness walks a grid, keeps only points whose 5×5
neighbourhood is a single uniform colour in **both** images — flat interior, no
text or edges — and reports the exact RGB difference there.

**Nothing is reported as a finding unless the style audit corroborates it.** The
sampler only sees pixels, so it cannot tell "same element, wrong colour" from
"different element, similar colour". An earlier version split by magnitude
(`DRIFT_MAX`), which was a poor proxy and is gone. Instead each colour pair is
scored against the DOM-reading style audit:

**Only a style finding on a colour property counts.** A positional finding that
happens to sit under the sample is not evidence about colour — the audit was
reporting `#b9e900→#baeb00 Δ2 "corroborated by .sb-count x"`, where the style
side had said nothing about colour at all, only that a box nearby had moved by a
pixel. All three findings that survived the previous run were of that kind, and
all three correctly became leads once the gate was added.

Two tiers:

| Level | Meaning |
|---|---|
| `confirmed` | a **colour** style finding supports it — `match: "value"` if the two checks name the same hex pair, `match: "element"` if it overlaps **where this pair was sampled** |
| `lead` | nothing independent supports it — not reported as a finding |

There used to be a middle `corroborated` tier. Once only colour findings can
corroborate, that tier made the same claim as `confirmed` and differed only in
whether the two checks named the identical hex pair — which is now recorded as
`match` rather than as a separate level.

`match: "value"` needs the two checks to agree on a *value*, which for a
translucent fill means the audit must know what the element actually paints, not
what it declares. `_effectiveBackground` supplies that (see below).

Overlap is tested against the pair's own sampled bounding box, not the whole
region, so one style finding cannot vouch for a colour difference elsewhere in
the same region.

```
colour ask-bar   89/4,749 exact   no findings   · 23 lead(s)
colour gallery   119,560/120,763 exact   1 finding(s)
  ✗ #ffffff→#080808 Δ247 ×419   corroborated by .card-media border-top-color
```

The ask-bar line is the gate working: the sampler sees a Δ2 across most of the
bar, but every `.ask` style assertion passes, so it is demoted to a lead rather
than reported. Chasing it as a colour bug is exactly the mistake this prevents.

## Token audit

Independent of pixels entirely — a token can be wrong by an amount nothing can
see, and still be wrong. For every pair in the config's `tokenMap`, the app's
computed `:root` custom property is compared **exactly** against the Figma
variable:

```
tokens   9/9 exact   · 10 element colour(s) match no token
  ? #201e1e on .ask background-color — no Figma token
```

A `tokenMap` entry takes three forms:

| Form | Meaning |
|---|---|
| `'ink/500'` | a Figma variable, compared as hex |
| `{ color, alpha, over: 'ink/500' }` | translucent fill over a base token — accepts **either** the composited flat hex or the layered `rgba()` declaration, since both are correct implementations |
| `{ color, alpha }` | translucent value compared as rgba, channel for channel |

The composite form exists because parts of the design are specified as a
translucent fill over another token, so the colour they render exists nowhere as
a variable. The sidebar is `#F6F3F3` at 1% over `#080808`, which composites to
`(10.38, 10.35, 10.35)` → `#0a0a0a`. The app used to hardcode `#0a0a09` — a
hand-flattened approximation with the blue channel rounded down — and the audit
caught it:

```
✗ --sidebar should be #F6F3F3 @1% over ink/500
  app #0a0a09  expected #0a0a0a  Δ(0,0,-1)
```

It now declares `rgba(246, 243, 243, 0.01)` and passes. Both the flattened and
the layered form are accepted; the layered one is better because it survives a
change to the canvas colour.

Figma values come from `visual-diff/figma/<screen>.variables.json`; refresh with
the Figma MCP `get_variable_defs` and paste into that file.

## Computed style vs Figma layer properties

The token audit only covers `:root` variables. This covers what an element
actually paints and how big it is — background, border, radius, shadow, box size
— against the layer properties pulled from `get_design_context` and
`get_metadata`, committed to `visual-diff/figma/<screen>.styles.json`:

```
styles   12 mismatched  · 6 selector(s), 4 property(s) skipped
  ✗ .sb-row.is-active y  figma 70px  app 75px          [get_metadata]
  ✗ .seg height          figma 32px  app 34px          [get_metadata]
  ✗ .card-media border-top-width  figma 1px  app 0px   [get_design_context]
  ✗ .card-media y        figma 90px  app 70px          [get_metadata]
```

Each assertion records which Figma source it came from:

```json
"background-color": { "value": "rgba(32, 30, 30, 0.92)", "source": "get_design_context" },
"_rect": { "x": 506, "y": 728, "width": 692, "height": 48, "source": "get_metadata" }
```

`get_design_context` supplies properties (fills, borders, radii, padding, type);
`get_metadata` supplies geometry only. Where the two disagree, the property is
**skipped** and the reason recorded, rather than picking a winner:

```json
"_skipped": {
  "padding": "get_design_context generates py-[14px]; get_metadata places the chip 12px from the frame top. Both cannot hold, so neither is asserted."
}
```

Colours compare channel-for-channel including alpha, lengths as normalised
strings, rects (x/y/width/height) to within half a pixel.

### `_effectiveBackground`

`getComputedStyle` returns the *declared* colour, so a translucent fill reads as
`rgba(246,243,243,0.01)` — nothing like the `#0a0a0a` it paints. Two methods:

| method | how | use for |
|---|---|---|
| `computed` (default) | composite ancestors arithmetically | opaque surfaces |
| `painted` | modal flat colour sampled from the capture | translucent fills |

`painted` exists because arithmetic compositing does **not** reproduce
Chromium's blending — 2% white over `#080808` computes to `#0d0d0d` but paints
`#0c0c0c`. Only the painted value can match what the colour sampler sees, which
is what makes `confirmed` reachable. It is only valid where an element's
interior really is its own background: on a container full of cards the modal
colour is a card, not the canvas.

**`painted` is guarded against overlays.** It reads the capture, so anything
drawn on top is what gets sampled. The sidebar was reporting `#050505` on
`settings` and `#080809` on `drawer-open` against its real `#0a0a0a` — those are
the scrims, not a drift. The audit now scans for any `position: fixed` element
that paints (background alpha > 0, or a backdrop filter) and covers the sampled
element's centre, and **skips the assertion with the culprit named** rather than
reporting a colour the element never painted:

```
SKIP .sb effective background → method "painted" samples the capture, and
div.drawer-scrim.is-open (position: fixed) covers this element on this screen…
```

Only `position: fixed` counts — that is what overlays are; absolutely-positioned
siblings inside a scroller are not. The fix for a screen that legitimately needs
the value is its own spec with `method: "computed"`.

### What may be asserted

**Assert only quantities the design determines. Never assert quantities the
content determines.**

| The design determines | The content determines |
|---|---|
| proportions, spacing, gaps, padding | item counts and list totals |
| colour, type, radii, strokes | any size derived from text or glyphs |
| positions anchored to a fixed edge | any position downstream of the above |

Every assertion withdrawn from this spec was withdrawn under that one rule, and
each corollary below was paid for by one of them.

**1. Lists.** A first-item assertion passes whenever the container's origin is
correct and is blind to every per-item accumulation below it — the sidebar audit
passed for weeks with `.sb-row.is-active` exact at y=70 while the app omitted an
8px gap between *every* row, running 32px short by the Collections header. So
assert the **last item**, keeping the first as an origin check: first passing and
last failing means accumulation, both failing means the origin.

But only where **the design fixes the list's length**. The five Library
categories are hardcoded in `Sidebar.jsx` and match Figma, so the Trash row is
assertable. `.sb-more` was not — it compared Figma's five mock collections
against the fixture's seven, which is a content-count difference wearing
geometry's clothes. Withdrawn.

Where the last item is not assertable, **the accumulation is not assertable
either**. That is a limit to record, not to work around.

**2. Anchored edges.** `_rect` accepts `right` and `bottom` as well as
`x`/`y`/`width`/`height`. For a text-sized box, assert the edge the design
anchors, not the one its glyphs move — `x` on a trailing-anchored box carries
the box's own glyph width, which is the same mistake as asserting its width.

**Verify the edge really is anchored.** The count badge's is: it is the last
flex child of `.sb-row` with the name flexing, so switching `x` → `right`
cleared it outright. `.seg`'s is not: it sits left of `.btn-new`, which is
itself text-sized, so its right edge inherits that neighbour's glyph width
(`.btn-new` measures 60.56 against Figma's 60 — the entire 0.56px residual).
Neither of `.seg`'s horizontal edges is anchored to anything the design fixes,
so neither is asserted.

**3. Accumulation.** An accumulated position is assertable only if **every term
in it** is design-determined. Masonry card 8's y accumulates per-card media
heights, and a card's aspect bucket comes from a hash of its bookmark id — so
the assertion measured the fixture. Withdrawn; the 25.58px drift it found is
recorded on `.card-media` as `_cardAspectDrift` instead, which states the
finding without pretending it is a check.

The design-determined alternative is not clean either, and the reason is worth
knowing: the third column's x accumulates two column widths and two gutters, but
Figma's own frame pads 20px on the left and 21px on the right, so its columns
imply 365.0 where the app computes 365.33. That 0.67px is the design's rounding,
not the app's.

Withdrawn and non-assertable quantities are listed in `_notAssertable` at the
top of the styles file, so their absence reads as a decision rather than an
oversight.

### Strokes and layout

**Figma strokes do not consume layout. CSS `border` on a `box-sizing:
border-box` element does.** So every Figma coordinate measured *across* a border
the app actually draws is off by that border's width, on every stroked
container, forever. This is a systematic offset, not a bug in either tool.

The rule, applied from 2026-07-28:

1. **The spec is adjusted, not the app.** Record it as `_adjust` on the
   `_rect`, with a `_why`. The raw Figma number stays in the file; only the
   comparison uses the adjusted one, and the finding reports `figmaRaw`,
   `adjustment` and `adjustmentWhy` alongside, so an adjustment can never
   quietly hide a real drift.
2. **Strokes drawn as `outline` or `box-shadow` consume no layout and need no
   adjustment.** `.card-media` is the reference implementation: `outline: 1px
   solid var(--border-faint); outline-offset: -1px`. Assert Figma's number as-is.
3. **The adjustment propagates to children.** A `width: 100%` child of a
   bordered container, and anything anchored to that container's trailing edge,
   inherits the same offset.

Worked example — `.sb` has `border-right: 1px` inside its 264px border box, so
its content box is `264 − 20 − 20 − 1 = 223` and `.sb-row` is 223 wide against
Figma's 224:

```json
"_rect": { "x": 20, "y": 70, "width": 224, "height": 32,
           "_adjust": { "width": -1, "_why": "…" } }
```

Adjusting the spec rather than the app is the right way round here: the app's
223 leaves a symmetric 20px inside both edges, whereas Figma's non-layout stroke
leaves 20px on the left and 19px on the right. The app is the more correct of
the two.

**Before adding a stroked container to a spec, check which mechanism draws it.**
`border` → adjust; `outline`/`box-shadow` → do not.

If a screen has no styles or variables file of its own, the `everything` one is
borrowed and the report says so.

This check is also what gates the colour findings above — see "Exact colour
check".

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
any score against Figma means anything. It must print `identical`; it exits `1`
and names what moved if not:

```
exact  238,597 px differ (of 4,561,920, two launches)
scored 5.23% (238,597 px) after threshold 0.1 / includeAA false
captures are not reproducible. what changed:
  1038 blk  img.card-img
            at 676,84 → 1020,428 css px
```

**What `--calibrate` reuses between the two captures: nothing.** Each capture is
a separate `withApp()` — its own Electron launch, its own window sizing, its own
full run of the screen's `route.steps`, with `resetVolatileState()` clearing the
caches, local/session storage and Chromium's `Local State` first. Only the
fixture database on disk is shared, and it is read-only. So `--calibrate` does
exercise route steps, including click-driven side effects like `scrollIntoView`;
it is not a same-session re-screenshot.

Verified rather than assumed: adding a `Math.random()`-driven `eval` step to a
route made calibration fail (160,668 px differing across two launches), which is
only possible if the step ran in both.

Its historical weakness was the **comparator**, not the setup: the verdict came
from `scorePixels` while the message claimed "byte-identical", so a difference
under the threshold or classified as anti-aliased passed the gate. It is
byte-exact as of 2026-07-28 and reports both numbers, so the gap is visible
instead of silent.

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

**Do not gate on the pixel delta.** It lives under `debug` in `report.json`, and
the terminal prints it dim and untinted, because it is diagnostic — it moves in
the wrong direction often enough to be actively misleading:

- Correcting the 20px grid offset **raised** the whole-screen delta from 2.175%
  to 2.471% while bringing the app closer to the design. The corrected padding
  pushed a card boundary under the ask bar, and the backdrop blur spread a 5px
  canvas strip across a wide band.
- A 20px offset of the entire card grid scored **0.00%** in the gallery region,
  because fixture artwork is cropped from the reference at app-measured rects.

The top-level output is `styleAudit`, `colourCheck` and `tokenAudit`. Those read
the DOM and sample exact pixels, so they name the property and the element. The
delta is for eyeballing the side-by-side and for spotting gross breakage.

Divergences the delta used to surface, now closed: the collections list
(`COLLECTIONS_VISIBLE` was 6 against the design's 5) and the status pill
(`savedCount` counted archived bookmarks, reading 238 against 235). Both are
asserted now — the second via `_numberMatches`, which checks the footer and the
Everything badge agree rather than checking a literal count.

Historic note, kept because the shape of the mistake recurs:

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

## Accepted, not fixing

Closed as of 2026-07-28. Each of these was investigated to a conclusion; none is
waiting on anyone. They are listed so their absence from the findings is a
decision on the record rather than something that fell off the list.

**The ask-bar Δ2 colour drift.** Two flat-colour pairs in the ask-bar region
differ by 1–2 of 255. *Closed because it is correctly classified already.* It is
a `lead`, not a finding: the style audit has nothing to say about it, because
`.ask`'s effective background is 92% translucent over a `backdrop-filter` blur
and the composited value depends on blur parameters the design does not state.
Diagnosed wrongly twice — once as geometry, once as padding — and both times the
fix landed and the drift did not move. Δ2 is also a fifth of what `pixelmatch`
can see at all, so nothing downstream depends on it.

**`.seg right` — 0.56px.** *Closed because the quantity is not assertable, not
because the difference is acceptable.* `.seg` sits left of `.btn-new`, which is
text-sized, so its right edge carries that neighbour's glyph width (60.56 against
Figma's 60 — the whole residual). Neither of its horizontal edges is anchored to
anything the design fixes, so the assertion was withdrawn under "What may be
asserted" rather than left failing.

> `.seg y` was on this list and came off it. It is not a text-sized-box problem
> — it is the stroke rule. Figma's control is 32 tall with a non-layout stroke;
> the app draws that stroke as a border, making it 34, and the topbar centres
> both on y=35, so the app's top edge sits 1px higher. A `_rect._adjust` of
> `y: -1` clears it.

**`confirmed` is reachable but unpopulated.** The colour check's upper tier has
no members on any screen. *Closed because that is the correct state, not a gap.*
Reachability was demonstrated by deliberately breaking `--sidebar` to 2% and
watching a finding promote, then reverting. Nothing qualifies today because the
colour assertions pass — and after colour corroboration was type-gated, the
three findings that used to sit in the middle tier were revealed as positional
coincidences and correctly became leads.

**The light theme is unasserted.** `[data-theme='light']` overrides fifteen
tokens and nothing checks any of them. *Closed because there is no light-mode
frame in Figma to check against.* Asserting it would mean inventing expected
values, which is the failure mode the assertion rule exists to prevent. This is
the clearest candidate for reopening development if a light design is drawn.

**`.card-media`'s outline on `drawer-open` — 2px `rgba(245,255,225,0.5)`.** The
only finding left on any screen. *Closed because it is the spec being borrowed,
not a drift.* `drawer-open` has no design of its own so it reuses `everything`'s
spec, and the route opens the drawer from the first card — which focuses it, and
`.card.is-focused .card-media` correctly swaps the hairline for a focus ring.
The assertion is reading a state the borrowed spec does not describe. It
disappears the day `drawer-open` gets a designed frame and its own spec.

**`.sb`'s colour spec came from Mike, not from `get_design_context`.** The
sidebar is specified as `#F6F3F3` at 1% over `#080808` with a `#FAFFE6` 6%
stroke, supplied in conversation. *Closed because it has been corroborated
independently:* the token audit passes 9/9 against `get_variable_defs`, and the
painted value the sampler reads matches the composite. The provenance is
recorded in the spec's `_note` so a future reader knows which assertions rest on
a stated value rather than a queried one.

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
