# Handoff — last-item assertions, colour type-gate, anchored edges, overlay guard

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks` (local only)

Follows [`2026-07-28-sidebar-rhythm-stroke-rule-calibrate-audit.md`](2026-07-28-sidebar-rhythm-stroke-rule-calibrate-audit.md).

Four tasks, all done. One of the two predicted clears in §4a did not clear — flagged
below with the measured cause. A pre-existing capture flake was found, investigated,
and deliberately **not** "fixed", because neither candidate fix survived its own
evidence.

---

## 1. The 8px row gap — assertion first, and the assertion was watched failing

**Assertion added before the fix**, on the LAST library row rather than the second:

```
.sb-scroll > button:nth-of-type(5)   →  Figma 5181:73, absolute y = 70 + 160 = 230
```

`nth-of-type(5)` picks the fifth `<button>` child of `.sb-scroll`; the section
labels are `<div>`s so they do not count. Verified it resolves to "Trash".

**Demonstrated that it discriminates.** I applied the CSS before writing the
assertion, so I went back, neutralised the gap rule, rebuilt and re-ran:

```
✗ .sb-scroll > button:nth-of-type(5)  y   figma 230px   app 198px
```

32px — exactly 4 × 8px of accumulation — while `.sb-row.is-active` (the first
row) **still passed** in the same run. That is the failure mode in one frame:
the first-item assertion is satisfied by a correct container origin and says
nothing about the four gaps below it.

**The fix:**

```css
.sb-row + .sb-row { margin-top: 8px; }
```

Adjacent-sibling, not a margin on every row. A trailing margin would push the
next section label 8px past the design, and the label→row gap is already the
label's own 8px `padding-bottom`.

**Result — rows land on Figma exactly:**

| Row | Figma | App before | App after |
|---|---|---|---|
| Everything | 70 | 70 | 70 |
| Unread | 110 | 102 | 110 |
| Favorite | 150 | 134 | 150 |
| Archived | 190 | 166 | 190 |
| Trash | 230 | 198 | 230 |

Trash's bottom edge is 262, and the Collections label starts at 262 — matching
Figma's Library Section, which ends at 262. Both sidebar assertions now pass.

---

## 2. Sweep for first-item-only assertions

Recorded permanently as `_listRule` at the top of `everything.styles.json`, and
in the README under "Never assert only the first item of a list".

| List | Was | Now | Result |
|---|---|---|---|
| Library rows | first only | first + **last** (Trash) | passes after §1 |
| Collections rows | **not asserted at all** | last (`.sb-more`) | **NEW finding: 508 vs 552** |
| Masonry cards | first only | first + **card 8** | **NEW finding: 715 vs 732.58** |
| Tags | not asserted | still not assertable | documented, not a gap |

### New finding: collections list, 44px

Figma shows five collections then `••• More` (last container 5181:130 at
absolute y=508). The app's `COLLECTIONS_VISIBLE` is 6, so it shows six then
More, at y=552. The 44px decomposes as one extra 40px row plus a 4px offset in
where the collections group starts. This was previously a README footnote; it is
now geometry.

Note the sign flip: before the §1 gap fix, `.sb-more` was at 472 — **36px above**
Figma. After it, 552 — **44px below**. Same underlying divergence, opposite
direction, which is why a single measurement of it would have been misleading.

### New finding: masonry accumulation, 17.58px

Card 8 is the last card the design draws. The app puts its thumbnail at y=732.58
against Figma's 715, and the 17.58px is fully explained by two per-card
differences compounding:

| | Figma | App | Δ |
|---|---|---|---|
| Card 1 height | 195 + 28 = 223 | 205.2 + 24 = 229.2 | +6.2 |
| Card 4 height (col-1 2nd) | 350 + 28 = 378 | 365.3 + 24 = 389.3 | +11.3 |
| | | | **+17.5** |

Two distinct causes: the thumbnail aspect (Figma's 195/350 imply 1.872 and
1.043, neither in the app's `CARD_ASPECTS` buckets, so the fixture picks 1.78
and 1.0) **and** the meta block (`META_H = 24` in Gallery.jsx against Figma's
4px gap + 24px row = 28). The second one is new information — previous sessions
had only identified the aspect buckets.

### Why not `.masonry` height or `:last-child`

**They are not comparable quantities.** The fixture seeds the whole library —
**235 cards, 26,879px of grid** — while the Figma frame lays out the 8 above the
fold. `:last-child` is card 235 at y=26,704. Container-total-height only works
when both sides hold the same items; here it would measure the fixture.

Card 8 is safe because placement is deterministic (shortest column first), so it
lands third in column 1 on both sides. Both traps are written up in the README.

### Tags: deliberately not assertable

Figma's Tags Section (5181:148) and the tag Section items (5270:138) are
`hidden="true"`, and the fixture renders no tags with `count > 0`. There is no
list on either side — recorded so the next person does not read its absence as
an oversight.

---

## 3. Colour corroboration: type-gated, two tiers

**Type gate:** only a style finding on a **colour** property can corroborate a
colour pair. Positional findings no longer count.

**Two tiers.** Once only colour findings corroborate, the old middle tier made
the same claim as `confirmed` and differed only in whether the two checks named
the identical hex pair. That is now `match: "value" | "element"` on a single
`confirmed` level.

**How the counts moved on `everything`:**

| | Before | After |
|---|---|---|
| `confirmed` | 0 | 0 |
| `corroborated` | 3 | — (tier removed) |
| `lead` | 51 | 54 |
| **Reported findings** | **3** | **0** |

All three prior findings were positional corroborations and all three correctly
became leads:

```
sidebar  #b9e900→#baeb00 Δ2  ×37   "corroborated by .sb-row.is-active .sb-count x"
topbar   #171616→#161515 Δ1  ×340  "corroborated by .seg x"
topbar   #353434→#343333 Δ1  ×157  "corroborated by .seg x"
```

Each was a Δ1–2 drift next to a box that had moved by a pixel. The style side
had said nothing about colour at all. **The colour check now reports nothing it
cannot independently support** — which is the correct state, not a regression.

---

## 4. Two smaller fixes

### (a) `right` / `bottom` on `_rect` — one clear, one **failed prediction**

`_rect` now accepts `right` and `bottom`, both honouring `_adjust`.

| Assertion | Before (`x`) | After (`right`) | |
|---|---|---|---|
| `.sb-row.is-active .sb-count` | 210 vs 208.16 (1.84) | **236−1 = 235 vs 235.0** | **cleared** ✅ |
| `.seg` | 1216 vs 1213.1 (2.90) | 1314 vs 1313.44 (0.56) | **still fails** ❌ |

**The `.seg` prediction failed, and the premise is why: `.seg` is not a
right-anchored box.** Measuring the topbar's flex chain from its fixed trailing
edge:

```
1420 (1440 − 20 padding)
 └ .tb-icon-btn  30            → 1390
 └ gap 8, .btn-new 60.56       → 1321.44      Figma: 60
 └ gap 8, .seg   100.34        → 1313.44      Figma: 98
```

`.seg` sits *left of another text-sized element*, so its right edge inherits
`.btn-new`'s glyph width. **`.btn-new` measuring 60.56 against Figma's 60 is the
entire 0.56px residual.** Neither of `.seg`'s edges is anchored to anything
fixed, so neither is assertable at 0.5px.

The badge is genuinely anchored — last flex child of `.sb-row` with the name
flexing — which is why the same change cleared it outright. The technique is
right; it just does not apply to `.seg`. **Check that the edge really is
anchored before switching to it** is now in the README.

### (b) `painted` `_effectiveBackground` overlay guard

The audit now scans for any `position: fixed` element that paints (background
alpha > 0, or a backdrop filter) and covers the sampled element's centre, and
**skips with the culprit named**:

```
SKIP .sb effective background → method "painted" samples the capture, and
div.modal-scrim (position: fixed) covers this element on this screen…

SKIP .sb effective background → … div.drawer-scrim.is-open (position: fixed) …
```

The bogus `#050505` (settings) and `#080809` (drawer-open) findings are gone;
skipped properties went 6 → 7 on both screens. Only `position: fixed` counts —
absolutely-positioned siblings inside a scroller are not overlays.

---

## Re-run — all three screens, double capture + byte-exact calibration

```
everything    2/2 identical   tokens 9/9   styles 4   colour 0 findings / 54 leads
settings      2/2 identical   tokens 9/9   styles 4
drawer-open   2/2 identical   tokens 9/9   styles 6

--calibrate (byte-exact): all three identical — calibration clean
```

Remaining findings on `everything`:

| Selector | Property | Figma | App | Status |
|---|---|---|---|---|
| `.sb-more` | y | 508 | 552 | NEW — §2, real divergence |
| `.masonry-item:nth-child(8) .card-media` | y | 715 | 732.58 | NEW — §2, real divergence |
| `.seg` | y | 19 | 18 | pre-existing, untouched |
| `.seg` | right | 1314 | 1313.44 | §4a, cause measured |

Pixel delta 2.02% (was 2.12%), under `debug` as before.

---

## The disagreement you asked me to report

**`everything` disagrees with itself on roughly half of runs, always by exactly
605,635 pixels.** It appeared during this task's first full re-run.

What is established:

- **Not caused by this task's changes.** I reverted `styles.css` to HEAD, rebuilt
  and re-calibrated: the flake reproduced at the *same* 605,635 px. Pre-existing.
- **Not layout, and not the sidebar.** Differences begin at css x ≥ 240 and
  concentrate in css y 120–480. 73% are Δ1–2; max Δ108. Cropping both frames at
  the busiest region shows identical content in identical positions.
- **The blurred card backdrops.** `.card-img-backdrop` runs
  `filter: blur(26px) saturate(1.15) brightness(0.55)` behind every `.is-contain`
  card, and the differing pixels track those regions. `.card` also carries
  `content-visibility: auto`, so a card has more than one route to first paint.
- **Bimodal, not noise** — the identical pixel count across every occurrence
  means two stable rendering states, as with the keychain bistability and the
  20px drawer shift before it.

**Two candidate fixes were tested and both rejected:**

| Flag | Result | Baseline |
|---|---|---|
| `--num-raster-threads=1` | 1/5 disagree | 4/8 |
| `+ --disable-checker-imaging` | 2/6 disagree | 4/8 |

Neither reduction survives the sample size, so **neither was shipped** — a fix
justified by noise is exactly what the last two sessions were about. The
rejection is recorded as a comment in `DETERMINISM_FLAGS` so nobody re-tries them
blind. Next step is a properly powered run (≥20 calibrations per arm).

Worth noting what the byte-exact gate bought here: the tolerant comparator scores
this same disagreement at **0.07% (3,218 px)**, which reads as noise, while
**13.3%** of the frame genuinely differs.

---

## Suggested next steps

1. **Resolve the `everything` flake properly** — ≥20 calibrations per arm, and
   test the `content-visibility: auto` hypothesis directly rather than by flag.
2. **Decide `COLLECTIONS_VISIBLE`** — 6 in code against 5 in the design, now a
   44px geometry finding rather than a footnote.
3. **`META_H` is 24 against Figma's 28** (4px gap + 24px row). Cheap fix, removes
   the larger half of the masonry accumulation.
4. **`CARD_ASPECTS` has no bucket near 1.87 or 1.04**, the design's two card
   proportions. The remaining accumulation is this.
5. **`.seg` y 19 vs 18** — the last untouched pre-existing finding.

---

## Anything missed / deliberately not done

- **The ask-bar drift is still a lead and was not diagnosed**, as instructed.
- **`.seg` right is left as a live failing assertion** rather than skipped. It is
  a real 0.56px difference, now correctly attributed to `.btn-new`. Skipping it
  would hide a true finding; the alternative is to assert `.btn-new`'s width
  instead and let `.seg` inherit.
- **The masonry and collections findings were surfaced, not fixed.** Both are
  app-vs-design decisions (`COLLECTIONS_VISIBLE`, `META_H`, `CARD_ASPECTS`), not
  harness bugs.
- **`confirmed` is now unpopulated on every screen.** Reachability was
  demonstrated last session; the type gate did not change that, it only removed
  three findings that never qualified.
- **Light theme still untouched** and unasserted.
- **The `.sb` colour spec still comes from Mike**, not `get_design_context`.
- **Nothing committed.** Working tree holds `styles.css`, `index.mjs`, `lib.mjs`,
  `README.md`, `everything.styles.json`.
