# Handoff — grid offset, reachable `confirmed` tier, blind-region labelling

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks` (local only)

Follows [`2026-07-28-apply-fixes-and-gate-colour-findings.md`](2026-07-28-apply-fixes-and-gate-colour-findings.md).

---

## 1. Grid offset fixed; the "missing border" was not missing

**Grid top offset — fixed.** `.content` gained `padding-top: 20px`. Figma places
the cards frame at y=90 with the header bar ending at 70. `.card-media` now
measures y=90 and the assertion clears.

**Thumbnail border — no fix needed; my assertion was wrong.** `.card-media`
already draws the hairline:

```css
outline: 1px solid var(--border-faint);   /* = rgba(250, 255, 230, 0.04) */
outline-offset: -1px;
```

That is exactly Figma's stated stroke, implemented as an inset outline rather
than a border — visually equivalent and arguably better, since a border would
inset the image. My spec asserted `border-top-width`, read 0, and called it
missing. The spec now asserts `outline-width`/`outline-color`, and both pass.

**Both `.card-media` findings cleared.** Style findings went 12 → 6.

### The fix introduced a bug, which the harness then caught

After the padding change, `drawer-open` began failing the double-capture check
by **exactly 188,424 px, every time** — bimodal, not noise. Cross-correlating
the two saved frames put the difference at **exactly 20 CSS px of vertical
shift**, with a perfect (mean 0) match at that offset.

Cause: opening the drawer sets `focusedIndex`, and `Gallery.jsx:59` calls
`scrollIntoView({ block: 'nearest' })`. With 20px of padding now above the first
card, `nearest` treats it as slack and scrolls it away — **opening a drawer on a
top-row card jumped the grid up by 20px, undoing the fix.**

Fixed with `scroll-padding-top: 20px` on `.content`, the CSS feature for exactly
this. 6/6 clean afterwards.

Two things worth keeping from that episode:

- `--calibrate` never reproduced it (8/8 clean) while the diff path flaked ~1 in
  3. They are not interchangeable. The diff path now **saves both frames and the
  mask** on disagreement; without that the flake was undiagnosable.
- Two earlier fixes missed. `waitStable` on `.drawer` (which does not move) and
  `scroll-behavior: auto` both failed before measuring the shift. Measuring
  first would have been faster.

---

## 2. `confirmed` tier is now reachable — and demonstrated

`_effectiveBackground` assertions added for `.sb` and the canvas, plus a
`background-color` assertion for `.ask`.

The first attempt did not work. Computing the composite arithmetically gives
`#0d0d0d` for 2% white over `#080808`, but Chromium **paints `#0c0c0c`** — so
the audit and the sampler could never agree on a value, and everything stayed
`corroborated`. Two methods now:

| method | how | use for |
|---|---|---|
| `computed` (default) | composite ancestors arithmetically | opaque surfaces |
| `painted` | modal flat colour sampled from the capture | translucent fills |

`painted` is only valid where an element's interior really is its own
background — the first version sampled `.content` and returned `#ffffff`,
because that region is full of cards.

**Demonstrated by deliberately breaking the app** (`--sidebar` 1% → 2%),
rebuilding, and observing the promotion:

```
✗ #0a0a0a→#0c0c0c Δ2 ×42230   confirmed by .sb effective background
```

Then reverted. **In the current, correct state nothing promotes** — all 6
findings remain `corroborated`, because the assertions pass and there is nothing
to confirm. The tier is reachable, not populated.

---

## 3. Blind regions labelled

`gallery` → **`gallery-placement-blind`**, with a `caveat` in `report.json` and a
matching `deltaCaveat` on the whole-screen delta.

The justification is now empirical rather than theoretical: a 20px offset of the
entire grid scored **0.00%** in that region. Fixture card artwork is cropped from
the reference *at app-measured rects*, so images align by construction wherever
the cards sit.

The same run makes the point twice over: **the whole-screen delta rose from
2.175% to 2.471% while the app moved closer to the design.** Adding the correct
20px padding shifted a card boundary under the ask bar, leaving a 5px canvas
strip that the backdrop blur spread across a wide band (ask-bar region 0.61% →
4.38%). The pixel delta is not a correctness scorecard under this fixture.

---

## 4. Text-sized elements

Width/height assertions removed from `.seg` and the count badge — a fraction of a
pixel of font-metric difference was reading as a geometry failure
(`.seg width 98 vs 100.34`, `.sb-count width 26 vs 26.84`). Position, padding,
gap, radius, fills and type are asserted instead; all pass. Tolerance unchanged
at 0.5px, as instructed.

The badge selector also tightened to `.sb-row.is-active .sb-count`, since the
Figma node is the badge *within the active row*.

---

## Current state

| Screen | Delta | Captures | Calibration | Tokens | Styles |
|---|---|---|---|---|---|
| `everything` | 2.471% | 2/2 identical | clean | 9/9 exact | 6 mismatched |
| `settings` | not designed | 2/2 identical | clean | 9/9 exact | 7 mismatched |
| `drawer-open` | not designed | 2/2 identical | clean | 9/9 exact | 9 mismatched |

Remaining 6 findings on `everything`, all position, all from `get_metadata`:

| Selector | Property | Figma | App |
|---|---|---|---|
| `.sb-row.is-active` | y | 70px | 75px |
| `.sb-row.is-active` | width | 224px | 223px |
| `.seg` | x / y | 1216 / 19 | 1213.1 / 18 |
| `.sb-row.is-active .sb-count` | x / y | 210 / 77 | 208.16 / 82 |

The `.sb-row` width of 223 is explainable: `.sb` has a 1px `border-right`, so
with `box-sizing: border-box` the content box is 264 − 20 − 20 − 1 = 223. Figma's
224 assumes the stroke does not consume layout. Worth deciding deliberately.

`settings` and `drawer-open` show more findings than `everything` because they
borrow its spec and their overlays cover or shift some of those elements.

---

## Suggested next steps

1. **Fix the sidebar vertical rhythm.** Five of six findings are a consistent
   ~5px downward offset in the sidebar (`.sb-row.is-active` y 70→75, badge y
   77→82). Likely one spacing value above the Library section.
2. **Decide the 1px `.sb` border question** — whether the sidebar's
   `border-right` should consume layout width.
3. **Give `settings`/`drawer-open` their own spec files** once those screens are
   designed; borrowing `everything`'s is why they report extra findings.
4. **Consider whether the ask-bar region is worth scoring at all.** It is
   dominated by a backdrop blur over content that the fixture only approximates.

---

## Anything missed / deliberately not done

- **The ask-bar drift is still a lead and was not diagnosed**, as instructed.
- **`_effectiveBackground` is not asserted for `.ask`** — its value depends on
  the backdrop blur, which would mean diagnosing the ask bar. Skipped with a
  note.
- **`confirmed` has no live example.** It is reachable and was demonstrated, but
  nothing currently qualifies.
- **The `painted` method needs judgement.** It silently returns the wrong colour
  on a container whose interior is not its own background; there is no automatic
  guard, only the `_why` note in the spec.
- **`--calibrate` and the diff path disagree about flakiness.** Calibration was
  8/8 clean on a screen the diff path failed 1-in-3. Not investigated further.
- **Light theme still untouched** and unasserted.
- **The `.sb` spec value still comes from Mike**, not from `get_design_context`.
