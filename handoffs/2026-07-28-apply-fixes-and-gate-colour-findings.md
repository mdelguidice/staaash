# Handoff — first app fixes, extended style spec, corroboration-gated colour check

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks` (local only)

Follows [`2026-07-28-figma-layer-properties.md`](2026-07-28-figma-layer-properties.md).
**First commit in this series that changes app code.**

---

## 1. The two fixes, and how the predictions scored

Applied in `desktop/src/renderer/src/styles.css`:

```css
--sidebar: rgba(246, 243, 243, 0.01);   /* was #0a0a09, hand-flattened */
.ask      { padding: 11px; }            /* was 9px 12px → 46px tall */
.ask-chip { padding: 6px; }             /* was 7px      → 26px tall */
```

Figma's stroke sits *inside* its stated inset, so the CSS equivalent of "12px
padding with a 1px stroke" is `border: 1px` + `padding: 11px`. Same for the
chip's 7px → `border: 1px` + `padding: 6px`.

### Prediction scorecard — 2 held, 2 failed

| # | Prediction | Result |
|---|---|---|
| 1 | Token audit clears | **FAILED — harness error** |
| 2 | Three `.ask` style assertions clear | **HELD** |
| 3 | Ask-bar colour drift disappears entirely | **FAILED — diagnosis error** |
| 4 | Whole-screen delta drops | **HELD** |

**P2 held, exactly.** `.ask` measured `506,728 692×48` and `.ask-chip`
`518,740 101×24` — byte-identical to the Figma frame metadata, not merely within
tolerance.

**P4 held, modestly.** 2.238% → 2.175% (102,112 → 99,239 px). The entire drop is
the ask bar (region 1.73% → 0.61%). The sidebar fix contributes ~nothing to the
pixel delta because Δ1 is far below pixelmatch's ~27/255 floor — which is the
whole reason the colour check exists. Its effect shows there instead: sidebar
flat samples matching exactly went **783/44,281 → 43,013/44,281** (1.8% → 97.1%),
and the `#0a0a0a→#0a0a09 ×42,230` entry vanished.

### P1 failed — harness error

```
✗ --sidebar should be #F6F3F3 @1% over ink/500
  app rgba(246, 243, 243, 0.01)  expected #0a0a0a  Δ(236,233,233)
```

The audit compared the *declared* value as a hex against the *composited*
expectation. The app was now correct — the pixels prove it — but the harness
could only recognise the pre-flattened form. Since the layered declaration is
the better implementation, insisting on the flattened one was the harness being
wrong, not the app.

**Fixed:** a composite `tokenMap` entry now accepts either the composited flat
hex or the layered `rgba()`. Tokens now read 9/9 exact.

### P3 failed — diagnosis error

The ask-bar drift `#1d1c1c → #1f1e1e` Δ2 is **unchanged** (4,287 samples; only
89 of 4,749 exact), despite geometry now being byte-identical to Figma.

Last handoff claimed "the colour reads as drifted because the geometry moved."
That was wrong. Geometry is now exact and the drift is untouched, so something
else causes it — most likely the backdrop behind the 92%-translucent fill: the
app uses `backdrop-filter: blur(10px)`, and Figma has its own `blur` vector
(node 5181:539) whose parameters were never compared.

This is the second wrong diagnosis of the same finding. **Do not attempt a third
explanation without evidence** — measure the blur first.

---

## 2. Extended style spec

`visual-diff/figma/everything.styles.json` now covers six selectors: `.ask`,
`.ask-chip`, `.sb-row.is-active`, `.sb-count`, `.seg`, `.card-media`.

Every assertion records its Figma source — `get_design_context` for properties
(fills, borders, radii, padding), `get_metadata` for geometry. Rect assertions
gained `x`/`y`, so position is checked, not just size.

**Four properties are deliberately skipped**, each with the reason recorded in
`_skipped`:

| Selector | Property | Why |
|---|---|---|
| `.ask` | `padding` | `get_design_context` generates `py-[14px]`; `get_metadata` places the chip 12px from the frame top. Both cannot hold. |
| `.sb-count` | `color` | Design applies `opacity: 0.8` to the label; unclear whether that is meant to be baked into the colour. |
| `.card-media` | `height` | Figma's 195 implies aspect 1.872, not one of the app's `CARD_ASPECTS` buckets — asserting it tests the fixture's bucket choice, not the app. |
| `.card-media` | `background-color` | Design fills the thumbnail with an image, so states no background. |

### 12 new findings, all previously invisible

| Selector | Property | Figma | App | Source |
|---|---|---|---|---|
| `.card-media` | `y` | 90px | **70px** | get_metadata |
| `.card-media` | `border-top-width` | 1px | **0px** | get_design_context |
| `.card-media` | `border-top-color` | rgba(250,255,230,0.04) | rgb(245,255,225) | get_design_context |
| `.sb-row.is-active` | `y` | 70px | 75px | get_metadata |
| `.sb-row.is-active` | `width` | 224px | 223px | get_metadata |
| `.sb-count` | `x` / `y` / `width` | 210/77/26 | 208.16/82/26.84 | get_metadata |
| `.seg` | `x` / `y` / `width` / `height` | 1216/19/98/32 | 1213.1/18/100.34/34 | get_metadata |

The two that matter most:

- **The card grid starts 20px too high.** Figma places the cards frame at y=90;
  the app's masonry starts at y=70. The design has 20px of top padding the app
  lacks. The pixel diff cannot see this because fixture card artwork is cropped
  from the reference *at app-measured rects*, so the images align by
  construction. This is the crop trade-off's blind spot, caught by the only
  check that reads the DOM.
- **Card thumbnails have no border.** Design specifies a 1px
  `rgba(250,255,230,0.04)` hairline; the app has `border-width: 0`.

---

## 3. Colour check is now gated

`DRIFT_MAX` is gone. Magnitude was a poor proxy for "is this a colour problem" —
it mislabelled small structural differences as drift (the gallery Δ3) and could
never have caught a large genuine colour error.

A colour pair is now scored against the style audit:

| Level | Meaning | Reported? |
|---|---|---|
| `confirmed` | style finding on a colour property with the same two values | yes |
| `corroborated` | style finding whose element overlaps **where this pair was sampled** | yes |
| `lead` | nothing independent supports it | no — listed as a lead |

Overlap is tested against the pair's own sampled bounding box, not the whole
region. Tightening that from region → bounding box cut the gallery from 8
findings to 1 and the sidebar from 8 to 4.

| Region | Findings | Leads |
|---|---|---|
| sidebar | 4 | 19 |
| topbar | 2 | 4 |
| **ask-bar** | **0** | **23** |
| gallery | 1 | 7 |

**The ask bar is the gate working.** The sampler still sees Δ2 across ~98% of
the bar, but every `.ask` assertion now passes, so nothing corroborates it and
it is demoted to a lead. Under the old scheme it was the headline finding — and
chasing it as a colour bug is exactly the mistake that produced the failed P3
diagnosis.

**Caveat worth knowing:** all 7 current findings are `corroborated`; **zero are
`confirmed`**. The strong form — a style finding with matching colour values —
matches nothing, so the gate is currently doing weaker work than its top tier
implies.

---

## Current state

| Screen | Delta | Captures | Calibration | Tokens | Styles |
|---|---|---|---|---|---|
| `everything` | 2.175% | 2/2 identical | clean | 9/9 exact | 12 mismatched |
| `settings` | not designed | 2/2 identical | clean | 9/9 exact | 12 mismatched |
| `drawer-open` | not designed | 2/2 identical | clean | 9/9 exact | 12 mismatched |

Style findings repeat across screens because the sidebar, topbar and cards are
present on all three — the same 12 problems seen three times, not 36.

---

## Suggested next steps

1. **Fix the 20px grid offset and the missing thumbnail border.** Both are
   unambiguous, both have a stated Figma source.
2. **Measure the ask-bar blur before theorising again.** Compare the app's
   `backdrop-filter: blur(10px)` against Figma node 5181:539's parameters. Two
   explanations have already been wrong.
3. **Decide on the sub-pixel findings.** `.sb-count width 26 vs 26.84` and
   `.seg width 98 vs 100.34` are text-metric differences, probably not
   actionable. A tolerance above 0.5px would silence them — but pick it
   deliberately rather than letting them accumulate as noise.
4. **Get a `confirmed`-level colour finding to exist**, or accept that
   `corroborated` is the practical tier and simplify.

---

## Anything missed / deliberately not done

- **Light theme untouched.** `--sidebar` is layered in dark only; the light
  theme still declares a flat `#e9e9e6`, and no light-mode design exists to
  check it against.
- **The ask-bar drift is unexplained**, after two wrong diagnoses.
- **Only six selectors** carry style assertions. Card meta, drawer and modal
  chrome are all unchecked at the property level.
- **`settings`/`drawer-open` borrow `everything`'s spec files.** Correct while
  they share the same chrome; wrong the moment those screens get their own
  designs.
- **The sidebar spec came from Mike**, not from `get_design_context` — verified
  arithmetically and against the pixels, but not re-read from Figma.
- **No tolerance tuning.** Rect comparison is a flat 0.5px.
