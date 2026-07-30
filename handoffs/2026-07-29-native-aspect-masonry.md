# Native-aspect masonry: CARD_ASPECTS deleted, letterbox removed, clamp at 1.5×

**Date:** 2026-07-29
**Branch:** `main`
**Commit:** `ef4f948` — *Give cards their image's real proportions, clamped only at the tall end*
**Repackaged:** `desktop/dist/staaash-1.0.0-arm64.dmg`, 2026-07-30 09:01,
120,436,103 bytes. Verified by extracting `app.asar`: 13/13 checks — the schema
columns, AVIF parsing, provenance recovery and the convergence sentinel in the
main bundle; `CARD_ASPECTS` absent, the 1.5× clamp present, and `is-contain` /
`card-img-backdrop` / `blur(26px)` all absent from the renderer CSS.

Four phases as specified; phase 1 reported first and the clamp chosen from its
numbers. Mike's decision was on the mechanism rather than the number: *"I dont
like the letterbox, so whatever makes that go away is my choice."*

---

## Phase 1 — measurement (read-only, on a copy)

The real library was read from a **copy** of `staaash.db` plus its live WAL, with
images read in place. Nothing was written.

**Four premises in the original plan were already out of date**, which is why
phase 1 existed:

| plan said | actual |
|---|---|
| 235 bookmarks | **293** total, 285 in the Everything filter; 244 have an `image_path`. 235 is the *fixture* |
| add `img_w`, `img_h` | `image_w`/`image_h` already existed and were backfilled for 236 of 243 (`64381e2`) |
| delete `CARD_ASPECTS` and `cardAspect()` | `cardAspect()` already read natural dimensions; the buckets were only the no-dimensions fallback, reached by 7 rows |
| remove the brute-forced id search | already removed in `64381e2` |

`_cardAspectDrift` and the skipped `.card-media` height assertion did both exist
as described.

### Aspect distribution (n=243, sharp, EXIF orientation honoured)

min **0.5625** · median **1.9048** · max **2.0270** · mean 1.8279

```
 0.50–0.57     5   2.1%
 0.77–0.90     1   0.4%
 0.90–1.10     8   3.3%   square-ish
 1.10–1.40     2   0.8%
 1.40–1.70     6   2.5%
 1.70–1.80    11   4.5%   ≈1.78 (16:9)
 1.80–1.95   201  82.7%   ≈1.905 (og:image standard)
 1.95–2.20     9   3.7%
```

**171 of 243 (70.4%) are exactly 1.905** — 1200×630 and its 2× variants. The
histogram is **empty between 0.564 and 0.769**.

### Why the clamp choice was almost free

Because of that gap, every candidate clamps the *same five images* (all
Instagram, ~361×640). Crop fraction is `1 − K × aspect`, which is independent of
column width, so this holds at any window size:

| clamp | clamped | median crop | worst crop |
|---|---|---|---|
| 1.30× | 5 (2.1%) | 26.7% | 26.9% |
| 1.40× | 5 | 21.0% | 21.3% |
| **1.50×** | **5** | **15.4%** | **15.6%** |
| 1.75× | 5 | 1.3% | 1.6% |

The deciding factor was the letterbox, not the crop. `shouldContain` fired when a
card's shape differed from its image's by more than −10%/+25%. With
`shape = max(1/K, natural)`: **5 cards still letterboxed at 1.3× and 1.4×, 0 at
1.5× and above.** So 1.5× is where the mechanism becomes unreachable rather than
merely idle — below it, letterboxing and focal-cropping would collide on the same
five cards and something would have to arbitrate.

### Provenance — not inferable, must be recorded

Classified by recomputing both of `extract.js`'s cache-naming schemes:

| test | n | meaning |
|---|---|---|
| stem == `sha256(image_url)` | **236** | og:image |
| stem == `sha256(url + ':screenshot')` | **0** | PageSpeed screenshot |
| neither | **7** | legacy-migrated, provenance destroyed |

Two findings killed the cheap heuristic:

- **Zero screenshots exist.** The class the focal rule was designed around is
  empty, so "top-anchor for screenshots" had nothing to act on and its hash test
  is unvalidated by real data.
- **`image_url IS NULL` mislabels all 7 legacy rows as screenshots.** They are
  Instagram og:images whose `image_url` was an internal `/api/cached/<hash>`
  reference that `migrate.js:108` nulls out — and those 7 include **all 5 clamp
  candidates**. The heuristic would have top-anchored exactly the portrait photos
  that should stay centred.

### Also surfaced

- **5 previews are AVIF served with a `.jpg` name** (`ftypavif`) — invisible to
  `imageSize.js`, which has no AVIF branch.
- **`kerem.co`'s preview is a 114-byte HTML error page** saved as `.jpg`;
  `cacheImage` never validated the response body.
- Stored dimensions disagreed with measured on **0 of 236**.
- The sweep had converged correctly: the 2 further unmeasured rows are
  soft-deleted, which it rightly skips.

---

## Phase 2 — schema and backfill

- **`preview_source TEXT`** and **`focal_y REAL`** added idempotently via the
  existing `PRAGMA table_info` guard; both added to `UPDATABLE` and to the insert
  path. `image_w`/`image_h` reused rather than duplicated.
- **`preview_source` has four states, not three:** `'og'`, `'screenshot'`,
  `'unknown'` (examined, unrecoverable) and `null` (not examined). That
  distinction is what lets the sweep converge instead of re-checking the same rows
  every launch.
- **`extract.js` now returns `preview_source`** from whichever branch produced the
  preview. It always knew; it just discarded the information.
- **`previewFacts()`** computes size + source + focal at save time, so a new card
  has its shape before it first renders.
- **`recoverPreviewSource()`** backfills from the cache filename.
- **`imageSize.js` parses AVIF/HEIC** via the ISOBMFF `ispe` box. Validated
  against sharp on **all 558 cached files: 558 agree, 0 disagree, 0 missed.**

### Verified on real data, in Electron, on a copy

| pass | scanned | measured | sourced | state |
|---|---|---|---|---|
| 1 | 242 | **5** | 242 | 241 with dims, 235 og, 0 screenshot, 2 unknown-and-deleted |
| 2 | 1 | 0 | 0 | unchanged |
| 3 | 1 | 0 | 0 | unchanged |

Idempotent, and **convergent**: 242 → 1. The residual 1 is the HTML-as-`.jpg`
row, retried on purpose in case the file is ever replaced. The 5 newly measured
are the AVIF files. All 5 clamped cards land on `focal_y = 0.5` (centre).

---

## Phase 3 — layout

- **Deleted:** `CARD_ASPECTS`, `hashedAspect()`, `cardAspect()`, `shouldContain()`,
  `CARD_ASPECT_MIN`, `CARD_ASPECT_MAX`, `.card-img.is-contain`,
  `.card-img-backdrop`, and the `onLoad` natural-aspect measurement (which was
  itself a reflow source and is exactly what the spec forbids).
- **Added:** `MAX_CARD_TALLNESS = 1.5`, `cardShape(b)`, `isCropped(b)`,
  `focalPosition(b)`.
- Height comes from the record before any image loads, so there is no reflow.
- `object-position` is set **only on clamped cards** and only vertically —
  columns are uniform width, so a card's width is always its column's.

### A defect the unit pass caught before it shipped

`Number(null)` is `0`, and `0` is a legitimate focal value (top). So a row with
`focal_y` null took the top anchor instead of falling through to the
source-derived default — and **`focal_y` is null on every row until the sweep
runs**, so this would have top-anchored the entire library on first launch. Fixed
by rejecting null before the numeric check. 11/11 focal cases pass now, including
"explicit 0 is kept" and "out-of-range falls back".

### The clamped path was verified in the app, not just in unit tests

The fixture cannot produce a clamped card (both design ratios clear 1.5), so two
tall rows were seeded into a throwaway fixture:

| card | stored | rendered | tallness | object-position |
|---|---|---|---|---|
| screenshot | 361×640 | 365.33×547.99 | **1.500** | **`50% 0%`** |
| og:image | 361×640 | 365.33×547.99 | **1.500** | **`50% 50%`** |

Zero backdrops, zero `.is-contain`. Fixture restored by re-seeding afterwards.

---

## Phase 4 — harness

- **Fixture re-seeded.** It now also seeds `preview_source`/`focal_y`, for the same
  reason it seeds dimensions: the sweep selects rows missing them, and a sweep
  that writes to the fixture on run 1 makes run 1 differ from run 2.
- **`STABILISE_CSS`'s `filter: none` workaround removed** — `.card-img-backdrop`
  no longer exists, so the flake's cause is gone from the app rather than
  suppressed at capture time.
- **`.card-media` height asserted** (Figma 195, app 195.17) with a `_requires`:
  a card's height is content-determined in general, and this is assertable only
  because the fixture seeds the design's own ratios. Same exception shape as
  `.sb-more`'s.
- **`_cardAspectDrift` resolved**, with the attribution corrected — see below.
- README gains a "Card shape" section and a note that the blur workaround is gone.

### Final state

| screen | captures | styles | clipping | tokens |
|---|---|---|---|---|
| `everything` | 2/2 identical | all match (11 selectors) | no text clipped | 9/9 |
| `settings` | 2/2 identical | all match | no text clipped | 9/9 |
| `drawer-open` | 2/2 identical | 2 known¹ | no text clipped | 9/9 |

**Four consecutive clean calibrations across all three screens** (12
screen-pairs), including the `settings` scrim that had been failing 3-in-10.

Delta unchanged at **1.07%**. That is the expected result, not a null result — no
card above the fold changed shape, because `64381e2` had already switched the
fixture to natural aspects.

¹ `.card-media` `outline-width`/`outline-color` — the borrowed-spec focus ring,
closed in "Accepted, not fixing".

---

## Correction worth carrying forward

**I initially attributed the resolved card drift to this change. It was
`64381e2`.** Card 1 was already 365.33×195.17 before today's work; the spec's
skip reason ("not one of the app's `CARD_ASPECTS` buckets") had been stale for one
commit. This change deleted the now-dead fallback and replaced the `[0.7, 2.1]`
range with a tall-end-only clamp — which changed **no card in the fixture**. The
spec note and the commit message both say so; the identical 1.07% delta is what
exposed it.

## Suggested next steps

1. **Launch it.** Done and verified as packaged. First launch runs the additive
   migration plus a one-pass backfill of 242 rows (5 image reads, the rest
   filename hashing), then converges to 1 target per launch. The app is unsigned
   (`identity: null`), so it needs the Gatekeeper override.
2. **49 cards have no preview at all** (293 − 244) and now all render at the same
   1.905 shape, where the hash used to give them variety. They already look
   uniform — each shows a placeholder letter tile — so this is arguably more
   honest, but it is a visible change to 49 cards and it was a judgement call I
   made rather than one Mike asked for. Worth a look in the real app.
3. **Card 4's accumulation assertion** is the one worth adding and needs a fresh
   `get_metadata` on 5181:230's fourth child. Deferred because the Figma MCP
   server needs re-authorising in this session.
4. **`cacheImage` does not validate response bodies** — that is how a 114-byte
   HTML error page became a `.jpg`. A magic-byte check at download time would stop
   the class.
5. **`focal_y` is a constant per `preview_source` today.** The column exists so a
   real focal detector (face/saliency) can overwrite single rows without touching
   the renderer; nothing consumes it beyond the two defaults yet.
6. **The screenshot path is unexercised by real data** — 0 rows. Its focal
   behaviour is verified only by the seeded fixture card and the unit pass, not by
   anything the app has actually produced.

## Files touched

| File | Change |
|---|---|
| `desktop/src/main/db.js` | `preview_source`, `focal_y` columns; insert path; `UPDATABLE` |
| `desktop/src/main/extract.js` | returns `preview_source` from the branch that produced the preview |
| `desktop/src/main/imageSize.js` | AVIF/HEIC via the `ispe` box |
| `desktop/src/main/ipc.js` | `previewFacts()`, `recoverPreviewSource()`, converging backfill sweep, save path, `images:ensure` |
| `desktop/src/renderer/src/lib/format.js` | `CARD_ASPECTS`/`cardAspect`/`shouldContain` out; `cardShape`/`isCropped`/`focalPosition`/`MAX_CARD_TALLNESS` in |
| `desktop/src/renderer/src/components/Gallery.jsx` | shape from the record, focal object-position, backdrop and onLoad removed |
| `desktop/src/renderer/src/styles.css` | `.is-contain` and `.card-img-backdrop` deleted |
| `tools/visual-diff/lib.mjs` | `filter: none` workaround removed |
| `tools/visual-diff/seed-app/main.mjs` | seeds `preview_source`/`focal_y`; stale comments |
| `tools/visual-diff/fixtures/figma-mock/fixture.mjs` | stale `cardAspect`/`COLLECTIONS_VISIBLE` comments |
| `visual-diff/figma/everything.styles.json` | height assertion + `_requires`; drift resolved; `_notAssertable` updated |
| `tools/visual-diff/README.md` | "Card shape" section; workaround removal; calibration result |
