/**
 * Gradient placeholders for cards with no preview image.
 *
 * Drawn with CSS radial-gradients rather than an SVG blob under a blur filter.
 * Radial gradients are soft by construction, so the composition needs no
 * feGaussianBlur — which matters beyond tidiness: a large blur is exactly what
 * made the harness's captures non-reproducible before (see the README's
 * "Resolved: the everything bistability was filter: blur(26px)"), and this
 * avoids reintroducing that class of thing.
 *
 * Geometry is fractional and scaled by the box DIAGONAL, so a composition keeps
 * its balance whether the card is 1.91 or 0.8. CSS resolves a radial-gradient's
 * horizontal radius against the box width and its vertical radius against the
 * height, so a plain percentage would stretch with the card. The percentages are
 * therefore derived from the aspect (see blobRadii) to reproduce diagonal
 * scaling exactly, while staying unitless — no pixel values, nothing to
 * recompute when the window resizes.
 *
 * The hue stops arrive from the record (ph_hue_a/b/c). Saturation and lightness
 * are imposed here, so the whole library's register can be retuned by editing
 * this file rather than by migrating data.
 */

// House palette. Muted on purpose: placeholders sit beside mostly-dark
// thumbnails and must not out-shout them.
const BASE_S = 0.30, BASE_L = 0.055        // the near-black tinted ground
const BLOB = [
  { s: 0.52, l: 0.34 },                    // hue A
  { s: 0.46, l: 0.29 },                    // hue B
  { s: 0.40, l: 0.24 }                     // hue C
]

const hsl = (h, s, l, a = 1) =>
  `hsl(${(((h % 360) + 360) % 360).toFixed(1)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}% / ${a})`

/**
 * Blob radii as percentages that reproduce "r x diagonal" for a given aspect.
 *   rx% = r x D / w = r x sqrt(1 + 1/a^2)
 *   ry% = 0.86 x r x D / h = 0.86 x r x a x sqrt(1 + 1/a^2)
 */
function blobRadii(r, aspect) {
  const a = aspect > 0 ? aspect : 1
  const k = Math.sqrt(1 + 1 / (a * a))
  return { rx: r * k * 100, ry: 0.86 * r * a * k * 100 }
}

// [cx, cy, r, stopIndex, opacity] — cx/cy as fractions of the box, r as a
// fraction of the diagonal. Ported unchanged from the prototype stable.
const COMPOSITIONS = [
  [[0.12, 1.02, 0.62, 0, 0.95], [0.86, 0.06, 0.34, 1, 0.75], [0.55, 0.62, 0.26, 2, 0.5]],
  [[0.50, 0.52, 0.52, 0, 0.95], [0.16, 0.18, 0.24, 1, 0.6], [0.88, 0.84, 0.28, 2, 0.6]],
  [[0.08, 0.92, 0.50, 0, 0.9], [0.55, 0.48, 0.40, 1, 0.7], [0.96, 0.08, 0.40, 2, 0.8]],
  [[0.50, -0.10, 0.66, 0, 0.95], [0.18, 0.72, 0.30, 2, 0.55], [0.86, 0.58, 0.24, 1, 0.5]],
  [[0.14, 0.16, 0.44, 0, 0.85], [0.88, 0.86, 0.46, 1, 0.85], [0.52, 0.50, 0.20, 2, 0.35]],
  [[0.34, 0.40, 0.50, 0, 0.92], [0.80, 0.22, 0.22, 1, 0.6], [0.72, 0.80, 0.26, 2, 0.6], [0.10, 0.86, 0.18, 1, 0.4]],
  [[0.50, 1.06, 0.72, 0, 0.95], [0.24, 0.44, 0.28, 1, 0.5], [0.78, 0.34, 0.22, 2, 0.45]],
  [[1.08, 0.46, 0.60, 0, 0.95], [0.10, 0.24, 0.26, 1, 0.55], [0.28, 0.86, 0.24, 2, 0.5]],
  [[0.24, 0.28, 0.36, 0, 0.85], [0.74, 0.44, 0.34, 1, 0.8], [0.44, 0.88, 0.32, 2, 0.7]],
  [[0.44, 0.06, 0.46, 0, 0.8], [0.58, 0.50, 0.42, 1, 0.75], [0.40, 0.98, 0.44, 2, 0.8]]
]
export const COMPOSITION_COUNT = COMPOSITIONS.length

export const hasPlaceholder = (b) => !b?.image_path && b?.ph_aspect != null

/**
 * Inline style for a placeholder's media box.
 * `hueShift` comes from adjacency resolution and is 0 for most cards.
 * `compShift` likewise swaps the composition when a collision was resolved.
 */
export function placeholderStyle(b, { hueShift = 0, compShift = 0 } = {}) {
  const aspect = Number(b.ph_aspect) || 1.91
  const comp = COMPOSITIONS[(((Number(b.ph_comp) || 0) + compShift) % COMPOSITION_COUNT + COMPOSITION_COUNT) % COMPOSITION_COUNT]
  const hues = [Number(b.ph_hue_a) || 0, Number(b.ph_hue_b) || 0, Number(b.ph_hue_c) || 0]
    .map((h) => h + hueShift)

  const layers = comp.map(([cx, cy, r, k, o]) => {
    const { rx, ry } = blobRadii(r, aspect)
    const c = hsl(hues[k], BLOB[k].s, BLOB[k].l, o)
    const mid = hsl(hues[k], BLOB[k].s, BLOB[k].l, o * 0.45)
    const end = hsl(hues[k], BLOB[k].s, BLOB[k].l, 0)
    return `radial-gradient(ellipse ${rx.toFixed(2)}% ${ry.toFixed(2)}% at ${(cx * 100).toFixed(1)}% ${(cy * 100).toFixed(1)}%, ` +
      `${c} 0%, ${mid} 60%, ${end} 100%)`
  })

  return {
    backgroundImage: layers.join(', '),
    backgroundColor: hsl(hues[0], BASE_S, BASE_L)
  }
}

// ── adjacency ───────────────────────────────────────────────────────────────
const HUE_FAMILY = 30      // closer than this and two placeholders read as one colour
const HUE_NUDGE = 48

const hueOf = (b, shift = 0) => ((((Number(b.ph_hue_a) || 0) + shift) % 360) + 360) % 360
const hueDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d) }

/**
 * Resolve colour collisions between adjacent placeholders.
 *
 * Adjacency is the card directly above or below in the same column, plus any
 * card in a neighbouring column overlapping vertically by more than half the
 * shorter card's height.
 *
 * `placements` are the masonry's own, so this runs after layout and costs one
 * pass over the placed cards. Returns a Map of bookmark id to {hueShift,
 * compShift}; ids absent from the map need no adjustment.
 */
export function resolveAdjacentHues(placements, colW) {
  const items = placements
    .map((p, i) => ({ ...p, i, col: Math.round(p.x / (colW + 20)) }))
    .filter((p) => hasPlaceholder(p.b))
  const out = new Map()
  if (!items.length) return out

  const shiftOf = (it) => out.get(it.b.id)?.hueShift ?? 0

  for (let n = 0; n < items.length; n++) {
    const it = items[n]
    let guard = 0
    while (guard < 8) {
      const clash = items.slice(0, n).find((o) => {
        if (Math.abs(o.col - it.col) > 1) return false
        if (o.col === it.col) {
          const between = items.some((m) => m.col === it.col &&
            m.y > Math.min(o.y, it.y) && m.y < Math.max(o.y, it.y))
          if (between) return false
        } else {
          const overlap = Math.min(o.y + o.h, it.y + it.h) - Math.max(o.y, it.y)
          if (overlap <= 0.5 * Math.min(o.h, it.h)) return false
        }
        return hueDist(hueOf(it.b, shiftOf(it)), hueOf(o.b, shiftOf(o))) < HUE_FAMILY
      })
      if (!clash) break
      guard++
      // Nudge the LATER card, and give it a different composition too, so two
      // resolved neighbours differ in more than hue alone.
      out.set(it.b.id, { hueShift: guard * HUE_NUDGE, compShift: guard })
    }
  }
  return out
}
