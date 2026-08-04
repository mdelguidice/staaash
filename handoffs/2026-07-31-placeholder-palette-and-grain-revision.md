# Placeholder palette and grain — second revision, from the references

**Date:** 2026-07-31
**Status:** **NOT COMMITTED.** Three files modified in the working tree, the 47
stored hue sets regenerated in the real library, awaiting review of the in-app
screenshot.
**Revises:** [gradient placeholders](2026-07-30-gradient-placeholders.md) (`efb5fd3`)
and the first, reference-less revision attempt (superseded — this file replaces
that document entirely).

**Pending in the working tree**

```
 M desktop/src/main/placeholder.js             +100 -20   hue patterns, volt placement
 M desktop/src/renderer/src/lib/placeholder.js  +97 -14   palette, screen blend, falloff
 M desktop/src/renderer/src/styles.css          +42  -8   two-layer grain
```

**Artifacts**

| File | What it answers |
|---|---|
| `inapp-grid.png` (2880×1800, true 2×) | the deciding one — real grid, real thumbnails, 4 placeholders among 13 real cards |
| `inapp-grid-2.png` | a second scroll position, different cards |
| `contact-sheet.png` (3240×11506, true 2×) | all 47 at true card size, captioned with hue set and kind |
| `grain-1to1.png` | 1:1 device pixels, lit region over dark region |

---

## 1. What the references actually show

Read by eye from the five images; they were not available as files, so no pixel
measurement was possible on them. Hue and lightness figures below are estimates
and are labelled as such. Everything measured on *our own* output further down
is real measurement.

| # | Content | Hues | Roughly lit | Grain |
|---|---|---|---|---|
| 1 | navy ground, diagonal band purple → pale → blue | 2, ~70° apart | ~35% | clear, throughout |
| 2 | black right half, orange upper-left, blue centre | 2, ~195° apart | ~25% | strong, incl. the black |
| 3 | bright violet over most of frame, near-black shapes | **1** | ~70% | heaviest |
| 4 | all blue, deep navy → cerulean | **1** | ~45% | lightest, still present |
| 5 | dark plum, cyan + amber + magenta along the bottom | 3, ~130–150° apart | ~20% | heavy, incl. the plum |

**Common to all five**

1. **Grain everywhere, including the darkest regions.** The most consistent
   property of the set, and the one the shipped version missed hardest.
2. **A genuine near-black is present in every one** — even #3, the brightest,
   which uses near-black *shapes* as its contrast.
3. **The ground is tinted, never neutral grey** — navy, plum, black-blue.
4. **Large soft forms.** One to three per frame, each a big fraction of it. No
   small blobs, no hard edges.
5. **Colours read as themselves.** Where two hues meet they either pass through
   a *bright* centre (#1) or across a *dark* gap (#2, #5). Neither dwells at a
   mid-lightness midpoint.
6. **High saturation in the lit regions.** Nothing pastel, nothing washed.

**Where they disagree — and it matters**

- **Hue count varies: 1, 1, 2, 2, 3.** Two of the five are single-hue.
- **Lit fraction varies by more than 3×**, ~20% to ~70%.
- **And the two are correlated.** Both single-hue references are the *bright*
  ones; every dark-dominant reference is multi-hue. That is not a coincidence
  and it drove a real decision below.

**So the earlier instruction described #2 and #5, not the set.** "60–180° apart,
one bright peak, rest near-black" is an accurate description of two of five. The
previous pass applied it to all 47 cards, which is why it needed this one.

## 2. Register, and which reference it anchors to

**Multi-hue cards anchor to #2 and #5** — the dark-dominant pair. They are the
right model because these sit in a grid beside real thumbnails and must not
out-shout them.

**Single-hue cards anchor to #3 and #4** — the bright pair, because that is what
the references themselves do. A second hue is its own source of interest, so a
mostly-dark frame still has something to look at; one hue has only its lightness
range, and taking the brightness away too leaves nothing. This showed up worst in
the warm half of the wheel, where a dark orange is *definitionally* brown: at the
dark register, hues 10–40 came out as exactly the sludge this revision exists to
remove.

Measured on the final build, against real cards in the same screenshot:

| | floor | p50 | p90 | max | lit >60 |
|---|---|---|---|---|---|
| talkbase.io — pair | 21 | 49 | 108 | 171 | 38% |
| fasset.com — pair | 20 | 43 | 87 | 136 | 33% |
| mccann.fr — **mono** | 8 | 68 | 172 | 223 | 56% |
| kzero.com — real, dark | 0 | 18 | 156 | 255 | 26% |
| antimetal.com — real, very dark | 24 | 29 | 34 | 223 | 4% |
| unset.studio — real, bright photo | 4 | 169 | 232 | 252 | 63% |

The placeholders land inside the range the real thumbnails already occupy, at the
darker end for multi-hue and mid for mono. Nothing in the set approaches the
bright photo cards.

**On the brightness jump you flagged:** the pending change's peak of L 0.56 /
S 0.86 turned out to be the wrong thing to argue about. Peak lightness is still
0.55 for multi-hue — what actually made the previous version read as a dim
smudge was not the peak value but that the peak had **no area**: full strength at
a single mathematical point, down to 42% alpha a quarter of the way out. Measured
on a real card, only **4.9%** of it was above luminance 60, median 27. The
references have a bright *plateau*. Giving the peak a real core and a shorter
tail is simultaneously brighter where it counts and darker overall.

## 3. What changed

### Mud is a compositing property, not a palette one

The central fix. Overlapping translucent paint averages its inputs, and the
average of two colours at similar mid-lightness is brown-grey. **No choice of
hues survives source-over compositing.** The layers now composite with
`background-blend-mode: screen`: over a ground at lightness 0.028 that is close
to identity where a blob sits alone, and *adds* where blobs meet — the way
reference #1's purple and blue meet through a pale centre rather than sludge.

### Hue patterns are a weighted bag, and include mono

Ten entries, weighted to the references' own mix (4 mono, 4 pair, 2 three-way);
the repeated mono entry sets its frequency rather than being a duplicate. Result
over the 47: **17 mono, 18 pair, 12 three-way**, minimum separation among
multi-hue cards **65°** (median 155°, max 170°), **none under 60°**.

Deliberately absent: any pattern with a third stop 20–45° off the peak. That is
the first version's geometry exactly and the one place a wide lightness split
does not save it. One candidate pattern (`[0, 205, 30]`) was cut for this reason
after it produced two cards at 30° separation.

### Saturation now rises as lightness falls

The old table had it backwards — brightest stop also most saturated — so the
shadows drifted neutral. A dark region at low saturation is just grey; the
references' dark grounds are deep navy and aubergine, dark *and* saturated. The
ground also now takes hue C, the deep stop, rather than hue A.

### Volt guard: rotate the set, don't nudge the stops

The old code pushed each stop out of the band independently, which preserved the
base hue but destroyed the relationships the pattern exists to express. Now the
whole set rotates as a unit by the smallest amount that clears the band, so every
interval stays exact to the degree and a favicon-seeded card stays as close to its
brand hue as the band allows. **0 stops inside the guard band** across all 47.

### Two grain layers

One cannot cover the tonal range. `overlay` is right for the lit regions and does
nothing on near-black — most of every card. `screen` covers the blacks by lifting
the whole card. So: `overlay` at 0.72 for the lit part, plus a second pass on
normal blend at 0.11 for the dark part, on a **different seed** (same seed puts
both noise fields in the same pixels and doubles their amplitude, which reads as
dirtier grain rather than more of it).

The ceiling on the normal layer is not taste. The page behind these cards sits at
luminance **8**; 0.11 puts the card floor at ~21, just under the **24** a real
dark thumbnail (antimetal.com) already occupies in the same grid — so the
placeholders sit no lighter than the images they stand in for.

Measured effect in the dark regions: noise σ **3.5–5.8**, against a **1.7–2.7**
baseline on grainless cards.

## 4. Verified

- **Cross-launch determinism, real app, placeholder-dense viewport:** two full
  launches **byte-identical** — 15,552,000 subpixels, max delta 0.
- **Harness calibration:** all three screens byte-identical across launches.
- **Full harness run:** everything and settings clean; captures 2/2 identical on
  all three; no text clipping.
- **Generator determinism:** recomputing all 47 after writing them reproduces
  every stored value exactly (drift 0).
- **Volt guard:** 0 of 141 stops inside the band.

## 5. Corrections made during this work

1. **The blob peak had no area.** Diagnosed by measurement, not eye — 4.9% of a
   real card above luminance 60 is what "dim smudge" looks like numerically.
2. **The first fix over-corrected, then the second over-corrected back.**
   Tightening the tail fixed the median (p50 76 → 40) but gave every blob a
   visible circular *edge* — lava-lamp orbs. Adding a fourth gradient stop at
   alpha 0.14 dissolved the edge but put the mid-tone wash straight back (p50
   back to 60), because the annulus it covers is most of the blob's area. At 0.07
   the edge still dissolves and the median holds at 43–49.
3. **Two capture-density mistakes, both silent.** `page.setViewportSize()`
   switches Playwright to its own emulated viewport at scale factor 1, so the
   first "true 2×" in-app screenshot was actually 1×. Fixed by resizing the real
   `BrowserWindow` instead. Separately, a `fullPage` screenshot of an Electron
   window ignores the device scale factor, so the contact sheet is captured by
   scrolling and stitching seven slices.
4. **Two wrong card-position measurements before the third worked.**
   `getBoundingClientRect()` is useless here because `content-visibility: auto`
   collapses off-screen cards to a shared top — it claimed 39 placeholders in a
   viewport holding exactly one. `offsetTop` is equally useless because every
   card is absolutely transform-positioned and reports 0. The masonry's own
   inline `translate3d` is the only honest source.
5. **A defect I introduced and then fixed.** "Smallest rotation that clears the
   band" stops the instant it is legal, which parks a stop on the band's exact
   edge — five cards came out sharing a 92–94° chartreuse, the closest legal hue
   to the volt accent and the one the guard most exists to keep clear of. A
   hash-derived extra margin (never zero) spreads them deterministically.

## 6. If approved

1. **Commit** the three files plus this document.
2. **Decide whether to repackage.** The installed DMG predates all of this.
3. The real library's `ph_hue_a/b/c` are **already regenerated** — that had to
   happen before anything was rendered for review, per the brief. A DB backup
   from before the regeneration is at `$TMPDIR/staaash-backup-094937.db`.

## 7. Caveats and leads

- **Four cards still share hue ~96** (24° clear of volt, clearly green rather
  than chartreuse). Inherent to "rotate minimally": cards whose natural hue falls
  in the band can only land at one of four slack distances, so some collision at
  those landing hues is structural. Acceptable, but it is the reason a fifth or
  sixth green would not surprise me as the library grows.
- **`drawer-open` reports 2 style mismatches** on `.card-media` outline-width and
  outline-color against Figma. **Pre-existing** — this change does not touch
  `.card-media`, confirmed against the diff. Recorded as a lead, not diagnosed.
- **The harness leaks drawer state between runs.** A full run immediately after a
  `--calibrate` run fails on the `everything` screen with `.drawer-scrim.is-open`
  intercepting the sidebar click; re-running passes. Harness is in maintenance
  mode, so this is recorded rather than fixed.
- **The harness still does not exercise placeholders** — the fixture's sit below
  the fold. Its clean result is a regression check on everything else, not a
  check on this work. The real-app cross-launch byte comparison above is what
  actually covers it.
- **Light theme is still unstyled** for placeholders, unchanged from the first
  pass.
- **Compositions, aspect assignment and the adjacency rule are untouched**, as
  instructed. If the references imply different *arrangements* rather than
  different colour, that is a separate change.
- **The mono/multi-hue register split is a real design commitment**, not a
  parameter tweak — 17 of 47 cards are now noticeably brighter than the other 30
  by rule. It is what the references do, but it is the decision in here most
  worth disagreeing with.
