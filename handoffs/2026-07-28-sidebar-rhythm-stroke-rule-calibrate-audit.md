# Handoff — sidebar rhythm, the stroke rule, calibrate audit, delta demotion

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks` (local only)

Follows [`2026-07-28-grid-offset-confirmed-tier-and-blind-regions.md`](2026-07-28-grid-offset-confirmed-tier-and-blind-regions.md).

Four tasks. All four done. One premise in the brief turned out to be wrong; the
defect it pointed at was real anyway and is fixed.

---

## 1. Sidebar vertical rhythm — one wrong value, found by measurement

**The wrong value: `.sb-label` had no `line-height`.**

Measured both sides before changing anything.

Figma (`get_metadata` on `5181:39`):

| node | absolute y | height |
|---|---|---|
| `Library Label` (5181:43) | 52 | **10** |
| `Library Categories` (5181:44) | 70 | 192 |
| `Category Item`, active (5181:45) | 70 | 32 |
| `number` (5181:50) | 77 | 18 |

App (box-model walk from `.sb` down, before the fix):

| element | y | height | padding |
|---|---|---|---|
| `.sb-drag` | 0 | 48 | — |
| `.sb-label` (Library) | 48 | 27 | 4 top (inline) / 8 bottom |
| `.sb-label > span` | **52** | **15** | — |
| `.sb-row.is-active` | 75 | 32 | 8 |

The arithmetic isolates it exactly:

```
Figma:  52 + 10 + 8 = 70
App:    52 + 15 + 8 = 75
```

The label's **top edge already matched Figma exactly (52 = 52)**, and so did the
8px gap below it and the label's width (46.09 vs 46). The only wrong quantity
was the label's own line box: `font-size: 10px` with no `line-height`, so the
span inherited the root 1.5 and rendered a 15px line box against Figma's 10px
text node.

**Fix — one declaration:**

```css
.sb-label { line-height: 1; }
```

Blast radius is one section by construction: the Collections and Tags labels
contain a 22px button, so their flex line is button-sized and a 10→15px span
never affected them. Confirmed by measurement — the Collections label is still
exactly 50px tall after the change, just 5px higher.

### Assertions that cleared

| Selector | Property | Was | Now |
|---|---|---|---|
| `.sb-row.is-active` | y | 70 vs 75 | **70 = 70** ✅ |
| `.sb-row.is-active .sb-count` | y | 77 vs 82 | **77 = 77** ✅ |
| `.sb-row.is-active` | width | 224 vs 223 | **cleared by §2** ✅ |

`everything` style findings: **6 → 3.**

### Correction to the brief

The brief said five of the six findings were the sidebar offset. Two were
(`.sb-row.is-active` y and the badge y). Of the rest, one was the stroke width
(§2) and two are `.seg` in the topbar, which is a different problem.

### What measurement turned up that nobody asked about

**Figma spaces the category rows 40px apart; the app spaces them 32px.** Figma's
`Category Item`s sit at y = 0, 40, 80, 120, 160 within `Library Categories`,
each 32 tall — an **8px gap** the app does not have. It accumulates: by the
Collections header the app is 32px high, and this is plainly visible in a
side-by-side crop of the sidebar.

Nothing catches it, because only the *first* row is asserted and the first row
is now exact. **This is the largest remaining sidebar drift and it is
unasserted.** Not fixed here — it moves four rows plus everything below them,
which is more than this task asked for.

Also unasserted and measured in passing: `.sb-label` has `padding-left: 4px`, so
label text starts at x=24 against Figma's x=20 — every section label is 4px
right of the design.

---

## 2. The stroke rule, decided and written down

**Rule: the spec is adjusted, not the app.** Recorded in
`tools/visual-diff/README.md` → "Strokes and layout", and referenced from
`_strokeRule` at the top of `everything.styles.json`.

1. Figma strokes consume no layout; a CSS `border` on a `box-sizing: border-box`
   element does. Where the app draws a Figma stroke as a border, every Figma
   coordinate measured across that border is off by the border width — on every
   stroked container, systematically.
2. Strokes drawn as `outline` or `box-shadow` consume no layout and need **no**
   adjustment. `.card-media` is the reference implementation.
3. The adjustment propagates to `width: 100%` children and to anything anchored
   to the container's trailing edge.

**Why adjust the spec rather than the app.** `.sb` is 264 wide with
`border-right: 1px`, so its content box is `264 − 20 − 20 − 1 = 223`. That leaves
a symmetric 20px inside both edges. Figma's 224 leaves 20px on the left and 19px
on the right, because its stroke floats outside layout. **The app is the more
correct of the two** — adjusting the app to match 224 would import Figma's
asymmetry.

Implemented as `_rect._adjust` in the spec:

```json
"_rect": { "x": 20, "y": 70, "width": 224, "height": 32,
           "_adjust": { "width": -1, "_why": "…" } }
```

The raw Figma number stays in the file; only the comparison uses the adjusted
one. Any finding that survives an adjustment reports `figmaRaw`, `adjustment`
and `adjustmentWhy` alongside `expected`, so an adjustment can never quietly
hide a real drift.

Applied to two assertions:

- `.sb-row.is-active` width 224 → 223. **Cleared.**
- `.sb-row.is-active .sb-count` x 210 → 209. **Did not clear** — app reads
  208.16, so 0.84px remains, over the 0.5 tolerance. The rule was worth applying
  (it removed 1px of a 1.84px gap) but the residual is glyph width: the badge is
  right-anchored inside the row, so its *left* edge is text-width-dependent
  while its right edge is the stable quantity (Figma 235 adjusted, app 235.0).
  Asserting `x` on a right-anchored text-sized box is the same mistake as
  asserting its width, which was removed last session. **Suggested: add a
  `right` dimension to `_rect` and assert that instead.** Not done — it is a new
  feature and was not asked for.

---

## 3. `--calibrate` — the premise was wrong, the defect was real

### What it reuses between the two captures: nothing

`calibrateScreen()` calls `withApp()` **twice**. Each call is its own Electron
launch, its own window sizing and unmaximize, and its own full run of the
screen's `route.steps` — `withApp` only skips steps when passed `skipSteps`,
which calibrate never passes. `resetVolatileState()` clears the caches,
local/session storage and Chromium's `Local State` before each launch. Only the
fixture database is shared, and it is read-only.

**So it does exercise route steps, including click-driven side effects like
`scrollIntoView`. It is not a same-session re-screenshot, and it does not need
renaming.**

### Verified, not just read

Added a `Math.random()`-driven `eval` step to the end of the `drawer-open`
route in a throwaway config and ran `--calibrate`:

```
exact  160,668 px differ (of 4,561,920, two launches)
captures are not reproducible. what changed:
  2048 blk  div.drawer-scrim.is-open
    61 blk  div.drawer-cols "Rauno Freiberg…"
```

Calibration failed. That is only possible if the step ran in **both** launches.
The premise is disproven directly rather than by argument.

### The real defect: the comparator, not the setup

`--calibrate`'s verdict came from `scorePixels`, while its summary line claimed
*"captures are byte-identical across launches."* Those are not the same test.
`scorePixels` is tuned to ignore differences on purpose: `threshold: 0.1`
discards any colour distance below ~26/255, and `includeAA: false` discards
pixels it classifies as anti-aliased — most of the edges a small layout shift
moves. Meanwhile the diff path's own agreement check was byte-exact. **The CI
gate was strictly weaker than the check it was standing in for.**

The probe quantifies it: **160,668 pixels genuinely differed; the tolerant
comparator counted 938.** 99.4% of the signal discarded — mostly because the
change sat under the drawer's backdrop blur, which spreads a difference thinly
across a wide area at Δ1–2. The old verdict still failed here (938 ≠ 0), but
with essentially no margin: a change two orders of magnitude smaller, or one
fully under a blur, would have scored 0 and passed.

**Fixed.** Both paths now call one `compareCaptures()` helper:

- Verdict is byte-exact across all four RGBA channels.
- PNG byte equality is the fast path; a mismatch is re-checked against decoded
  pixels, so a nondeterministic encoder can never manufacture a disagreement.
- The saved mask marks every byte-differing pixel, not the pixelmatch mask — a
  difference too small to score still has to be findable.
- Both numbers are reported (`diffPixels` exact, `scoredDiffPixels` tolerant).
  When the second is 0 and the first is not, the terminal says so explicitly:
  `← scored zero: a tolerance-based gate would have passed this`.

### On the 8/8 vs 1-in-3 asymmetry

Both paths run identical code, so the asymmetry was not structural. `(2/3)^8 ≈
3.9%` — unlikely but not extraordinary, and the "1-in-3" was itself a
small-sample estimate. **Hypothesis, not a conclusion:** the diff path does more
work per launch (Figma reference read, `collectStyles`, raw decodes between
launches), so the machine is under different load, and the flake was
load-sensitive — a fixed 900ms sleep flaked "once under load" per the previous
handoff. Not investigated further; the flake itself is fixed.

---

## 4. Pixel delta demoted

`report.json` per-screen shape is now:

```
id, figmaNodeId, frame, route, window, settledAfterFrames, captureAgreement,
styleAudit, colourCheck, tokenAudit,          ← the output
debug: { _why, capture, resampled, pixelDelta: {…, caveat}, regions },
referenceSource, artifacts
```

`diffPercent`, `diffPixels`, `totalPixels`, `regions`, `resampled` and the
delta caveat all moved under `debug`, which carries a `_why` naming both pieces
of evidence: the delta rose 2.175% → 2.471% while the app moved *closer* to the
design, and a 20px grid offset scored 0.00% in the gallery region.

The terminal matches: the delta line is now dim, untinted and labelled
`— diagnostic only, not a score`. It was previously tinted green under 2%, which
read as a pass.

**Unchanged, deliberately:** the capture pipeline, the double capture, and every
side-by-side / diff / capture-a / capture-b / capture-diff artifact. Those are
what made the 20px shift diagnosable.

---

## Re-run — all three screens, double capture

```
everything    2/2 identical   tokens 9/9   styles 3 mismatched   delta 2.12% (diagnostic)
settings      2/2 identical   tokens 9/9   styles 4 mismatched   (not designed)
drawer-open   2/2 identical   tokens 9/9   styles 6 mismatched   (not designed)

--calibrate (byte-exact): all three identical
```

**No disagreement on any screen**, under the stricter comparator, in both the
diff path and calibrate.

Regions on `everything`: sidebar 2.281% (was 3.443) · topbar 1.812% ·
ask-bar 4.243% (was 4.376) · gallery-placement-blind 1.997% [caveat].

### Remaining findings on `everything` (3)

| Selector | Property | Figma | App |
|---|---|---|---|
| `.seg` | x | 1216 | 1213.1 |
| `.seg` | y | 19 | 18 |
| `.sb-row.is-active .sb-count` | x | 209 (adjusted) | 208.16 |

`.seg` x and the badge x are both right-anchored text-sized boxes — same class
of problem, same suggested fix (assert the right edge).

`settings` and `drawer-open` report more because they borrow `everything`'s spec
and their overlays cover or restyle some of those elements — `.sb effective
background` reads dimmed through the scrim, and `.card-media` picks up the
focused card's 2px focus ring.

---

## Suggested next steps

1. **The 8px row gap in the sidebar** (§1). Largest remaining drift, plainly
   visible, and currently unasserted. Add an assertion on the second row first
   so it is caught, then fix.
2. **Assert right edges for right-anchored text-sized boxes.** Would clear
   `.seg` x and the badge x, which are two of the three remaining findings.
3. **Give `settings` / `drawer-open` their own spec files** once designed.
4. **The 4px label indent** — `.sb-label` `padding-left: 4px` vs Figma's 0.

---

## Anything missed / deliberately not done

- **The ask-bar drift is still a lead and was not diagnosed**, as instructed.
- **The 8px row gap was found, not fixed.** Out of scope for the brief.
- **The `right`-edge assertion was recommended, not implemented.** New feature,
  not requested.
- **Colour findings are corroborated by *positional* style findings.** The
  sidebar's `#b9e900→#baeb00 Δ2` is "corroborated by `.sb-count` x" — but a 1px
  positional finding is not evidence of a colour problem. The corroboration
  logic does not distinguish finding *types*. Pre-existing; worth tightening.
- **The `painted` `_effectiveBackground` method is invalid under an overlay.**
  On `settings` and `drawer-open` it samples the sidebar through the scrim and
  reports `#050505` / `#080809` against `#0a0a0a`. Pre-existing.
- **Light theme still untouched** and unasserted.
- **The `.sb` colour spec still comes from Mike**, not `get_design_context`.
