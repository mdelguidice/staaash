# Content-aware reframing — phase 2: fixed aspect set, bbox selects and centres

**Date:** 2026-07-30
**Status:** Measurement only. **No app, layout or harness code was changed.** The
visual-diff harness stays in maintenance mode and was not developed.
**Decision pending:** aspect set and thresholds are Mike's call, from the contact
sheets. No proposal is offered here.
**Predecessor:** [phase 1](2026-07-30-content-aware-reframing-phase-1.md)

**Attachments**
| File | What it is |
|---|---|
| [`sheet-1`](assets/2026-07-30-phase2-sheet-1.png) · [`2`](assets/2026-07-30-phase2-sheet-2.png) | the 25 cards with a selection, at true card size, grouped by aspect |
| [`sheet-3`](assets/2026-07-30-phase2-sheet-3.png) · [`4`](assets/2026-07-30-phase2-sheet-4.png) | the 24 the rule declines, shown native and labelled in red |
| [`2026-07-30-phase2-measure.mjs`](assets/2026-07-30-phase2-measure.mjs) | the window-geometry script, read-only |
| [`2026-07-30-phase2-windows.json`](assets/2026-07-30-phase2-windows.json) | every candidate window for every image, all five aspects |

Sheets are rendered at **730 device px wide (365 CSS px at 2×)** with the app's
16px corner radius, cropped from the full source and resized with lanczos3 — so an
upscale above 1× is genuinely being upscaled in the image you are looking at.

---

## The rule tested

The inverse of phase 1. Instead of deriving the card's aspect from the content
bbox, take a **fixed candidate set — 1.91, 1.6, 1.33, 1.0, 0.8** — and use the
bbox only to *choose* which one and to *centre* the window. The crop comes from
the full source image, never from the bbox.

Per candidate aspect `A`, on a source `W×H` with bbox centre `(cx, cy)`:

```
w    = min(W, H × A)                      largest A-shaped box that fits the source
h    = w / A
left = clamp(cx − w/2, 0, W − w)          centred on the subject, then pushed inside
top  = clamp(cy − h/2, 0, H − h)
```

**Selected aspect** = the *tightest* window (smallest crop width, so the subject
renders largest) that fully contains the bbox with **≥10% margin on every side**
and stays **under 1.3× upscale** at 730 device px.

---

## Headline: the inverse approach inverts the constraint

**Upscaling stopped being the blocker.** Among the 25 selections: min 0.18× ·
median 0.72× · **max 1.16×**. Only 7 of 25 upscale at all.

**All 24 non-selections fail on margin. Zero are upscale-limited.** In phase 1 the
crop collapsed to the subject, so an interesting crop was by construction a
pixel-poor one. Here the window is the largest of its aspect that fits the source,
so crop width stays large — never below 504px on a 1200px-wide source — and the
resolution question mostly evaporates.

The phase 1 failure mode is gone with it. `studiolenzing.com` was an 11.27:1 text
strip; it is now a clean 1.6 card with the wordmark at 79% of card width and its
breathing room intact.

## Selection distribution — 25 of 49 at 10% margin

| aspect | n | share | |
|---|---|---|---|
| 1.91 | 4 | 16.0% | ████ |
| 1.6 | 5 | 20.0% | █████ |
| 1.33 | 3 | 12.0% | ███ |
| **1.0** | **9** | **36.0%** | █████████ |
| 0.8 | 4 | 16.0% | ████ |

**All five candidates get used**; 1.0 is modal. The 24 declines fail for exactly
one reason — *bbox too large for any aspect at 10% margin*.

Grid composition of the bucket: **25 reframed across 5 aspects, 24 left native at
~1.90.**

## Subject size — median 39% → 67% of card width, ×1.90

| domain | native | selected | gain | aspect |
|---|---|---|---|---|
| semiflat.com | 33% | 78% | ×2.38 | 0.8 |
| finetune.co | 27% | 64% | ×2.38 | 0.8 |
| bevel.health | 20% | 49% | ×2.38 | 0.8 |
| ultrahuman.com | 17% | 38% | ×2.22 | 0.8 |
| kristianphoenix.com | 15% | 28% | ×1.91 | 1 |
| headroom.com | 35% | 67% | ×1.91 | 1 |
| wearecollins.com | 29% | 55% | ×1.91 | 1 |
| oimachi.co | 21% | 40% | ×1.91 | 1 |
| murynmukha.com | 31% | 60% | ×1.90 | 1 |
| medusajs.com | 25% | 48% | ×1.90 | 1 |
| cradle.bio | 18% | 34% | ×1.90 | 1 |
| whuth.id | 39% | 73% | ×1.90 | 1 |
| interfaces.dev | 27% | 51% | ×1.90 | 1 |
| beside.com | 44% | 67% | ×1.50 | 1.33 |
| parisbyemily.com | 42% | 61% | ×1.43 | 1.33 |
| flshfrm.com | 54% | 77% | ×1.43 | 1.33 |
| seungmee-lee.com | 63% | 75% | ×1.19 | 1.6 |
| antonmartinez.com | 61% | 72% | ×1.19 | 1.6 |
| studiolenzing.com | 67% | 79% | ×1.19 | 1.6 |
| getport.io | 62% | 74% | ×1.19 | 1.6 |
| edkf.fyi | 63% | 70% | ×1.12 | 1.6 |
| new-gen.ai | 74% | 74% | ×1.00 | 1.91 |
| oriol.design | 68% | 68% | ×1.00 | 1.91 |
| poolmoney.com | 79% | 79% | ×1.00 | 1.91 |
| wrk-timepieces.com | 78% | 78% | ×1.00 | 1.91 |

Median gain **×1.90**, range ×1.00–×2.38. The four ×1.00 cases select 1.91, the
frame they already had, so they are no-ops that cost nothing.

## Clamping

**12 of 25 selected windows clamp to the source bounds. In none of them does the
centre leave the subject.**

Largest shift is 49px on `bevel.health`, against an 1890px-tall source — 2.6%. All
but two shifts are vertical; the two horizontal ones are under 12px. Clamping is
not doing damage at this candidate set.

| domain | aspect | shift | centre still on subject |
|---|---|---|---|
| bevel.health | 0.8 | 0, −49px | yes |
| ultrahuman.com | 0.8 | 0, +14.5px | yes |
| flshfrm.com | 1.33 | 0, −15px | yes |
| wrk-timepieces.com | 1.91 | +11.5, +4.6px | yes |
| poolmoney.com | 1.91 | −8, −5.3px | yes |
| getport.io | 1.6 | 0, −8px | yes |
| *(6 more, all under 5px)* | | | yes |

## Per-image windows — all 49, all five aspects

`C` = window clamped to the source bounds · `!` = clamping pushed the centre off
the subject (never occurs) · **bold** = the selected window.

| domain | source | bbox | centre | **1.91** | **1.6** | **1.33** | **1** | **0.8** | selected |
|---|---|---|---|---|---|---|---|---|---|
| antonmartinez.com | 1200×630 | 730×121 | 630,315.5 | 1200×628 @0.61×C | **1008×630 @0.72×** | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | **1.6** |
| beside.com | 1200×600 | 531×124 | 600.5,300 | 1146×600 @0.64× | 960×600 @0.76× | **798×600 @0.92×** | 600×600 @1.22× | 480×600 @1.52× | **1.33** |
| bevel.health | 3600×1890 | 734×598 | 1872,994 | 3600×1885 @0.20×C | 3024×1890 @0.24×C | 2514×1890 @0.29×C | 1890×1890 @0.39×C | **1512×1890 @0.48×C** | **0.8** |
| cradle.bio | 1200×630 | 212×230 | 600,319 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | **630×630 @1.16×C** | 504×630 @1.45×C | **1** |
| edkf.fyi | 1376×768 | 860×539 | 688,384.5 | 1376×720 @0.53× | **1229×768 @0.59×** | 1021×768 @0.71× | 768×768 @0.95× | 614×768 @1.19× | **1.6** |
| finetune.co | 9600×5040 | 2582×454 | 4943,2517 | 9600×5026 @0.08×C | 8064×5040 @0.09×C | 6703×5040 @0.11×C | 5040×5040 @0.14×C | **4032×5040 @0.18×C** | **0.8** |
| flshfrm.com | 1200×630 | 643×472 | 601.5,330 | 1200×628 @0.61×C | 1008×630 @0.72×C | **838×630 @0.87×C** | 630×630 @1.16×C | 504×630 @1.45×C | **1.33** |
| getport.io | 1200×630 | 747×230 | 600.5,323 | 1200×628 @0.61×C | **1008×630 @0.72×C** | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | **1.6** |
| headroom.com | 2400×1256 | 835×128 | 1199.5,628 | 2399×1256 @0.30× | 2010×1256 @0.36× | 1670×1256 @0.44× | **1256×1256 @0.58×** | 1005×1256 @0.73× | **1** |
| interfaces.dev | 1200×630 | 320×380 | 600,315 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | **630×630 @1.16×** | 504×630 @1.45× | **1** |
| kristianphoenix.com | 1200×630 | 178×316 | 600,315 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | **630×630 @1.16×** | 504×630 @1.45× | **1** |
| medusajs.com | 1200×630 | 300×320 | 600,315 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | **630×630 @1.16×** | 504×630 @1.45× | **1** |
| murynmukha.com | 1200×630 | 377×493 | 599.5,311.5 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | **630×630 @1.16×C** | 504×630 @1.45×C | **1** |
| new-gen.ai | 1200×630 | 882×85 | 600,315.5 | **1200×628 @0.61×** | 1008×630 @0.72× | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | **1.91** |
| oimachi.co | 1200×630 | 250×250 | 600,315 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | **630×630 @1.16×** | 504×630 @1.45× | **1** |
| oriol.design | 1200×630 | 821×320 | 599.5,310 | **1200×628 @0.61×C** | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | **1.91** |
| parisbyemily.com | 4800×2520 | 2030×1845 | 2400,1260.5 | 4800×2513 @0.15× | 4032×2520 @0.18× | **3352×2520 @0.22×** | 2520×2520 @0.29× | 2016×2520 @0.36× | **1.33** |
| poolmoney.com | 2400×1260 | 1904×528 | 1208,637 | **2400×1257 @0.30×C** | 2016×1260 @0.36×C | 1676×1260 @0.44×C | 1260×1260 @0.58×C | 1008×1260 @0.72×C | **1.91** |
| semiflat.com | 2400×1260 | 790×128 | 1201,630 | 2400×1257 @0.30×C | 2016×1260 @0.36× | 1676×1260 @0.44× | 1260×1260 @0.58× | **1008×1260 @0.72×** | **0.8** |
| seungmee-lee.com | 1200×630 | 760×116 | 600,313 | 1200×628 @0.61×C | **1008×630 @0.72×C** | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | **1.6** |
| studiolenzing.com | 1200×630 | 800×71 | 600,315.5 | 1200×628 @0.61× | **1008×630 @0.72×** | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | **1.6** |
| ultrahuman.com | 3200×1800 | 546×453 | 1600,885.5 | 3200×1675 @0.23× | 2880×1800 @0.25×C | 2394×1800 @0.30×C | 1800×1800 @0.41×C | **1440×1800 @0.51×C** | **0.8** |
| wearecollins.com | 1200×630 | 345×54 | 599.5,315 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | **630×630 @1.16×** | 504×630 @1.45× | **1** |
| whuth.id | 2400×1260 | 924×370 | 1200,631 | 2400×1257 @0.30× | 2016×1260 @0.36×C | 1676×1260 @0.44×C | **1260×1260 @0.58×C** | 1008×1260 @0.72×C | **1** |
| wrk-timepieces.com | 1200×630 | 937×429 | 588.5,309.5 | **1200×628 @0.61×C** | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | **1.91** |
| artone.studio | 2400×1260 | 2400×1083 | 1200,638.5 | 2400×1257 @0.30×C | 2016×1260 @0.36×C | 1676×1260 @0.44×C | 1260×1260 @0.58×C | 1008×1260 @0.72×C | — none |
| atillataskiran.com | 1200×630 | 1099×520 | 599.5,312 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| attio.com | 1200×630 | 1117×535 | 600.5,308.5 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| capchase.com | 2400×1260 | 2254×1168 | 1228,629 | 2400×1257 @0.30×C | 2016×1260 @0.36×C | 1676×1260 @0.44×C | 1260×1260 @0.58×C | 1008×1260 @0.72×C | — none |
| charmerstudio.com | 1200×630 | 1121×556 | 596.5,312 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| da-s.ie | 512×512 | 438×138 | 255,250 | 512×268 @1.43×C | 512×320 @1.43×C | 512×385 @1.43×C | 512×512 @1.43×C | 410×512 @1.78×C | — none |
| datum.xyz | 1200×630 | 1136×568 | 600,316 | 1200×628 @0.61× | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| iamsahilvhora.com | 2400×1260 | 2255×1195 | 1223.5,662.5 | 2400×1257 @0.30×C | 2016×1260 @0.36×C | 1676×1260 @0.44×C | 1260×1260 @0.58×C | 1008×1260 @0.72×C | — none |
| jesseddy.com | 1200×630 | 512×512 | 600,315 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | — none |
| joinwarp.com | 1200×630 | 1109×551 | 596.5,316.5 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| magicui.design | 1200×628 | 1200×500 | 600,314 | 1199×628 @0.61× | 1005×628 @0.73× | 835×628 @0.87× | 628×628 @1.16× | 502×628 @1.45× | — none |
| moritzpetersen.com | 1200×630 | 1022×440 | 604,315 | 1200×628 @0.61×C | 1008×630 @0.72× | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | — none |
| nudges.fyi | 1200×630 | 1032×509 | 600,315.5 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | — none |
| ooze.design | 1208×604 | 1083×516 | 602.5,302 | 1154×604 @0.63× | 966×604 @0.76× | 803×604 @0.91× | 604×604 @1.21× | 483×604 @1.51× | — none |
| pop.site | 1920×1440 | 1453×1210 | 960.5,720 | 1920×1005 @0.38× | 1920×1200 @0.38× | 1915×1440 @0.38× | 1440×1440 @0.51× | 1152×1440 @0.63× | — none |
| re-do.studio | 1201×630 | 1136×566 | 600,315 | 1201×629 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | — none |
| rocketair.com | 1200×630 | 1120×550 | 600,315 | 1200×628 @0.61× | 1008×630 @0.72× | 838×630 @0.87× | 630×630 @1.16× | 504×630 @1.45× | — none |
| sherridesign.co | 2940×1658 | 2876×1523 | 1502,825.5 | 2940×1539 @0.25×C | 2653×1658 @0.28×C | 2205×1658 @0.33×C | 1658×1658 @0.44×C | 1326×1658 @0.55×C | — none |
| thomasmichel.me | 2400×1260 | 2160×997 | 1200,622.5 | 2400×1257 @0.30×C | 2016×1260 @0.36×C | 1676×1260 @0.44×C | 1260×1260 @0.58×C | 1008×1260 @0.72×C | — none |
| tparkes.com | 1200×628 | 1146×577 | 594,317.5 | 1199×628 @0.61×C | 1005×628 @0.73×C | 835×628 @0.87×C | 628×628 @1.16×C | 502×628 @1.45×C | — none |
| umbrel.com | 1200×630 | 912×569 | 591,299.5 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| usecache.com | 1200×630 | 1020×480 | 590,310 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| usedropshot.com | 1200×630 | 920×593 | 596,333.5 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |
| uselink.app | 1200×630 | 1074×527 | 617,310.5 | 1200×628 @0.61×C | 1008×630 @0.72×C | 838×630 @0.87×C | 630×630 @1.16×C | 504×630 @1.45×C | — none |

## What the contact sheets show

Read from looking, not from the numbers:

- **The 1.0 squares are the strongest result** — `interfaces.dev`,
  `kristianphoenix`, `medusajs`, `oimachi`, `wearecollins`, `murynmukha`. This is
  the comp's variety. `kristianphoenix` renders well at 1.16×, where phase 1
  wanted 4.10× for the same card.
- **The 0.8 portraits are the weakest.** `finetune.co` and `semiflat.com` become
  tall fields of near-empty white and black holding a small wordmark — the tall
  format amplifies the emptiness instead of filling it. If the candidate set gets
  trimmed, 0.8 is the first place to look.
- **The 24 declines are correct on inspection.** Every one is a genuinely
  content-full og:image — headline plus logo plus product shot spanning the frame
  (`attio`, `capchase`, `joinwarp`, `umbrel`, `usedropshot`, `magicui`). They are
  really *designed* compositions that phase 1's classifier put in the reframe
  bucket because their border happened to be flat. The rule declines them for the
  right reason.
- **`jesseddy.com` is the near-miss worth knowing about.** Its bbox is 512×512
  inside a 1200×630 source; the 1.0 window is 630×630 and 10% margin allows only
  504. It misses by 8px and falls back to native.

## The `designed` bucket is not recoverable

**3 of 77 at 10% margin. 0 of 77 at 20%.**

| margin | selectable |
|---|---|
| 10% | 3 / 77 — `bryntaylor.co.uk` (1.91), `jacktheobald.com` (1.0), `nichy.xyz` (0.8) |
| 20% | **0 / 77** |

The reason is structural rather than a threshold artifact:

| bucket | smallest native margin on any side (median) | min | max |
|---|---|---|---|
| designed | **0.0%** | 0.0% | 13.3% |
| reframe | 10.0% | 0.0% | 36.6% |

**Half the designed bucket has content touching an edge.** A margin-based rule
cannot rescue images that have no margin to begin with, and at 20% all 77 fail on
containment — none on upscale. Raising the requirement moves it from 3 to 0. There
is no threshold that makes that bucket work; it stays native.

For comparison, the reframe bucket at 20% margin is **12 of 49**.

---

## Open questions for phase 3

Not proposals — what these numbers leave undecided.

1. **Whether 25 of 49 is enough**, given the bucket is 49 of 241 previews. The
   whole-library effect is 25 cards reframed out of 241 — about 10%.
2. **Whether 0.8 earns its place.** It takes 4 selections and produces the two
   weakest cards on the sheets.
3. **Where the margin requirement sits.** 10% gives 25; 20% gives 12. The
   sensitivity between them was not swept.
4. **Whether the upscale ceiling matters at all now.** Nothing was rejected by it,
   and the max selected upscale is 1.16×. It may be a dead constraint at this
   candidate set.
5. **What the reframe bucket should be**, given the declines show phase 1's
   classifier over-admits. The `ringDev < 4` test finds a flat *border*, which a
   content-full og:image can also have.

## Anything missed / caveats

- **No sweep of the margin requirement.** Only 10% and 20% were run. The shape of
  the curve between them is unknown, and 25→12 is a big drop across one step.
- **"Tightest" is defined as smallest crop width.** That maximises how large the
  subject renders, which is the stated goal, but it is a choice — smallest *area*
  would order some portrait/landscape pairs differently. Not tested.
- **The candidate set was taken as given.** 1.91/1.6/1.33/1.0/0.8 was the starting
  point in the brief; no alternative sets were measured, so nothing here says this
  set is better than, say, four aspects or six.
- **The bbox is inherited from phase 1** — same variance scan, same tolerance 12.
  Phase 1 showed the >15% aspect-change count is not tolerance-sensitive
  (43/46/56 at tol 8/12/20), but the *selection* outcomes here were not re-run at
  other tolerances.
- **No live rendering.** The sheets are sharp's lanczos3, not Chromium's scaler.
  They should be very close at these ratios, but the app was not run.
- **Only the reframe and designed buckets were examined.** The 99 full-bleed and
  14 screenshot images were not tested against this rule; by construction they
  have no margin and would all decline, but that was not measured.
- **The 45 cards with no preview at all remain outside all of this** and still
  render at one constant shape — a larger uniformity problem than the 25 cards
  this rule would fix.
