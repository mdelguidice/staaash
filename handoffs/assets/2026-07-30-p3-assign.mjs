/**
 * Assignment rules for gradient placeholders.
 *
 * Determinism: composition, palette and hue all derive from the domain string,
 * so they never change between launches. SHAPE is chosen to level the columns,
 * which is a function of position — deterministic for a fixed card order, but
 * see the caveat in the handoff: inserting a card above can change a later
 * card's shape, where a domain-derived shape would not.
 */
const OUT = '/private/tmp/claude-501/-Users-mike-staaash/fef7c9b1-8d0d-4fd9-be77-91c9cc421f0b/scratchpad'
const S = await import(`${OUT}/stable.mjs`)
const S_hash = S.hash
export const ASPECTS = [1.91, 1.6, 1.33, 1.0, 0.8]
const COL_W = 365.33, GAP_Y = 12, META_H = 28, COLS = 3
const HUE_FAMILY = 30      // hues closer than this read as the same family
const NUDGE = 48           // how far to push a colliding hue

const hueDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d) }

/**
 * Place cards, choosing each gradient card's shape to level the columns.
 * Image cards keep the aspect they were given.
 */
export function layoutWithShapes(cards) {
  const heights = new Array(COLS).fill(0)
  const topAspect = new Array(COLS).fill(null)   // aspect of the last card in each column
  const placed = []

  for (const c of cards) {
    let col = 0
    for (let i = 1; i < COLS; i++) if (heights[i] < heights[col] - 0.01) col = i

    let aspect = c.aspect
    if (c.gradient) {
      // Levelling means bringing this column UP TO the others, not adding the
      // least possible height. Minimising post-placement spread greedily is the
      // wrong objective: the chosen column is by definition the shortest, so the
      // smallest card always wins and every placeholder comes out 1.91 — the
      // uniformity this is meant to break. Target the other columns instead.
      const others = heights.filter((_, i) => i !== col)
      const target = others.length ? others.reduce((a, b) => a + b, 0) / others.length : heights[col]
      const desiredH = Math.max(0, target - heights[col] - GAP_Y)
      const spread = Math.max(...heights) - Math.min(...heights)

      // Levelling only carries information when the columns are actually
      // uneven. When they are level the target is "add nothing", which again
      // selects the shortest card and collapses every placeholder to 1.91. So
      // below LEVEL_EPS the domain-derived shape drives and levelling is silent.
      // 400px ~ one tall card. Swept: at 60 the loop above still wins and 41 of
      // 45 come out 1.91 (final column spread 228px); at 150 shapes vary but
      // spread grows to 455px; 400 uses all five shapes and holds spread to
      // 272px, the tightest of the non-degenerate settings.
      const LEVEL_EPS = 400
      const levelling = spread > LEVEL_EPS
      const domainShape = ASPECTS[S_hash(c.domain + ':shape') % ASPECTS.length]

      let best = null
      for (const A of ASPECTS) {
        const h = COL_W / A + META_H
        const miss = levelling
          ? Math.abs(h - desiredH)
          : (A === domainShape ? 0 : 120)      // domain preference, in px-equivalents
        // Tie-break toward the shape least like the card above and the current
        // tops of the neighbouring columns.
        const neighbours = [topAspect[col], topAspect[col - 1], topAspect[col + 1]].filter((x) => x != null)
        const unlike = neighbours.length
          ? Math.min(...neighbours.map((n) => Math.abs(Math.log(A / n))))
          : 1
        const score = miss - unlike * 18       // 18px of miss buys one unit of contrast
        if (!best || score < best.score - 1e-9) best = { A, score }
      }
      aspect = best.A
    }

    const mediaH = COL_W / aspect
    const h = mediaH + META_H
    placed.push({ ...c, aspect, x: col * (COL_W + 20), y: heights[col], mediaH, h, col })
    heights[col] = heights[col] + h + GAP_Y
    topAspect[col] = aspect
  }
  return placed
}

/**
 * Adjacency: same column immediately above/below, plus any card in a
 * neighbouring column overlapping vertically by more than half the shorter
 * card's height.
 */
export function adjacency(placed) {
  const adj = placed.map(() => new Set())
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j]
      if (Math.abs(a.col - b.col) > 1) continue
      if (a.col === b.col) {
        // immediate vertical neighbours: no third card between them
        const between = placed.some((c) => c.col === a.col && c.y > Math.min(a.y, b.y) && c.y < Math.max(a.y, b.y))
        if (!between) { adj[i].add(j); adj[j].add(i) }
      } else {
        const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        if (overlap > 0.5 * Math.min(a.h, b.h)) { adj[i].add(j); adj[j].add(i) }
      }
    }
  }
  return adj
}

/** Resolve colour collisions between adjacent gradient cards. */
export function resolveHues(placed) {
  const adj = adjacency(placed)
  const state = placed.map((c) => c.gradient
    ? { hue: S.palette(c.domain, c.seedHue ?? null).hue, nudge: 0, comp: null, collisions: 0 }
    : null)

  for (let i = 0; i < placed.length; i++) {
    if (!state[i]) continue
    let guard = 0
    while (guard++ < 8) {
      const clash = [...adj[i]].find((j) => j < i && state[j] &&
        hueDist(state[i].hue, state[j].hue) < HUE_FAMILY)
      if (clash === undefined) break
      const dir = (S.hash(placed[i].domain + ':dir') % 2) ? 1 : -1
      state[i].nudge += dir * NUDGE
      state[i].hue = S.palette(placed[i].domain, placed[i].seedHue ?? null, state[i].nudge).hue
      // A different composition too, so nudged neighbours differ in more than hue.
      state[i].comp = (S.hash(placed[i].domain + ':comp') + guard) % S.COMPOSITION_NAMES.length
      state[i].collisions++
    }
  }
  return placed.map((c, i) => state[i]
    ? { ...c, hueNudge: state[i].nudge, comp: state[i].comp, collisions: state[i].collisions, finalHue: state[i].hue }
    : c)
}
