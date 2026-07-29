# Handoff — flake experiment, audit stability under the flake, META_H

**Date:** 2026-07-28 · **Repo:** `/Users/mike/staaash` · **Branch:** `design-tweaks`

Follows [`2026-07-28-list-assertions-colour-typegate-anchored-edges.md`](2026-07-28-list-assertions-colour-typegate-anchored-edges.md).

Four tasks. All done and committed. The `content-visibility` hypothesis was
**wrong** — ruled out with 40 runs. The `META_H` fix made the card-8 residual
**larger**, which is the correct outcome and is explained below, and it also
exposed a visual regression that needs a paired fix.

---

## 1. `content-visibility: auto` is ruled out

20 calibrations per arm, arms **alternating run-by-run** so any drift in machine
state hits both equally. Each iteration patched `Gallery.jsx`, rebuilt, and ran
`--calibrate --screen=everything`.

| Arm | Disagreements | Rate | Constant |
|---|---|---|---|
| baseline — `contentVisibility: 'auto'` | 4/19 | 21% | 605,635 px |
| treatment — `contentVisibility: 'visible'` | 5/19 | 26% | 606,052 px |

One run per arm errored (the harness produced neither verdict string) and is
excluded from both denominators — worth a look if it recurs, but it did not
favour either arm.

**Disabling it did not reduce the flake.** The treatment rate is nominally
*higher*, and the treatment arm is still **bimodal on its own single constant**
— a different one (606,052) only because more cards render when nothing is
skipped. Two stable states, either way.

### What the evidence now points at

`.card-img-backdrop`'s `filter: blur(26px) saturate(1.15) brightness(0.55)`.
Supporting facts, in order of strength:

1. **The constant tracks card positions.** It was 605,635 with `META_H = 24`,
   and became 600,880 the moment `META_H` became 28 and the cards shifted 8px.
   Whatever differs is drawn where the cards are.
2. Differences begin at css x ≥ 240 and concentrate in css y 120–480; 73% are
   Δ1–2, max Δ108 — large areas differing by imperceptible amounts, which is
   what a resampled/retiled blur looks like.
3. Cropping both frames at the busiest region shows identical content in
   identical positions.

**Ruled out so far:** the sidebar work (reverting `styles.css` to HEAD
reproduced the same constant), `content-visibility` (this experiment),
`--num-raster-threads=1` (1/5) and `--disable-checker-imaging` (2/6) against a
4/8 baseline. None shipped.

**Suggested next arm:** neutralise the blur itself —
`--mutate=.card-img-backdrop:filter:none`, 20 runs. If the flake vanishes, it is
the blur, and the fix is a harness-side stabilise rule rather than an app change.

---

## 2. Is the audit affected by the flake? Style no, leads yes

Six `--single-capture` runs, hashing the capture each time to identify which
render state the run landed in. They landed in **exactly two states**, which is
independent confirmation of bimodality.

| | State A (runs 1, 2, 5, 6) | State B (runs 3, 4) |
|---|---|---|
| style findings | 4 — hash `7c45ac1bb1` | 4 — hash **`7c45ac1bb1`** |
| colour findings | 0 | 0 |
| colour **leads** | **54** — hash `4953d9453b` | **51** — hash `a49e396f8a` |
| pixel delta | **2.022%** | **2.109%** |

**The style audit is immune.** Identical findings, identical hash, in both
states — it reads the DOM, and the DOM is not what varies.

**The leads and the delta are not.** Both are deterministic *within* a state and
differ *between* states. So when captures disagree, what is invalidated is the
pixel delta and the colour leads — not the style findings.

Practical consequence: **the style audit can be trusted even on a run whose
captures disagreed.** That is worth wiring in — the harness currently withholds
the whole screen's result on disagreement, including findings that are provably
unaffected. Not changed here; it was not in scope.

---

## 3. `META_H` 24 → 28 — the residual got bigger, and that is correct

```js
const META_H = 28  // was 24
```

Figma's card is thumbnail + 4px gap + 24px meta row (5181:232 — Thumbnail 195,
Container at y=199 h=24, card total 223), so the reserved amount is 28.

**Card 8 residual: 17.58px → 25.58px.**

| | Figma | App | Δ |
|---|---|---|---|
| Card 1 media | 195 | 205.23 | **+10.23** |
| Card 4 media (col-1, 2nd) | 350 | 365.33 | **+15.33** |
| | | | **+25.56** |

Measured card 8 y = 740.58 against Figma's 715 → **+25.58**. That matches the
sum of the two media errors to within 0.02px.

**Why it grew:** at `META_H = 24` the app was reserving 4px *less* than Figma per
card, which was cancelling part of the media-height error — two cards' worth,
exactly 8px. The old 17.58 was two bugs partially hiding each other. **The
residual is now clean: it is entirely `CARD_ASPECTS`, nothing else.**

That is the number to work from. No proposal about `CARD_ASPECTS` here, as
asked — only the observation that 25.58px is now attributable to it alone, and
that the design's two thumbnail proportions are 365/195 = 1.872 and
365/350 = 1.043, against buckets of 1.78 and 1.0.

### Regression this exposed — needs a paired fix

`.card-meta` **paints 19px** (4px `padding-top` + a 15px line box) while the
masonry now reserves 28. Figma paints 24.

| | Painted card gap |
|---|---|
| Figma | 12 |
| App, `META_H = 24` | 17 |
| App, `META_H = 28` | **21** |

So the pitch *model* is now right and the *visible* gap is 4px worse. Both were
already wrong; they cannot be fixed independently. The paired change is to make
`.card-meta` 24px of content tall (its `font-size: 10px` inherits the root 1.5
line-height, giving 15). **Not applied — it was not in scope, and it is a visual
change that deserves its own look.**

Three distinct card errors now separated:

1. **media height** — `CARD_ASPECTS` has no bucket near 1.87 or 1.04 → +25.58 accumulated
2. **reserved `META_H`** — was 24, should be 28 → **fixed**
3. **painted `.card-meta`** — 19, should be 24 → **open**, and #2 without #3 widens the gap

---

## 4. Committed

One commit on `design-tweaks` — "Fix sidebar rhythm and card pitch; make audit
assertions accumulation-aware" — carrying everything from this task and the
previous one, including both earlier handoff documents.

### Final state

```
everything    2/2 identical   tokens 9/9   styles 4   colour 0 findings / 54 leads
settings      2/2 identical   tokens 9/9   styles 4
drawer-open   2/2 identical   tokens 9/9   styles 6
```

Remaining findings on `everything`:

| Selector | Property | Figma | App | Note |
|---|---|---|---|---|
| `.sb-more` | y | 508 | 552 | `COLLECTIONS_VISIBLE` is 6 vs the design's 5 |
| `.masonry-item:nth-child(8) .card-media` | y | 715 | 740.58 | now purely `CARD_ASPECTS` |
| `.seg` | y | 19 | 18 | pre-existing, untouched |
| `.seg` | right | 1314 | 1313.44 | `.btn-new` glyph width, see previous handoff |

The pixel delta rose 2.02% → **3.52%** because the cards moved 8px down. Another
instance of the delta moving against correctness — which is why it lives under
`debug`.

---

## Suggested next steps

1. **Next flake arm: neutralise `filter: blur(26px)`** on `.card-img-backdrop`
   and run 20 calibrations. Strongest remaining hypothesis.
2. **Pair the `META_H` fix with `.card-meta` at 24px content height** — until
   then the card gap is 21px against the design's 12.
3. **`CARD_ASPECTS`** — the whole 25.58px is now attributable to it.
4. **Let the harness report style findings even when captures disagree.** Proven
   safe in §2; currently the entire screen is withheld.
5. **Decide `COLLECTIONS_VISIBLE`** — 6 in code, 5 in the design.

---

## Anything missed / deliberately not done

- **The ask-bar drift is still a lead and was not diagnosed**, as instructed.
- **The flake is not fixed** — one more hypothesis eliminated, with numbers.
- **`.card-meta` height not changed**, so §3's gap regression is live.
- **The two errored experiment runs were not investigated.** One per arm, no
  captured stdout; the script discarded it. Worth logging output next time.
- **Light theme still untouched.**
