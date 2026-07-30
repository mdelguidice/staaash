# Content-aware reframing — phase 1 measurement

**Date:** 2026-07-30
**Status:** Measurement only. **No app, layout or harness code was changed.** The
visual-diff harness stays in maintenance mode and was not developed.
**Decision pending:** the reframe rule, crop threshold and target aspects are
Mike's call, to be made from these numbers. No proposal is offered here.

**Attachments**
| File | What it is |
|---|---|
| [`assets/2026-07-30-reframe-worst-cases-a.png`](assets/2026-07-30-reframe-worst-cases-a.png) | worst cases 1–5, original + detected bbox on the left, resulting crop on the right |
| [`assets/2026-07-30-reframe-worst-cases-b.png`](assets/2026-07-30-reframe-worst-cases-b.png) | worst cases 6–10, same layout |
| [`assets/2026-07-30-reframe-measure.mjs`](assets/2026-07-30-reframe-measure.mjs) | the measurement script, read-only, re-runnable |
| [`assets/2026-07-30-reframe-data.json`](assets/2026-07-30-reframe-data.json) | per-image raw output: bbox, margins, ringDev, solidRowFrac, upscale, bucket |

---

## The question

The masonry now preserves each preview's native aspect. Because nearly every
preview is a 1200×630 `og:image`, every card is the same shape and the grid reads
as uniform — unlike the design comp, which gets its variety from cropping images
to their subject. Phase 1 asks whether deriving each card's aspect from the
image's **content bounding box** is viable.

## Headline

**Reframing produces real variety, but only 12 previews of 241 (5.0%) would get a
useful one — and two thirds of those 12 need upscaling.**

The blocker is not the one anticipated. Upscaling looked like the risk, and in
aggregate it isn't: 88% of reframes need none. But almost all of those are
trimming a few pixels of padding and changing nothing visible. Once you filter to
reframes that actually produce a different, card-shaped result, the population
collapses to 12 — and 8 of them need upscaling, 4 of them beyond 2×.

The mechanism, measured: reframes whose aspect moves >50% have **mean bbox width
749px (mean upscale 1.56×)**; reframes whose aspect moves <15% have **mean bbox
width 1368px (mean upscale 0.60×)**. A subject small enough to leave dramatic
margin is also small enough to be low-resolution. The interesting crops are the
pixel-poor ones, by construction rather than by coincidence.

## Premise corrections

1. **"All 284 previews" is the card count, not the preview count.** The library is
   **288 rows / 284 in the Everything filter** (down from 293/285 the previous
   day). **242 rows have a preview**, 241 readable. **45 cards have no preview at
   all.** Everything below is n=241.
2. **`.card-img-backdrop`, `.is-contain` and the harness stabilise rule are
   already gone**, deleted in `ef4f948` on 2026-07-29. Section 6 confirms the
   reasoning holds under reframing; it is not a pending removal.

---

## 1. Source resolution and the capture pipeline

Width min **180** · median **1200** · max **9600**. Height min 180 · median 630 ·
max 5040.

```
   0- 400     7   2.9%  ##                      << below one card at 2x
 400- 600     3   1.2%  #                       << below one card at 2x
 600- 730     3   1.2%  #                       << below one card at 2x
 730-1000     2   0.8%
1000-1200   148  61.4%  ##################################
1200-1600     7   2.9%  ##
1600-2000    15   6.2%  ###
2000-2400    34  14.1%  ########
2400-4000    16   6.6%  ####
4000+         6   2.5%  #
```

126 of 241 (52.3%) are exactly 1200×630; another 27 are 2400×1260.

**Stored at source resolution — nothing is downscaled.** `desktop/src/main/extract.js`,
in `cacheImage`, does `Buffer.from(await res.arrayBuffer())` then `writeFile`. The
bytes reach disk verbatim; there is no resize, re-encode or quality step anywhere
in the pipeline. (Same reason an AVIF served as `image/jpeg` ends up named `.jpg`
— the extension comes from the content-type header, not the bytes.)

**It cannot be configured to fetch larger sources, and there is no setting to
change.** The URL is whatever `og:image` / `twitter:image` published, with only
relative→absolute resolution applied. The publisher's resolution is the ceiling.
Many CDNs accept size parameters, but adding them means per-CDN URL rewriting —
new work, not configuration.

At native framing this does not matter: **94.6% already exceed 730px wide.**

## 2. Content bounding box

**Method: a row/column variance scan against an estimated border colour, not
`sharp.trim()`.** Reasons, in the order they mattered:

1. `.trim()` keys off the top-left pixel. Any image whose subject reaches that
   corner trims to nothing, and its output cannot be told apart from genuinely
   full-bleed.
2. It returns a box and nothing else. The per-row and per-column profiles are what
   make section 4's classification possible at all — margin symmetry, edge contact
   and solid-row fraction all come from them.
3. Tolerance control. One JPEG ringing artifact on a flat background defeats an
   all-or-nothing threshold; requiring a minimum *fraction* of a row to differ
   does not.

`.trim()` was still run alongside as an independent cross-check.

Parameters: border colour = per-channel **median of a 2px ring** (median so a
subject bleeding off one edge cannot drag the estimate); content = **max channel
distance > 12/255**; a row or column counts as content when **>0.5%** of it
differs.

**105 of 241 (43.6%) have no trimmable margin at all.** Median trimmed area 3.2%.
35 images (14.5%) are more than half margin.

```
aspect          source              bbox
0.00-0.60      5                     6
0.60-0.95      1                     5
0.95-1.10      8  #                  8  #
1.10-1.60      5                    18  ##
1.60-1.85     17  #                 26  ###
1.85-1.95    196  ################ 106  #########
1.95-2.30      9  #                 49  ####
2.30-4.00      0                     8  #
4.00+          0                    15  #
```

Distinct aspects (3dp) go **33 → 146**. Variety is real — but a third of it lands
beyond 2.3:1, which is not a card shape.

**Aspect changes by more than 15%: 46 images (19.1%).**
(>5%: 97 · >10%: 61 · >25%: 35 · >50%: 20.)

**Tolerance sensitivity.** At 8 / 12 / 20 the >15% count is **43 / 46 / 56** and
strips-wider-than-4:1 is **12 / 12 / 15**. The conclusion does not depend on the
threshold.

## 3. Upscale headroom (365 CSS px = 730 device px)

| | native | reframed |
|---|---|---|
| no upscaling | 228 (94.6%) | 212 (88.0%) |
| under 1.3× | 3 | 8 |
| 1.3×–2× | 3 | 8 |
| over 2× | 7 | 13 |

Median upscale if reframed 0.61× · p90 1.14× · p99 2.92×.

That table is the misleading one. Filtered to reframes worth doing — **card-like
shape (0.667–2.2) AND aspect moving >15%** — the population is **12 of 241 (5.0%)**:

| domain | bbox | aspect | upscale |
|---|---|---|---|
| parisbyemily.com | 2030×1845 | 1.90 → 1.10 | 0.36× |
| usedropshot.com | 920×593 | 1.90 → 1.55 | 0.79× |
| umbrel.com | 912×569 | 1.90 → 1.60 | 0.80× |
| bevel.health | 734×598 | 1.90 → 1.23 | 0.99× |
| flshfrm.com | 643×472 | 1.90 → 1.36 | **1.14×** |
| ultrahuman.com | 546×453 | 1.78 → 1.21 | **1.34×** |
| jesseddy.com | 512×512 | 1.90 → 1.00 | **1.43×** |
| murynmukha.com | 377×493 | 1.90 → 0.76 | **1.94×** |
| interfaces.dev | 320×380 | 1.90 → 0.84 | **2.28×** |
| medusajs.com | 300×320 | 1.90 → 0.94 | **2.43×** |
| oimachi.co | 250×250 | 1.90 → 1.00 | **2.92×** |
| cradle.bio | 212×230 | 1.90 → 0.92 | **3.44×** |

**4 need no upscaling · 1 under 1.3× · 3 at 1.3–2× · 4 over 2×.**
The flagged card, `interfaces.dev`, is in the worst quartile at 2.28×.

## 4. Classification

Signals, all measured:

- **`ringDev`** — mean per-channel deviation of the 2px border ring from its own
  median. Flat studio background ≈0; a photograph running to the edge is tens.
  This is the "is there a background at all" test.
- **trimmed area fraction** — how much of the frame is margin.
- **margin symmetry** — |L−R|/W and |T−B|/H. A centred subject is symmetric; a
  composed layout parks its content off-centre.
- **`solidRowFrac`** — rows that are a single flat colour across. UI chrome
  produces bands; photographs almost never do.

Thresholds (fixed before the run, **not** tuned to make the examples agree): flat
border `ringDev < 4` · meaningful margin `> 0.10` · edge-to-edge `< 0.02` · UI
banding `solidRowFrac > 0.10` · symmetric `< 0.06`.

| bucket | n | % | median upscale | need upscaling |
|---|---|---|---|---|
| **reframe** — flat bg, centred subject | 49 | 20.3% | 0.79× | 12 |
| **designed** — intentional whitespace | 77 | 32.0% | 0.62× | 6 |
| **full-bleed** | 99 | 41.1% | 0.61× | 7 |
| **screenshot** — edge-to-edge UI | 14 | 5.8% | 0.61× | 3 |
| uniform-frame (trims to nothing) | 2 | 0.8% | 2.43× | 1 |

**Calibration: 4 agree, 0 disagree.**

| domain | classified | expected | evidence |
|---|---|---|---|
| interfaces.dev | reframe | reframe | ringDev 0 · margin 83.9% · symX 0 symY 0 |
| contralabs.com | full-bleed | full-bleed | ringDev 59.7 · margin 0% · solidRows 0 |
| stateofaidesign.com | designed | designed | ringDev 54.1 · margin 2.4% |
| thesvg.org | screenshot | screenshot | ringDev 16.3 · margin 0% · solidRows 0.169 |

Four points is weak validation. The soft boundary is **designed vs reframe** —
both have margin, and they are separated only by border flatness and symmetry.

Within the 49-strong reframe bucket the resulting shape is: **24 card-like
landscape · 8 portrait/square · 17 strips wider than 2.2:1 · 1 below the clamp.**
More than a third of the bucket reframes to something unusable.

## 5. Ten worst cases — inspected, not inferred

Rendered each detected bbox over its original and looked at the crops. See the two
attached contact sheets.

| # | domain | aspect | why the crop is bad |
|---|---|---|---|
| 1 | studiolenzing.com | 1.90 → **11.27** | wordmark on white; crop is a bare 800×71 text strip |
| 2 | new-gen.ai | 1.90 → **10.38** | logo lockup — the margin *is* the composition |
| 3 | seungmee-lee.com | 1.90 → **6.55** | name in serif type; a faint underline is the only other content |
| 4 | wearecollins.com | 1.90 → **6.39** | white "COLLINS" on black; letters only, and 2.12× upscale |
| 5 | headroom.com | 1.91 → **6.52** | wordmark on cobalt; the blue field carries the brand and is discarded |
| 6 | finetune.co | 1.90 → **5.69** | a 9600px source reduced to a 2582×454 wordmark strip |
| 7 | kristianphoenix.com | 1.90 → 0.56 | centred bust on black — the best-looking crop of the ten, and at 178px wide unusable (**4.10×**) |
| 8 | cradle.bio | 1.90 → 0.92 | circular logo mark; good crop, 212px of source (**3.44×**) |
| 9 | oimachi.co | 1.90 → 1.00 | rounded-square mark; 250px of source (**2.92×**) |
| 10 | interfaces.dev | 1.90 → 0.84 | the flagged card. Crop is correct and gives real portrait variety — from 320px (**2.28×**) |

**The dominant failure mode is not a clipped subject. It is that the whitespace
was load-bearing.** Six of the ten are logo-on-flat-field og:images where trimming
leaves a typographic strip no masonry can place.

## 6. Letterboxing cannot return — confirmed

Under bbox reframing a card's aspect **is** the cropped image's aspect by
construction, so `object-fit: contain` has nothing to do. Verified across all 241
including the leave-native buckets:

- **235 cards** — shape equals image aspect exactly; `cover` crops nothing.
- **6 cards** — the 1.5× tall clamp binds, so `cover` crops vertically using
  `focal_y`. That is a crop, not a letterbox.
- **9 cards** would exceed 4:1 under reframing. Extreme, but wide shapes do not
  letterbox either.

**No card needs `contain` under any of the four buckets.**

On removal: `.card-img-backdrop`, `.is-contain` and the harness's `filter: none`
stabilise rule were all deleted in `ef4f948`. `object-fit: cover` is now the only
value in the stylesheet; the sole surviving mention is the comment at
`tools/visual-diff/lib.mjs:151` recording why the workaround went. Four
consecutive clean calibrations followed. **Nothing further to remove, and this
measurement confirms reframing would not bring the need back.**

---

## What phase 2 would have to answer

Not proposals — the open questions these numbers raise.

1. **Whether 12 cards justifies the machinery.** 5.0% of the library gets a useful
   reframe, and 8 of the 12 need upscaling. The comparison to make is against
   cheaper sources of variety.
2. **Where the upscale ceiling sits.** At 1.3× the useful set is 5 cards; at 2× it
   is 8; unbounded it is 12. The four beyond 2× include the motivating example.
3. **Whether re-capture changes the picture.** The pipeline stores what publishers
   serve, and a 320×380 subject inside a 1200×630 og:image is not fixed by
   re-fetching the same URL. It would need a different source — a live page
   screenshot at high DPR, which is a new capture path, not a setting.
4. **How to suppress strip outputs.** 17 of 49 reframe candidates produce >2.2:1.
   A shape guard is unavoidable if reframing ships.
5. **Whether `designed` (77 images) is really leave-native.** It is the largest
   ambiguous bucket and the one the classifier is least confident about.

## Anything missed / caveats

- **The classifier is validated on 4 points.** It agrees on all four and the
  thresholds were not tuned to fit, but that is weak evidence for a 241-image
  partition. The `designed` bucket (32% of the library) is the least trustworthy.
- **`solidRowFrac` conflates screenshots with flat-design graphics.**
  `stateofaidesign.com` scores 0.176 — higher than `thesvg.org`'s 0.169 — and is
  separated from it only by having a margin at all. That separation is thin.
- **No perceptual quality measurement of upscaling.** "2.28×" is a ratio, not a
  judgement; whether it looks bad on a retina card at 365 CSS px was not tested.
  A rendered comparison would settle it and was out of scope.
- **1 image unreadable** (`kerem.co` — a 114-byte HTML error page saved as `.jpg`,
  already recorded in the prior handoff). It is excluded from all 241 counts.
- **45 cards have no preview at all** and are outside this analysis entirely. They
  currently render at a single constant shape, which is its own uniformity problem
  and a larger one than the 12 cards reframing would fix.
- **Live-vs-archived was not split.** All 241 readable previews are counted
  regardless of archive state; 239 of 242 are in the Everything filter, so the
  distinction moves nothing material.
