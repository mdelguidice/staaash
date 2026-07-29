# Sidebar nav labels were clipping their own descenders — fix + harness guard

**Date:** 2026-07-29
**Branch:** `main`
**Commit:** `eeb4830` — *Stop the sidebar clipping the descenders off its own nav labels*
**Repackaged:** `desktop/dist/staaash-1.0.0-arm64.dmg`, 17:45, 120,428,923 bytes
**Reported by:** Mike, with a screenshot of the "Everything" nav row — *"The text
in this nav is getting cut off. It's not a one-off either; that is happening in
other sections as well."*

---

## What was wrong

`.sb-row-name` (the nav label in every sidebar row) carries `overflow: hidden` so
`text-overflow: ellipsis` can truncate long collection names. That is a
*horizontal* intent, but `overflow` clips both axes — and `.sb-row` sets
`line-height: 1`, giving the label a **14px line box for a face whose ink box at
14px is 17px**. The bottom ~1px of every descender fell outside the clip box and
was cut:

| Row | Clipped glyphs |
|---|---|
| Everything | y, g |
| Typography | y, p, g, y |
| Systems | y |
| Reading List | g |

Rows without descenders (Unread, Favorites, Archived, Trash) looked fine, which
is why it read as intermittent rather than systematic.

**Introduced in `66cfbc0`** ("Match the Figma Everything screen token-for-token").
Before that pass, `.sb-row` inherited the root `line-height: 1.5` → a 21px line
box, comfortably larger than the ink box, so nothing clipped.

## Why nothing caught it

- **The harness reported 11/11 selectors matching.** The style audit compares the
  app to Figma, and *Figma's own text node is 14px tall*. Comparing app to design
  would have demanded the bug.
- **The pixel delta could not isolate it.** ~330 device pixels across 11 rows, in
  a screen where the delta already sits at ~1%.
- **Mike's library has 285 items; the fixture has 235.** Irrelevant here — the
  defect is typographic, not content-dependent — but worth knowing that the
  fixture *does* reproduce it, so no real-library access was needed.

## How it was diagnosed

Three probe scripts, all under the scratchpad, all against the **fixture** (the
harness never touches the real library):

1. **Box-model + ink probe.** For every element with a clipping overflow and a
   text child, compute where the glyph ink lands relative to the clip box using
   canvas `TextMetrics` (`fontBoundingBoxAscent/Descent` for the line-box
   geometry, `actualBoundingBoxAscent/Descent` for the string's own ink). Result:

   ```
   ✗ span.sb-row-name  "Everything"  14px/14px
       L=14  fontAsc=14 fontDesc=4  inkAsc=10.18 inkDesc=3.01
       clientH=14  cutTop=-1.82  cutBottom=1.01
   ```

   Half-leading is `(14 − 18)/2 = −2px`, so the content area overflows the line
   box by 2px, and `scrollHeight − clientHeight` read **2**. Confirmed
   independently: 4 elements clipped, all `.sb-row-name`.

2. **Systemic sweep, all three screens.** Rather than trusting today's strings,
   compare every clipping box's line box against its font's own ink box using a
   worst-case reference string (`Hgjpqy`). Result: **one text selector,
   `.sb-row-name`, ×11**, on all three screens. The only other hits were two
   `svg` elements with no text nodes (false positives — SVG defaults to
   `overflow: hidden`). Also verified from the stylesheet that **every
   single-axis `overflow` declaration is a scroll container**, so the sweep's
   skip of `auto`/`scroll` hid nothing.

3. **Four-arm A/B on painted ink**, measured from the capture at 2× by counting
   dark pixels per device row inside the volt pill (crop window = the active
   row's rect inset 1px, identical in every arm):

   | `line-height` | name box | painted ink | dark-pixel tail |
   |---|---|---|---|
   | `1` (before) | 79..93 | 81..93 | `… 6 5 8 12 │ 0` — stops mid-stroke |
   | `18px` | 77..95 | **81..94** | `… 6 5 8 12 12 8 │ 0` |
   | `20px` | 76..96 | **81..94** | byte-identical to 18px |
   | `22px` | 75..97 | **81..94** | byte-identical to 18px |
   | `1.4` (19.6px) | 76.2..95.8 | 80.5..93.5 | correct tail, **whole label 0.5px up** |

   The first crop attempt used a ±8px pad that escaped the pill into the dark
   sidebar, producing nonsense (`inkTop=-8`); the numbers above are from the
   corrected crop.

## The fix

```css
.sb-row-name {
  /* … */
  line-height: 20px;
}
```

Two things make this safe, both measured rather than assumed:

- **Nothing moves.** The row is `align-items: center`, so the baseline reduces to
  `contentTop + 8 − inkBox/2 + ascent` — line-height cancels out algebraically,
  and the measurement confirms it (ink top 81.00 in every arm). Row `y=70`,
  badge `right=235`, row 5 `y=230`, More `y=508` and the masonry height are
  identical across all arms, so every harness assertion is untouched.
- **It must be an even px value.** A ratio (`1.4` → 19.6px) puts the box on a
  fractional origin and rephases the glyph raster half a pixel upward — the
  descender is correct but the whole label shifts. This was caught by measuring
  the shipped value rather than trusting the arm that preceded it. 20px gives 2px
  of slack past `y`/`g` at zero cost, since 18/20/22 paint identically.

## The harness guard — `clipAudit`

Added because the harness passed 11/11 while shipping this. It is an
**invariant, not a comparison**: *a single-line box with a clipping overflow must
not have layout overflow.* Content-independent and design-determined, so it
satisfies the assertion rule; it needs no Figma reference, cannot be a false
positive from a borrowed spec, and **fails the run**.

- `auditClipping(page)` in `tools/visual-diff/index.mjs` sweeps **every element**
  on every screen — not the 11 the spec names, since the bug was inside those 11.
- Excludes scroll containers (`auto`/`scroll`), line-clamped boxes, and anything
  genuinely holding more than one line.
- Deduped by `selector|fontSize|lineHeight` with a count, so 11 rows read as one
  defect.
- Reported as a `clipping` line per screen; lands in `report.json` as
  `clipAudit`.

**Verified by reintroducing the bug.** With `.sb-row-name { line-height: 1 }`
rebuilt into the app:

```
styles   all match  · 11 selector(s), 6 property(s) skipped
clipping 1 selector(s) clipping their own text
  ✗ span.sb-row-name 14px/14px  clips 2px (clientHeight 14 < scrollHeight 16) ×12  "Everything"
```

The style audit still says "all match" — which is the whole point.

## Harness state after

| Screen | captures | styles | clipping | tokens |
|---|---|---|---|---|
| `everything` | 2/2 identical | all match (11 selectors) | no text clipped | 9/9 exact |
| `settings` | 2/2 identical | all match | no text clipped | 9/9 exact |
| `drawer-open` | 2/2 identical | 2 known findings¹ | no text clipped | 9/9 exact |

Delta on `everything`: **1.07%** (48,921 / 4,561,920 px), sidebar region 1.08%.
Diagnostic only — nothing gates on it.

¹ `.card-media` `outline-width` 2px vs 1px and `outline-color` — the borrowed-spec
focus ring, already closed in "Accepted, not fixing".

## Also found, deliberately not chased

**A `settings` calibration flake.** `.modal-scrim` / `.modal` composite to one of
two values across launches, differing by exactly **266,368 px** every time.

- **Attributed, not assumed.** I stashed the fix, rebuilt, and reproduced it on
  the pre-fix build: **1/5**. Post-fix: **2/5**. Identical pixel count in all
  cases, and there is no causal path from a sidebar `line-height` to a modal
  scrim's alpha. 1/5 vs 2/5 at n=5 is noise — the same standard that got
  `--num-raster-threads=1` (1/5 vs a 4/8 baseline) reverted earlier in this
  project.
- **It cannot reach any output.** Scores 0.00% (120 px) after threshold — a
  sub-threshold alpha difference across the whole scrim. `settings` has no Figma
  reference, so its pixel delta is skipped entirely, and the style/clip/token
  audits read the DOM.
- Closed in the README's "Accepted, not fixing" with the measured rate. Per the
  standing instruction on flakes, **no further hypothesis is proposed.**

**`everything` disagreed once in three full runs** this session (568,738 px). The
README's claim of 20/20 clean after neutralising `filter: blur(26px)` still
stands as measured, but it is not 100%; the residual is now recorded next to it.

## Suggested next steps

1. **Launch the repackaged `.dmg` and eyeball the sidebar.** The fix is verified
   in the fixture and byte-verified inside `app.asar`, but the reported symptom
   was on Mike's real library and only he can confirm it reads right to him.
2. **`.sb-row`'s `line-height: 1` is inert and should probably go.** Measured:
   removing it (arm C) produces identical geometry and identical ink, because the
   row's height is pinned by `max-height: 32px` and its 16px icon / 18px badge —
   the text never drives it. It was left in place because it is the narrower
   change to reason about, but it remains a trap for the next clipping child
   added to a row. Removing it is a one-line change with a measured-null blast
   radius.
3. **`.sb-row`'s `max-height: 32px` clamps a natural 34px row.** The 18px count
   badge overflows the 16px content box by 1px top and bottom. Invisible today
   (the row is `overflow: visible` and digits have no descenders) but it means
   the row cannot grow if the badge ever does.
4. **Consider extending `clipAudit` to horizontal clipping.** It currently only
   catches vertical layout overflow. A label ellipsised earlier than the design
   intends is the same class of defect and is not covered.

## Files touched

| File | Change |
|---|---|
| `desktop/src/renderer/src/styles.css` | `.sb-row-name` gains `line-height: 20px` + the reasoning |
| `tools/visual-diff/index.mjs` | `auditClipping()`, wired into capture, reported per screen, fails the run, `clipAudit` in `report.json` |
| `tools/visual-diff/README.md` | "Invariants beat comparisons where the design has no opinion"; the scrim flake in "Accepted, not fixing"; a residual note on the resolved bistability; output table |

## What was missed / caveats

- **The guard was written after the fix, not before it.** The standing preference
  is assertion-first. The measurement *was* the assertion here — I watched the
  ink change before touching the app — and the guard was then verified against a
  reintroduced bug, which is equivalent evidence. Still worth naming.
- **Adding `clipAudit` is a deliberate exception to maintenance mode.** The
  README says the harness is not developed further until new designed frames
  exist. This is a regression guard for a bug that shipped to the app, not a new
  design check, so it was judged in scope. Flagging it so the exception is on the
  record.
- **`.sb-tag` was never exercised.** The fixture renders no tags, so the sweep
  could not measure `.sb-tag span` directly. Its line-height is inherited 1.5
  (18px at 12px font), so it is safe by construction — but that is reasoning, not
  a measurement.
- **The light theme is still unasserted**, as before. The fix is theme-independent
  (a line box, not a colour), so this does not add risk.
- **Two known small gaps remain unaddressed**, both already in "Accepted, not
  fixing": the TAGS header control order (app renders **+ then chevron**, design
  has **chevron then +**), and the "More" row being dimmer than drawn.
