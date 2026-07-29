# Design parity: sidebar gaps closed, cards given their image's shape

**Date:** 2026-07-29
**Branch:** `design-parity`, fast-forward merged into `main`
**Commits:** `59bfbe9` (sidebar) and `64381e2` (card aspect)
**Repackaged:** `desktop/dist/staaash-1.0.0-arm64.dmg`, 15:34, 120,428,502 bytes

*Owed retroactively — the standing instruction is a handoff per completed task,
and these two commits shipped without one. Written after the fact from the commit
record and the measurements taken at the time. Superseded in part by
`2026-07-29-nav-label-descender-clipping-and-clip-audit.md`, which fixes a
regression `59bfbe9`'s predecessor introduced.*

---

## Why this work happened

I had reported "0 style findings" and marked the harness as maintenance mode.
Mike pushed back: *"I don't see the design parity of the Figma file reflected in
the latest build?"* He was right, and the claim was over-stated in a specific
way worth recording: **0 findings covered 9 selectors**, the pixel delta was
3.60%, and "no findings" is not "matches the design" when the spec only asks
about 9 things. Marking maintenance mode at that point was premature.

He then asked whether there was any *reason* parity could not be reached. There
wasn't — the remaining gaps were all app decisions, not design ambiguities. He
approved doing the mechanical fixes first with assertions for each, then bringing
the card-aspect question back with options.

## `59bfbe9` — four sidebar fixes

Each measured against the Figma frame, not eyeballed.

| # | What was wrong | Fix |
|---|---|---|
| 1 | `COLLECTIONS_VISIBLE = 6` against the design's 5 (5181:89 draws five rows plus ••• More) — pushed More a row down and ran the sidebar 40px long below Library | → 5 |
| 2 | `savedCount` counted archived bookmarks, so the footer read **238** beside a sidebar saying Everything **235** | now uses the Everything filter (`!deleted_at && !archived_at`) |
| 3 | The Collections/Tags label is a 24-tall header frame sitting **2px** above its list (5181:78 → 5181:89), not the 22-tall row with an 8px gap the Library label needs — one padding cannot serve both | split via `.sb-label:has(button) { padding-bottom: 2px }`; More lands on **508** exactly |
| 4 | GridIcon was a 2×2 of squares where the design draws a panelled layout; ArchiveIcon was a lidded box where the design draws a tabbed folder | all five Library icons now carry Figma's own geometry, authored on its 16 grid rather than rescaled |

### Two icon findings that were nearly missed

- **Stroke weight was a red herring — until it wasn't.** My first attempt changed
  stroke weight and the delta barely moved. Pixel sampling then showed max **245**
  (Figma) vs **210** (app) — exactly `opacity: 0.85`. Both were real, but the
  opacity was the visible one. `.sb-row .sb-ico`'s `opacity: 0.85` and the
  `:hover { opacity: 1 }` rule were both removed; the row already has a hover
  background, so the icon had no affordance left to carry.
- **The base weight is 2.25, not 1.6.** Figma draws these at stroke **1.5 on a 16
  grid**, verified against two independent families (5181:44 Library icons,
  5181:78 Collections header). On the 24 grid that is 2.25. `GridIcon` is
  hand-authored at `strokeWidth={1.3333}` because Figma exports it as a flattened
  fill and its own stroke is inconsistent with its siblings.
- **My ink-coverage metric was inverted for the active row.** The volt pill is a
  *bright* background with *dark* ink, so counting light pixels made the
  "Everything −6.9%" reading meaningless. After switching to dark-pixel counting
  the gap read **−3.7%**, and all five icons landed within ~2%.

### Assertions added

- `.sb-more` `y: 508` — reinstated with a `_requires` invariant. I had previously
  withdrawn it as content-determined; that was my own misdiagnosis, since the row
  count before "More" is `COLLECTIONS_VISIBLE`, a design constant.
- `_numberMatches` on `.sb-status-text` → `.sb-row.is-active .sb-count`: the
  footer count and the sidebar count must agree. The design fixes *that they
  agree*; the content fixes *what the number is*, so the invariant is assertable
  where the literal value is not. Verified to fire by reintroducing the
  `savedCount` bug (235 vs 238).

## `64381e2` — cards take their image's aspect

The design draws thumbnails at their own proportions — 365×195 and 365×350, i.e.
**1.872** and **1.043** (5181:230) — while the app assigned each card a shape from
a hash of its bookmark id, out of a bucket list containing **neither ratio**. The
grid ran **25.58px** long by the third card in column 1, and no bucket could have
fixed it.

Mike chose this over the alternative (re-tune the bucket list): *"Let's go with 2,
I like that."*

- `cardAspect(bookmarkOrId)` now reads `image_w`/`image_h` when present, clamped
  to **[0.7, 2.1]** so one very tall preview cannot own a column. Outside that
  range the image letterboxes, which is what `shouldContain` already existed to
  handle. Cards with no preview, and previews not yet measured, keep the hashed
  shape — so an upgraded library converges rather than reflowing all at once.
- **Sizes have to be on the record, not read off the `<img>`:** the masonry places
  every card before any of them paint. So:
  - `desktop/src/main/imageSize.js` — new, zero-dependency header parser for PNG
    (IHDR), GIF (LE), WebP (VP8/VP8L/VP8X) and JPEG (SOF walk), reading the first
    64KB. No decoder dependency added to the main process.
  - `image_w` / `image_h` added additively in `migrateSchema()` via
    `PRAGMA table_info` + `ALTER TABLE`, and appended to `UPDATABLE`.
  - `images:size-sweep` IPC handler backfills any bookmark with an `image_path`
    but no dimensions, notifying `bookmarks:changed` **once** at the end rather
    than per row. Triggered from `App.jsx` 1200ms after mount.
- `META_H` 24 → **28** in `Gallery.jsx` (Figma's card is thumbnail + 4px gap +
  24px meta row), paired with `.card-meta { min-height: 28px }`. The `24` attempt
  only got the painted gap to 16, because `box-sizing: border-box` is global so 24
  *included* the 4px padding. At 28 the painted gap is **12.01** against Figma's
  12.

### Fixture problems this surfaced

Three, all of which would have made the change look like a no-op or a regression:

1. **The fixture was pinned to the old `CARD_ASPECTS` buckets** (images at
   1.780 / 1.000 / 0.849), so the natural-aspect change would have shown *no
   difference*. Fixed by seeding `image_w`/`image_h` at the design's two ratios
   before pass 1.
2. **The "doubled meta caption" in captures was a fixture artifact, not an app
   bug.** Crops taken at app-measured rects overshot into the design's own caption
   rows. Confirmed by cropping `fixture-fx-polar-1.png` directly, then resolved by
   re-seeding at the design's ratios.
3. **`images:size-sweep` would have written to the fixture DB on the first harness
   run**, making run 1 differ from run 2. Prevented by seeding the sizes; confirmed
   by a clean byte-exact calibration.

`seed-app/main.mjs`'s `idForAspect()` brute-force (up to 200,000 ids, and it
validated against the old bucket list) was replaced by `NOMINAL_W = 1000` +
`sizeForAspect(aspect)`; ids are now plain `fx-${slug}`.

## State at the time of the merge

`everything` and `settings` all matching (11 selectors, tokens 9/9),
`drawer-open` with 2 findings (borrowed-spec focus ring, already closed), all
three 2/2 identical, calibration clean, delta **1.22%**. `main` fast-forwarded to
`64381e2`; the `.dmg` was rebuilt and verified by extracting `app.asar` — all
three bundles byte-identical to the build the harness measured.

## Corrections made along the way

- **I mis-transcribed Figma's card-4 y as 335** when it is 90 + 235 = **325**. The
  app's 325.2 actually matched. Corrected immediately.
- **A stray 0-byte `index-DSaKHTio.css`** (an artifact of an asar extraction) was
  committed and removed with `git rm --cached` + amend.
- **`npm run dist` fails inside the sandbox** on an electron-builder network fetch
  (`The server aborted pending request`); it needs `dangerouslyDisableSandbox`.
- **`Cannot find module './tools/visual-diff/node_modules/sharp'`** recurs because
  the Bash cwd persists — after `cd desktop`, relative requires break. Always
  `cd /Users/mike/staaash` first.

## What was missed

- **A regression shipped in this work and was caught only when Mike reported it.**
  `.sb-row`'s `line-height: 1`, from the earlier token-parity pass `66cfbc0`, was
  clipping the descenders off every nav label. Fixed in `eeb4830` — see
  `2026-07-29-nav-label-descender-clipping-and-clip-audit.md`. The lesson worth
  keeping: the harness's 11/11 pass covered no invariant about a box clipping its
  own text, so a *typographic* defect was invisible to a *comparison-based*
  audit. That gap is now closed by `clipAudit`.
- **Two small gaps left deliberately**, both in the README's "Accepted, not
  fixing": the TAGS header control order (app renders **+ then chevron**, design
  has **chevron then +**), and the "More" row being dimmer than drawn.
- **The app is unsigned** (`identity: null`), so first launch needs the Gatekeeper
  override. First launch also runs the additive `image_w`/`image_h` migration plus
  the one-pass backfill.
