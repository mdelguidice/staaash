# Handoff — flake resolved, assertion rule consolidated, maintenance mode

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks`

Follows [`2026-07-28-flake-experiment-audit-stability-meta-h.md`](2026-07-28-flake-experiment-audit-stability-meta-h.md).

Final development task. **The flake is fixed** — `filter: blur(26px)`, 20/20
clean. `everything` and `settings` now report **zero style findings**. One item
in the brief turned out to be wrong and is corrected below.

---

## 1. `.card-meta` paired with `META_H`

`.card-meta { min-height: 28px }`. Painted gap against Figma's 12:

| | Painted card gap |
|---|---|
| Figma | 12 |
| `META_H = 24`, meta 19 | 17 |
| `META_H = 28`, meta 19 (last commit) | **21** |
| `META_H = 28`, meta 28 | **12.01** ✅ |

**Card 8's y is unchanged at 740.58**, confirming this is a paint fix and not a
pitch fix — the masonry reserves `media + META_H` either way.

One thing worth catching: the first attempt used `min-height: 24px` and only got
the gap to 16. `box-sizing: border-box` is global, so 24 *included* the 4px
padding and produced a 24px box, not 4 + 24. It needs 28. Measured rather than
assumed, which is the only reason it did not ship at 16.

### The grep — 37 matches, but not 37 bugs

37 rules declare `font-size ≤ 13px` with no `line-height` in the same block.
That is the *pattern*; it is only a **bug** where a Figma-specified box height
depends on the resulting line box. Two such cases existed and both are now
fixed:

| Rule | Symptom | Status |
|---|---|---|
| `.sb-label` | 15px line box vs Figma's 10px text node → Library section 5px low | fixed earlier |
| `.card-meta` | 19px row vs Figma's 24px frame → 9px of dead space per card | fixed here |

**No third instance.** The obvious candidate, `.seg`, is not one — `.seg button`
already sets `line-height: 1`, and its drift was the stroke rule (below). The
other 35 are inline text where the inherited 1.5 is intended and nothing
reserves space against them. The full list is in the commit conversation; it is
not worth encoding as a lint rule for a project entering maintenance.

---

## 2. Capture disagreement now suppresses only pixel-derived output

`styleAudit` and `tokenAudit` are reported normally; the pixel delta, region
scores and colour check are withheld, and `report.json` carries
`pixelOutputSuppressed` explaining which is which. The run still exits non-zero.

The one subtlety: an `_effectiveBackground` with `method: "painted"` *does* read
the capture, so it is skipped with a reason alongside the rest — it is the only
style assertion that is not DOM-derived.

**Verified by forcing a disagreement** (a `Math.random()` route step on a screen
that has a Figma reference), since the flake can no longer produce one:

```
capture  2 captures DISAGREE (2,062 px exact, 643 scored)
suppressing pixel delta + colour check for this screen
         — style and token audits are unaffected and reported below
tokens   9/9 exact
styles   all match · 9 selector(s), 6 property(s) skipped
```

`colourCheck` serialises as `null` rather than `[]`, so a consumer can tell
"suppressed" from "ran, found nothing".

---

## 3. The flake is fixed — it was the blur

```css
.card-img-backdrop { filter: none !important; }   /* in STABILISE_CSS */
```

| Arm | Disagreements | Rate |
|---|---|---|
| baseline | 4/19 | 21% |
| `content-visibility: visible` | 5/19 | 26% |
| **blur neutralised** | **0/20** | **0%** |

Twenty consecutive clean calibrations against a 21% baseline is **p ≈ 0.9%**.
Rule kept.

`filter: blur(26px)` on `.card-img-backdrop` is rasterised in tiles, and the
tiling was not deterministic across launches. The clue that made it findable was
that the disagreement was **always the same pixel count**, and that count moved
605,635 → 600,880 the moment `META_H` shifted the cards — a constant that tracks
card position is produced by something drawn at the cards.

**Cost, stated plainly:** the app capture no longer paints the backdrop while the
Figma reference still does, so the whole-screen delta rose 2.02% → 3.60%. That is
acceptable only because the delta is diagnostic and lives under `debug` with
nothing gating on it. The style audit reads the DOM and is unaffected.

Four arms, three wrong, all recorded in the README so nobody retries them blind.

---

## 4. "Accepted, not fixing"

New README section, one line each on why closed rather than pending. Five items
as briefed, plus one that emerged as the last remaining finding.

- **Ask-bar Δ2 drift** — correctly a `lead` already; two wrong diagnoses, and Δ2
  is a fifth of what pixelmatch can see.
- **`.seg right` 0.56px** — the quantity is not assertable (downstream of
  `.btn-new`'s glyph width); assertion withdrawn rather than left failing.
- **`confirmed` unpopulated** — the correct state; reachability was demonstrated
  by deliberately breaking `--sidebar` and reverting.
- **Light theme unasserted** — no light-mode frame exists to check against.
- **`.sb` spec from Mike** — corroborated independently by the token audit (9/9)
  and the painted sample; provenance recorded in the spec.
- **`.card-media` outline on `drawer-open`** — the borrowed spec reading a focus
  ring, not a drift.

### Correction to the brief: `.seg y` is fixed, not accepted

The brief grouped `.seg y 19 vs 18` with `.seg right` as "unanchored text-sized
boxes, not assertable". **`.seg y` is neither.** It is the stroke rule: Figma's
control is 32 tall with a non-layout stroke, the app draws that stroke as a
border making it 34, and the topbar centres both on y=35 — so the app's top edge
sits exactly 1px higher. A `_rect._adjust` of `y: -1` clears it, and it did.

Its *vertical* position is design-determined even though its horizontal position
is not, which is why the two halves of the same element were separated.

---

## 5. Maintenance mode

Banner at the top of the README: the tool runs and reports and is not developed
further. It states what still happens (run it, read `styleAudit`, fix it if it
breaks, update the spec when the frame changes) and what would justify
reopening — **new designed Figma frames**, with the settings modal and the
drawer named as the obvious two.

---

## 6. `.sb-more` withdrawn

It compared Figma's five mock collections against the fixture's seven — a
content-count difference, not geometry, and the same class as the rejected
`:last-child` assertion. Removed, with the reason recorded in `_notAssertable`.

---

## 7. One rule, and what else failed it

The three overlapping rules (`_listRule`, the anchored-edge caveat, the
content-vs-design distinction) are now one README section, **"What may be
asserted"**:

> **Assert only quantities the design determines. Never assert quantities the
> content determines.**

| The design determines | The content determines |
|---|---|
| proportions, spacing, gaps, padding | item counts and list totals |
| colour, type, radii, strokes | any size derived from text or glyphs |
| positions anchored to a fixed edge | any position downstream of the above |

with three corollaries — lists, anchored edges, accumulation — each attached to
the assertion that paid for it.

### Audit result: three more assertions failed the rule

| Assertion | Why it fails | Action |
|---|---|---|
| `.sb-more` y | Figma's 5 collections vs the fixture's 7 | withdrawn (§6) |
| `.masonry-item:nth-child(8) .card-media` y | accumulates media heights whose aspect bucket comes from a **hash of the bookmark id** — it measured the fixture | withdrawn; the 25.58px drift recorded on `.card-media` as `_cardAspectDrift` |
| `.ask-chip` width | sized by its label | withdrawn (it was *passing*, which made it easy to miss) |
| `.seg` right | downstream of `.btn-new`'s glyph width | withdrawn |

The masonry one is the interesting loss, because it was the accumulation check.
**The design-determined alternative is not clean either:** the third column's x
accumulates two column widths and two gutters, but Figma's own frame pads 20px
left and 21px right, so its columns imply 365.0 where the app computes 365.33.
That 0.67px is the design's rounding, not the app's — so there is nothing
honest to assert, and the masonry keeps only an origin check. Recorded in
`_notAssertable` so the gap reads as a decision.

Everything surviving was checked and passes the rule: `.sb-count` asserts
`right` (anchored) not `x` (glyph-driven); the Trash row is assertable because
the five Library categories are hardcoded to match Figma; `.ask`'s width is
`min(692px, …)`, a design constant at this viewport.

---

## Final state

```
everything    2/2 identical   tokens 9/9   styles 0   colour 0 findings / 57 leads   delta 3.60%
settings      2/2 identical   tokens 9/9   styles 0
drawer-open   2/2 identical   tokens 9/9   styles 2   (borrowed-spec focus ring, closed)

--calibrate (byte-exact): all three identical — calibration clean
```

Spec is down to **9 selectors** from 11, and every remaining assertion passes on
the two screens that have a design.

---

## Anything missed / deliberately not done

- **The whole-screen delta rose to 3.60%** as a direct result of the blur fix.
  Expected and explained, but it means the delta is now even less comparable to
  the reference than before — treat it as a change detector only.
- **No lint rule for the line-height pattern.** 35 of the 37 matches are benign;
  encoding it would produce more noise than signal.
- **`drawer-open` and `settings` still borrow `everything`'s spec.** Correct
  until they are designed; it is what produces the one remaining finding.
- **The masonry has no accumulation check** and cannot honestly have one.
- **Light theme still unasserted**, now formally closed rather than pending.
