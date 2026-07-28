# Handoff — reading Figma layer properties directly; computed-style audit

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks` (local only)

Follows [`2026-07-28-colour-checks-and-new-screens.md`](2026-07-28-colour-checks-and-new-screens.md).

---

## What was completed

**1. Started reading layer properties out of Figma instead of asking for them.**
`get_design_context` returns actual style properties — fills, borders, radii,
shadows, type — not just the geometry `get_metadata` gives. I had not been using
it (it requires loading the `figma-design-to-code` skill first), which is why the
sidebar spec had to be supplied by hand. It doesn't.

**2. New check: computed style vs Figma layer properties.** Committed to
`visual-diff/figma/<screen>.styles.json` and diffed against `getComputedStyle` +
`getBoundingClientRect` on every run. Colours compare channel-for-channel
including alpha, lengths as normalised strings, rects to within half a pixel.

**3. Corrected the settings/drawer framing.** They are **not designed in Figma
yet** — so a pixel delta is impossible by definition, not pending a node-id
lookup. The previous handoff called this "the blocker: no Figma node ids", which
was wrong.

---

## Findings

### The ask bar is a geometry bug, not a colour bug

Every colour property matches Figma exactly:

| Property | Figma | App | |
|---|---|---|---|
| `background-color` | `rgba(32, 30, 30, 0.92)` | same | ✓ |
| `border-radius` | `16px` | same | ✓ |
| `box-shadow` | `0 4px 8px rgba(3,3,3,0.2)` | same | ✓ |
| border colour | `rgba(250, 255, 230, 0.04)` | `--border-faint`, same | ✓ |

The **box** does not:

```
✗ .ask       height  figma 48px   app 46px
✗ .ask-chip  width   figma 101px  app 102.73px
✗ .ask-chip  height  figma 24px   app 26px
```

Figma places the search frame at `y=728` height `48`; the app renders `y=730`
height `46`.

**This explains the ask-bar colour drift** reported in the previous handoff
(`#1d1c1c → #1f1e1e`, Δ2 across ~98% of flat samples). The fill is translucent
at 92%, so a 2px-shorter, 2px-lower box composites over *different backdrop
content* — the colour reads as drifted because the geometry moved, not because
any colour value is wrong. The earlier framing ("the ask bar fill is 2 levels
lighter") was a misdiagnosis.

### The gallery Δ3 was mis-classified

Bare canvas samples exactly `#080808` in **both** images at four sampled points.
The `#0b0b0b → #080808` Δ3 finding is a *structural* difference (different
content at that point) that slipped under `DRIFT_MAX = 8` and got labelled drift.

**Known limitation:** the drift/structural split is magnitude-based, so it
cannot distinguish "same element, wrong colour" from "different element, similar
colour". Small-Δ structural differences will keep being mislabelled. Treat a
drift finding as a lead, not a verdict — confirm it against the style audit.

### Sidebar — unchanged, still the one real token bug

`#F6F3F3` @1% over `#080808` → `#0a0a0a`; app hardcodes `#0a0a09`. Still the only
mismatched token. Fix not applied (no app code changes).

---

## Current state

| Screen | Delta | Captures | Tokens | Styles |
|---|---|---|---|---|
| `everything` | 2.238% | 2/2 identical | 1 mismatched | 3 mismatched |
| `settings` | not designed | 2/2 identical | 1 mismatched | 3 mismatched |
| `drawer-open` | not designed | 2/2 identical | 1 mismatched | 3 mismatched |

The token and style findings repeat across screens because the sidebar and ask
bar are present on all three — the same two bugs seen three times, not six bugs.

---

## Suggested next steps

1. **Fix the two confirmed bugs** (one line each, both in `styles.css`):
   - `--sidebar`: `rgba(246, 243, 243, 0.01)` layered over the canvas, rather
     than the hand-flattened `#0a0a09`.
   - `.ask`: height 48 not 46, and the chip 24 not 26. The app's `padding: 9px
     12px` plus `max-height: 48px` is what shortens it.
2. **Extend `everything.styles.json`.** Only `.ask` and `.ask-chip` are covered.
   Every selector added is a permanent regression check — the sidebar, topbar
   controls and card chrome are all worth pulling in via `get_design_context`.
3. **Consider generating the styles file** rather than hand-maintaining it. A
   script that walks the config's selectors, maps them to Figma node ids and
   calls `get_design_context` would remove the manual step — but the mapping
   from CSS selector to Figma node is a judgement call and should stay explicit.
4. **Design the settings and drawer frames** if pixel parity matters for them.
   Until then those screens are calibration + token/style audit only.

---

## Anything missed / deliberately not done

- **No app code changed.** Both confirmed bugs are reported, not fixed.
- **`.ask` padding is deliberately not asserted.** `get_design_context`'s
  generated Tailwind says `py-[14px]`; `get_metadata` places the chip 12px from
  the frame top. They cannot both be right, so the property is omitted with a
  note in the JSON rather than guessing between them and manufacturing a finding.
- **`settings`/`drawer-open` borrow `everything.styles.json`.** Correct for the
  ask bar (same element on every screen), but if those screens ever get their own
  designs with different specs, they need their own files.
- **Only two selectors are covered** by the style audit. Everything else in the
  UI is unchecked at the property level.
- **The sidebar spec came from Mike, not from Figma.** I verified the arithmetic
  and it matches the render exactly, but I did not re-read it out of
  `get_design_context` — the sidebar container is a large subtree and the answer
  was already confirmed by the pixels.
