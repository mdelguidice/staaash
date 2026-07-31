# Reframed grid mock, and gradient placeholders for cards with no image

**Date:** 2026-07-30
**Status:** Previews only. **No app, layout or harness code was changed.** The
visual-diff harness stays in maintenance mode.
**Predecessors:** [phase 1](2026-07-30-content-aware-reframing-phase-1.md) ·
[phase 2](2026-07-30-content-aware-reframing-phase-2.md)

**Attachments**
| File | What it is |
|---|---|
| [`p3-grid-3up`](assets/2026-07-30-p3-grid-3up.png) | current · proposed · proposed-without-0.8, side by side, real card order |
| [`p3-grid-proposed`](assets/2026-07-30-p3-grid-proposed.png) | the proposed panel alone, true card size |
| [`p3-composition-stable`](assets/2026-07-30-p3-composition-stable.png) | the 10 compositions, each at 1.91 / 1.0 / 0.8 |
| [`p3-gradients-45`](assets/2026-07-30-p3-gradients-45.png) | all 45 placeholder cards, shapes levelled, hues adjacency-resolved |
| [`p3-grid-with-gradients`](assets/2026-07-30-p3-grid-with-gradients.png) | proposed grid with placeholders in real order |
| [`p3-stable.mjs`](assets/2026-07-30-p3-stable.mjs) · [`p3-assign.mjs`](assets/2026-07-30-p3-assign.mjs) | the compositions and the assignment rules |
| [`p3-grid.mjs`](assets/2026-07-30-p3-grid.mjs) · [`p3-favicons.mjs`](assets/2026-07-30-p3-favicons.mjs) | the gallery renderer and the favicon analysis |
| [`p3-favicons.json`](assets/2026-07-30-p3-favicons.json) | per-domain extracted colours |

All mocks use the app's own constants from `Gallery.jsx`: `COL_W 365.33`,
`GAP_X 20`, `GAP_Y 12`, `META_H 28`, 3 columns, shortest-column-first placement,
rendered at 2× with the real 28px meta row and 16px corner radius.

---

# Part 1 — the reframed grid

## Margin sweep, downward

Only tested upward before. Downward recovers meaningfully more:

| margin | reframe | designed | aspect spread (reframe) |
|---|---|---|---|
| **5%** | **31/49** | 11/77 | 1.91:6 1.6:4 1.33:5 1.0:11 0.8:5 |
| 6% | 30/49 | 10/77 | 1.91:5 1.6:5 1.33:5 1.0:10 0.8:5 |
| 8% | 26/49 | 5/77 | 1.91:3 1.6:6 1.33:2 1.0:10 0.8:5 |
| 10% | 25/49 | 3/77 | 1.91:4 1.6:5 1.33:3 1.0:9 0.8:4 |
| 15% | 18/49 | 1/77 | 1.91:5 1.6:0 1.33:2 1.0:8 0.8:3 |
| 20% | 12/49 | 0/77 | 1.91:0 1.6:1 1.33:3 1.0:6 0.8:2 |

**The 8px near-miss resolves at 8% and below.** `jesseddy.com` has a 512×512 bbox
in a 1200×630 source; the 1.0 window is 630×630, and 10% margin allows only 504.
At 8% it selects 1.0 at 1.16× upscale.

Note the shape of the curve: 10%→8% costs only one extra card (25→26) but
8%→6% adds four (26→30). The knee is between 6% and 8%. The `designed` bucket
climbs too — 3 → 11 between 10% and 5% — so a lower margin partially reopens the
bucket phase 2 closed, though 11 of 77 is still marginal.

## The grid mock, and the honest density

**In the real first 21 cards, only 2 are reframed.** Across the first 36, 3.

That is the single most decision-relevant number here and it is not visible in
any earlier report: the reframe bucket is 49 of 241 previews, and those 49 are
spread through the library, so **a real screenful changes very little.** The
side-by-side is nearly identical by construction — not because the rule is weak
on the cards it touches, but because it touches so few.

Where it does fire it reads well. `sellerai.com` and `interfaces.dev` both become
1.0 squares and visibly break the run of 1.91 letterboxes in column 1.

**The without-0.8 variant is identical to the proposed one at this slice** — none
of the 2 reframed cards selected 0.8. To judge 0.8 you need the phase 2 contact
sheets, where its four cards (`semiflat`, `finetune`, `bevel`, `ultrahuman`) are
the weakest of the 25.

---

# Part 2 — gradient placeholders

## Favicon colour viability: most are not usable

45 cards have no preview image.

| | n | share |
|---|---|---|
| two or more distinct colours | 9 | 20.0% |
| effectively one colour | 12 | 26.7% |
| near-black / near-white only | 14 | 31.1% |
| no favicon at all | 7 | 15.6% |
| favicon unreadable | 3 | 6.7% |
| **usable as a colour seed** | **21** | **46.7%** |

Method: favicons resized to 48px, opaque pixels bucketed into 18 hue bins, a bin
counting as a colour only if it holds ≥12% of the chromatic pixels; pixels with
saturation <0.18 or lightness outside 0.12–0.90 are discarded as achromatic. An
icon whose chromatic pixels are under 10% of its opaque pixels is classed
achromatic outright.

**Verdict: a house palette has to be the base, with favicon hue as an optional
seed.** 53% are unusable, and the failure is not evenly spread — 14 of the 45 are
monochrome marks (black or white glyph on transparent), which is a house style in
this corner of the web rather than an accident.

The implemented rule does exactly that: `palette(domain, seedHue)` takes the
favicon's dominant hue where one exists and the domain hash otherwise, then
derives two more stops 16–30° away. **22 of 45 ended up favicon-seeded, 23 on the
house palette**, and the two are indistinguishable in register because saturation
and lightness are imposed by the palette either way — the favicon contributes
hue only.

## The stable — 10 compositions

Drawn as SVG, no baked image files. All geometry is fractional and scaled by the
box diagonal, so a composition holds its balance at any proportion; the sheet
shows each at 1.91, 1.0 and 0.8.

`corner-rise` · `centre-bloom` · `diagonal-sweep` · `top-arc` · `twin-poles` ·
`off-orbit` · `low-horizon` · `edge-glow` · `scatter-trio` · `vertical-drift`

Each is 3–4 large soft blobs on a near-black tinted base, blurred at 10% of the
diagonal, with a grain overlay from `feTurbulence` at 0.32 opacity. Grain was
verified to actually render rather than assumed — high-frequency energy measures
**0.61 with it against 0.23 without**, a 2.7× increase.

Register is deliberately muted: blob lightness 0.24–0.34, saturation 0.40–0.52,
base lightness 0.055. These sit beside mostly-dark thumbnails and must not
out-shout them.

## Assignment rules

- **Composition** — `hash(domain + ':comp') % 10`. Deterministic.
- **Palette** — favicon hue where usable, else `hash(domain) % 360`; two further
  stops 16–30° away, direction from the hash. Deterministic.
- **Shape** — see below.
- **Adjacency** — same column immediately above/below (no third card between),
  plus any card in a neighbouring column overlapping vertically by more than half
  the shorter card's height. Two adjacent placeholders collide if their hues are
  within 30°; the later one is nudged 48° and given a different composition.
  **14 of 45 needed a nudge**, all resolved in one pass.

### Column levelling degenerates, and had to be bounded

The brief asked for shape "chosen to best level its column against the others".
Implemented naively this collapses: **41 of 45 cards come out 1.91.**

The reason is a self-reinforcing loop. Placement always targets the *shortest*
column, so "bring it level" is minimised by adding the *least* height — which is
the 1.91 card — which leaves that column shortest, so it is chosen again and gets
1.91 again. Greedy per-card levelling is biased small by construction.

Bounding it fixes the collapse. The domain-derived shape drives, and levelling
only overrides when a column lags by more than `LEVEL_EPS`. Swept:

| `LEVEL_EPS` | shape distribution | distinct | final column spread |
|---|---|---|---|
| 60 | 1.91:41 1.6:2 1.33:1 0.8:1 | 4 | 228px |
| 150 | 1.91:23 1.6:9 1.33:7 1.0:1 0.8:5 | 5 | 455px |
| 250 | 1.91:9 1.6:17 1.33:8 1.0:3 0.8:8 | 5 | 420px |
| **400** | **1.91:6 1.6:16 1.33:11 1.0:3 0.8:9** | **5** | **272px** |
| ∞ (domain only) | 1.91:7 1.6:14 1.33:9 1.0:4 0.8:11 | 5 | 368px |

**400px — about one tall card — uses all five shapes and holds the tightest
column spread of any non-degenerate setting.** Note that pure domain-derived
shape (∞) balances *better* than 150 or 250; levelling only helps once it is
reserved for genuinely lagging columns.

Final 45-card assignment: **1.6:15 · 1.33:10 · 0.8:9 · 1.91:7 · 1.0:4.**

### Determinism, and one caveat you should weigh

Composition, palette and hue are pure functions of the domain string, so they are
stable across launches — no reshuffling, no unstable-sort regression, and the
harness's byte-exact capture stays possible.

**Shape is not purely domain-derived.** Under `LEVEL_EPS = 400` most cards take
their domain shape, but a lagging column can override it — and that override
depends on position, so **inserting a card above can change a later placeholder's
shape.** Masonry already moves cards on insertion, but a shape change is a louder
visual event than a position change. If you want shape to be immune to
insertion, set `LEVEL_EPS = ∞`: it costs 96px of column spread (272 → 368) and
nothing else.

---

## Suggested next steps

1. **Decide whether reframing is worth shipping at all**, given 2 of 21 in a real
   screenful. The contact sheets from phase 2 show the crops are good; this mock
   shows they are rare.
2. **Pick the margin from the knee**, if you do ship it — 6–8% is where the count
   moves fastest, and 8% is where `jesseddy` resolves.
3. **The placeholders are the bigger visual win** and are independent of
   reframing: 45 cards is nearly twice the 25 that reframing touches, and they
   currently all render at one identical constant shape.
4. **Judge 0.8 from the phase 2 sheets**, not from this grid mock — it does not
   appear in the real slice.

## Anything missed / caveats

- **The mock renders with `sans-serif`, not Instrument Sans.** Meta-row text
  metrics will differ slightly from the app. Layout geometry is exact; only the
  glyphs are approximate.
- **Grain is rendered by sharp's SVG rasteriser, not by Chromium.** `feTurbulence`
  output is implementation-defined, so the app's grain will differ in detail from
  these images. It will be present, but not pixel-identical — which also means it
  would need checking against the harness's byte-exact capture before shipping.
- **`mix-blend-mode` in the grain layer is not honoured by every SVG rasteriser.**
  It rendered here; in the app it would go through CSS instead, where it is
  reliable. Flagging it because the two paths are not the same code.
- **No hover, focus or loading states were designed** for the placeholders.
- **The adjacency rule was only exercised on two layouts** — the 45-card sheet and
  a 30-card mixed grid. Wider columns or a different card order will produce
  different adjacency sets, and the one-pass nudge is not proven to converge in
  every arrangement (it is capped at 8 attempts and never hit the cap here).
- **Colour-blindness and contrast were not evaluated.** The placeholders carry no
  text, so contrast is not a legibility issue, but hue-family adjacency as a
  *distinguishing* device assumes normal colour vision.
- **The 21 usable favicons were not checked for hue collision with the volt
  accent** (`#ccff00`, hue ~74°). A placeholder seeded near that hue could read as
  a UI accent rather than as content.
