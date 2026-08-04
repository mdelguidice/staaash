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

/**
 * House palette.
 *
 * Two things make the references work, and neither is hue spread.
 *
 * ONE: the blobs are LIGHT, not paint. Overlapping translucent paint averages
 * its inputs, and the average of two colours at similar mid-lightness is
 * brown-grey — that is the mud, and it is a compositing property, not a palette
 * one. No choice of hues survives it. So the layers are composited with
 * `screen` (see placeholderStyle): over a near-black ground, screen leaves each
 * blob alone in its own region and ADDS where they meet, the way the purple and
 * blue in the reference meet through a pale centre rather than through sludge.
 *
 * TWO: saturation RISES as lightness falls. A dark region at low saturation is
 * just grey; the references' dark grounds are deep navy and aubergine, which
 * are dark AND saturated. The old table had it backwards — its brightest stop
 * was also its most saturated, so the shadows drifted neutral.
 *
 * `stop` is the falloff profile: full strength, half gone, and zero, as
 * fractions of the blob's radius.
 *
 * The first number is not 0, and that is load-bearing. With a 0 there the
 * colour is at full strength at a single MATHEMATICAL POINT and is already
 * down to the mid alpha a quarter of the way out, so the blob reads as a dim
 * smudge rather than as a light source — measured on a real card, only 4.9% of
 * it came out above luminance 60, with a median of 27. The references have a
 * bright PLATEAU, not a bright point. A real core plus a shorter tail is both
 * brighter where it counts and darker overall.
 */
const BASE_S = 0.55, BASE_L = 0.028        // near-black, but a real colour
// LOW_ALPHA is deliberately tiny. Its job is to erase the blob's edge, not to
// light anything: at 0.14 the tail put the mid-tone wash straight back (median
// luminance 60 against the 40 the shorter tail achieved), because the annulus
// it covers is most of the blob's area. At 0.07 the edge still dissolves and
// the median holds.
const MID_ALPHA = 0.45, LOW_ALPHA = 0.07   // fractions of the stop's opacity
const BLOB = [
  { s: 0.74, l: 0.55, stop: [0.16, 0.32, 0.50, 0.82] },  // hue A — the lit one
  { s: 0.80, l: 0.34, stop: [0.12, 0.34, 0.55, 0.86] },  // hue B — supporting
  { s: 0.86, l: 0.17, stop: [0.10, 0.38, 0.60, 0.92] }   // hue C — tints dark
]

/**
 * Single-hue cards get a brighter, wider register — and this is the references
 * talking, not a patch. Their two mono examples are the BRIGHT ones of the
 * five: violet lit across most of its frame, blue across about half. Their dark
 * dominant examples are all multi-hue. That ordering is not a coincidence. A
 * second hue is itself a source of interest, so a mostly-dark frame still has
 * something to look at; one hue has only its lightness range, so if you also
 * take the brightness away there is nothing left.
 *
 * It shows up worst in the warm half of the wheel, because a dark orange is
 * definitionally brown — hues around 10-40 at the dark register came out as
 * exactly the sludge this whole revision exists to remove.
 */
// Saturation is higher here than in the dark table, not lower, even though the
// lightness is higher. HSL desaturates perceptually as it climbs — at l 0.66 an
// orange at s 0.72 is a cream/tan, not an orange — and the warm mono cards came
// out looking like milky coffee. s 0.86 buys the chroma back.
const BLOB_MONO = [
  { s: 0.86, l: 0.66, stop: [0.20, 0.40, 0.62, 0.90] },
  { s: 0.82, l: 0.40, stop: [0.14, 0.38, 0.64, 0.90] },
  { s: 0.88, l: 0.19, stop: [0.10, 0.40, 0.68, 0.94] }
]

const isMono = (hues) =>
  Math.abs(hues[0] - hues[1]) < 1 && Math.abs(hues[1] - hues[2]) < 1

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

  const BLOBS = isMono(hues) ? BLOB_MONO : BLOB

  const layers = comp.map(([cx, cy, r, k, o]) => {
    const { rx, ry } = blobRadii(r, aspect)
    // Four stops, not three. Three forced a choice between a long tail (which
    // washes the card in mid-tone) and a short one (which gives the blob a
    // visible circular EDGE and makes the card read as lava-lamp orbs rather
    // than light). The fourth stop buys a long tail at low alpha: the edge
    // dissolves, the mid-tone area does not grow.
    const [s0, s1, s2, s3] = BLOBS[k].stop
    const at = (a) => hsl(hues[k], BLOBS[k].s, BLOBS[k].l, a)
    return `radial-gradient(ellipse ${rx.toFixed(2)}% ${ry.toFixed(2)}% at ${(cx * 100).toFixed(1)}% ${(cy * 100).toFixed(1)}%, ` +
      `${at(o)} ${(s0 * 100).toFixed(0)}%, ${at(o * MID_ALPHA)} ${(s1 * 100).toFixed(0)}%, ` +
      `${at(o * LOW_ALPHA)} ${(s2 * 100).toFixed(0)}%, ${at(0)} ${(s3 * 100).toFixed(0)}%)`
  })

  return {
    backgroundImage: layers.join(', '),
    // The whole point. Source-over would average overlapping blobs into mud;
    // screen adds them like light. Over a ground at lightness 0.028 the lift
    // where nothing overlaps is negligible — screen against near-black is
    // close to identity — so this brightens the meeting points without
    // greying the frame.
    backgroundBlendMode: 'screen',
    // The ground takes hue C, the deep saturated stop, so the dark two-thirds
    // of the card is tinted by the colour that is meant to own it. Hue A tinted
    // it before, which pulled the shadows toward the lit hue.
    backgroundColor: hsl(hues[2], BASE_S, BASE_L)
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
