/**
 * Deterministic gradient-placeholder parameters for a bookmark with no preview.
 *
 * Every value here is a pure function of the domain string (plus the favicon's
 * hue, which is itself a property of the site). Nothing is random and nothing
 * depends on position, so a placeholder looks identical on every launch, and
 * adding a bookmark above it in the grid cannot change it. That last property is
 * the reason shape is NOT chosen to level the masonry columns: levelling is a
 * function of what is above a card, so it would repaint a card's shape whenever
 * something was inserted. The cost is about 96px of extra column raggedness,
 * measured over the 45 real cards, and it was judged worth paying.
 *
 * Computed once at save time and stored, so changing this file later cannot
 * reshuffle a library that already exists.
 */

/** FNV-1a. Small, stable across platforms, and good enough to spread 45 domains. */
export function hash(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export const PLACEHOLDER_ASPECTS = [1.91, 1.6, 1.33, 1.0, 0.8]
export const COMPOSITION_COUNT = 10

// The volt accent is #ccff00, hue 72. A placeholder sitting near it reads as a
// UI element rather than as content, so a guard band is cut out of the wheel.
const VOLT_HUE = 72
const VOLT_GUARD = 20

/**
 * Map an arbitrary hue onto the wheel minus the volt guard band.
 * Used for hash-derived hues: a bijection onto the remaining 320 degrees, so the
 * distribution stays even instead of piling up against the band's edges.
 */
function spreadOutsideVolt(h) {
  const lo = VOLT_HUE - VOLT_GUARD
  const span = 360 - 2 * VOLT_GUARD
  const x = ((((h % 360) + 360) % 360) / 360) * span
  return (x < lo ? x : x + 2 * VOLT_GUARD) % 360
}

/**
 * Push a hue just outside the guard band, by the shortest move.
 * Used for favicon-derived hues, where the point is to keep the site's actual
 * colour — so a lime brand lands at the edge of the band rather than being
 * rotated somewhere unrelated.
 */
function nudgeOutsideVolt(h) {
  const x = (((h % 360) + 360) % 360)
  const lo = VOLT_HUE - VOLT_GUARD
  const hi = VOLT_HUE + VOLT_GUARD
  if (x < lo || x > hi) return x
  return x - lo < hi - x ? lo : hi
}

/**
 * @param {string} domain
 * @param {number|null} favHue  dominant favicon hue in degrees, or null
 */
export function placeholderFor(domain, favHue = null) {
  const key = String(domain || '')
  const h0 = hash(key)
  const seeded = favHue != null && Number.isFinite(favHue)
  const base = seeded ? nudgeOutsideVolt(favHue) : spreadOutsideVolt(h0 % 360)

  // Two further stops close to the base — the design direction is a small hue
  // range, not a rainbow. Direction and spacing come from the hash so sites do
  // not all lean the same way.
  const dir = (h0 >> 8) % 2 ? 1 : -1
  const spread = 16 + ((h0 >> 3) % 15)          // 16-30 degrees between stops

  return {
    comp: hash(key + ':comp') % COMPOSITION_COUNT,
    aspect: PLACEHOLDER_ASPECTS[hash(key + ':shape') % PLACEHOLDER_ASPECTS.length],
    hueA: +nudgeOutsideVolt(base).toFixed(2),
    hueB: +nudgeOutsideVolt(base + dir * spread).toFixed(2),
    hueC: +nudgeOutsideVolt(base + dir * spread * 2).toFixed(2),
    seeded
  }
}
