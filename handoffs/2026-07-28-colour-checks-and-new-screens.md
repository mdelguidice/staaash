# Handoff — exact colour checks, fail-closed precheck, double capture, new screens

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks` (local only)

Follows on from [`2026-07-28-keychain-dialog-fix.md`](2026-07-28-keychain-dialog-fix.md).
Harness docs: [`tools/visual-diff/README.md`](../tools/visual-diff/README.md).

---

## What was completed

**1. Exact colour check, independent of pixelmatch.** For each region the
harness walks a grid, keeps points whose 5×5 neighbourhood is one uniform colour
in *both* images (flat interior, no text or edges), and reports the exact RGB
delta. Split by magnitude: **drift** (Δ ≤ 8, a real colour difference the pixel
delta cannot see) vs **structural** (Δ > 8, different content at that point,
already covered by the pixel delta).

**2. Token audit.** Computed `:root` custom properties compared exactly against
the Figma variables for node 5181-38, plus computed styles for every
`RECT_SELECTORS` element. Reported regardless of pixel impact.

**3. Fail-closed fixture precheck.** Moved off the `sqlite3` CLI into the
Electron shim, using the app's own `better-sqlite3`. Any failure — missing DB,
unreadable file, module not loadable, flag absent — refuses the launch.

**4. Double capture by default.** Every screen is captured in two independent
launches. If they disagree the harness refuses to report that screen's delta,
records it, continues with the other screens, and exits non-zero.

**5. Two new screens** mapped: `settings` and `drawer-open`.

**6. Corrected the "dead hypothesis" note** to *untested — confounded by the
dialog*, in all three docs.

---

## Results

### Ranked deltas

| # | Screen | Pixel delta | Captures | Calibration |
|---|---|---|---|---|
| 1 | `everything` | **2.238%** | 2/2 identical | clean |
| — | `settings` | *no reference* | 2/2 identical | 3/3 clean |
| — | `drawer-open` | *no reference* | 2/2 identical | 3/3 clean |

Only `everything` can be ranked. See the blocker below.

`everything` by region: sidebar 3.44% · gallery 2.05% · topbar 1.81% · ask-bar 1.73%

### Colour drift — invisible to the pixel delta

The headline finding. All of these score **0.000%** in pixelmatch:

| Region | Figma → App | Δ | Samples | Note |
|---|---|---|---|---|
| sidebar | `#0a0a0a` → `#0a0a09` | 1 | 42,230 | only 783 of 44,281 flat samples match |
| ask-bar | `#1d1c1c` → `#1f1e1e` | 2 | 4,029 | only 88 of 4,424 match |
| gallery | `#0b0b0b` → `#080808` | 3 | 385 | |
| topbar | `#171616` → `#161515` | 1 | 340 | |
| topbar | `#1b2107` → `#1c2107` | 1 | 258 | volt-tinted "New" fill |

The sidebar and ask-bar are near-total: **~95% and ~98% of their flat interior
samples are the wrong colour**, and the pixel delta reports none of it.

### Token audit

**7/7 mapped tokens exact.** `--canvas`/`--text`/`--muted`/`--volt`/
`--volt-deep`/`--ink-on-volt`/`--ink-on-volt-badge` all match their Figma
variables byte for byte.

Two painted colours match no Figma token:
- `#0a0a09` on `.sb` background — the app's `--sidebar`, hand-picked ("ink + 1%
  warm white"), with no Figma variable behind it.
- `#201e1e` on `.ask` background.

**This is the interesting part:** every *mapped* token is correct, yet the
sidebar still renders a different colour from the design. The drift lives in
values that were never tokenised — so a token audit alone would have passed, and
a pixel diff alone would have passed. It took both checks to find it.

---

## Steps taken

1. Pulled Figma variables via MCP `get_variable_defs` for 5181-38; committed to
   `visual-diff/figma/everything.variables.json` (the MCP is not available to the
   harness at runtime, so the values have to be a checked-in artifact).
2. Built `sampleFlatColors()` in `lib.mjs` — uniform-neighbourhood detection in
   both images, tallied by colour pair.
3. Built `collectStyles()` + `auditTokens()` in `index.mjs`.
4. Moved the precheck into `electron-shim/main.mjs`; the shim writes a verdict
   file, the harness translates a refused launch into that verdict rather than a
   stack trace.
5. Rewrote diff mode for double capture, null-node handling, and the new checks.
6. **Measured** the new screens' regions with `--rects` — I had first written
   guessed rectangles and labelled them "measured"; the real settings modal is
   `480,175 480×443` against my guess of `464,128 512×536`. Caught and corrected
   before running anything.
7. Verified fail-closed two ways (flag deleted; DB deleted) — both refuse.
8. Calibrated both new screens 3/3 clean.

### Bug found in my own check

The first token-audit run reported `#000000` as an untokenised colour on
`.topbar`, `.content`, `.masonry` and `.ask-wrap`. Those are
`background-color: rgba(0,0,0,0)` — transparent, not black. `normHex()` now
returns null for zero alpha. Without that fix the audit produced four false
positives on every screen.

---

## The blocker: no Figma node ids for the new screens

`settings` and `drawer-open` have `figmaNodeId: null`, so **no pixel delta can
be computed for them**.

The Figma MCP's `get_metadata` with no node id lists only one page for this file
— `0:1 👀 Cover` — which does not contain node 5181-38. There is no way from
here to enumerate sibling frames, and guessing a node id would silently produce a
confidently wrong reference.

Node 5181-38 is named `1000 -> Staaash -> Default`, which suggests siblings like
`1001 -> Staaash -> Settings`. **To finish this, someone needs to paste the two
node ids** (or the Figma URLs) into `visual-diff.config.mjs`. Everything else for
those screens already works: routes, calibration, colour check, token audit.

---

## Suggested next steps

1. **Supply the two node ids** and re-run — that alone completes the ranking.
2. **Decide on the sidebar colour.** `#0a0a0a` (design) vs `#0a0a09` (app). One
   is wrong; the app's value has no Figma token behind it, which is probably the
   root problem. Same question for `.ask` `#201e1e` and the ask-bar Δ2.
3. **Tokenise the untokenised.** If `--sidebar` and the ask-bar fill became real
   Figma variables, the audit would catch future drift automatically.
4. **Extend `tokenMap`.** Only 7 pairs are mapped. Unmapped app vars and unused
   Figma tokens are both reported, so the gaps are visible in `report.json`.
5. **Re-run the column-width sweep** if that question ever matters — it is
   untested, not disproven (see the corrected note).

---

## Anything missed / deliberately not done

- **No app code changed.** `git status --porcelain desktop/` empty.
- **Mutation mode still captures once**, not twice. The double-capture rule was
  applied to the run that writes `report.json`; applying it to a sweep would
  double an already long run. `--calibrate` covers the reproducibility question.
- **`settings`/`drawer-open` have no reference PNG**, so their `colourCheck` is
  empty — the check needs two images. Only the token audit and calibration run.
- **Variables are borrowed** for the two new screens (`borrowed: true` in the
  report). Figma variables are file-wide so this is reasonable, but if those
  frames use different tokens the audit will not know.
- **`DRIFT_MAX = 8`** is a judgement call — it sits well below pixelmatch's
  ~26.4 floor so everything classified as "drift" is genuinely invisible to the
  pixel delta, but it is not derived from anything.
- The `everything` colour check reports drift only where flat regions exist;
  gradient-heavy areas contribute few samples and are effectively unchecked.
