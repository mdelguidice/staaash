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
 * Hue relationships between the three stops.
 *
 * Read off the references, and the headline is that HUE COUNT VARIES. Two of the
 * five are essentially one hue carried by lightness alone; two are a pair; one
 * is a three-way. Single-hue was never the problem — MIXING was. Close hues at
 * moderate saturation and low lightness average toward brown-grey, which is what
 * the first version (stops 16-30 degrees apart, all at lightness 0.24-0.34) did
 * on every card.
 *
 * So the fix is not "always spread the hues". It is: either commit to one hue
 * and let a wide lightness range do the work, or put the hues far enough apart
 * that neither reads as a tint of the other. The band in between is the mud.
 *
 * This array is a WEIGHTED BAG, not a list of distinct looks — the repeated
 * mono entry sets its frequency at 3-in-10, roughly the 2-in-5 of the
 * references. Two mono cards still differ: composition, aspect and base hue are
 * all drawn separately.
 */
const HUE_PATTERNS = [
  [0, 0, 0],       // mono — lightness carries it. The all-blue and violet refs.
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 190, 190],   // near-complementary pair. The orange/blue ref.
  [0, 165, 165],
  [0, 205, 205],
  [0, 65, 65],     // close pair — legal ONLY because they meet through the lit
                   // region rather than at mid-lightness. The purple/blue ref.
  [0, 150, 290],   // three-way. The cyan/amber/magenta ref.
  [0, 130, 250]
]
// Deliberately absent: anything with a third stop 20-45 degrees off the peak.
// That is the first version's geometry exactly, and it is the one place a
// wide lightness split is not enough to save it.

const voltDist = (h) => {
  const x = (((h % 360) + 360) % 360)
  const d = Math.abs(((x - VOLT_HUE) % 360 + 360) % 360)
  return Math.min(d, 360 - d)
}

/**
 * Place a whole pattern on the wheel with no stop inside the volt guard band,
 * by rotating the SET as a unit.
 *
 * The previous version pushed each stop out of the band independently. That
 * preserved the base hue but destroyed the relationships the pattern exists to
 * express — a 190-degree pair could come out 150 apart, and two of the 47 ended
 * up under 60. Rotating keeps every interval exact to the degree and moves by
 * the smallest amount that clears the band, so a favicon-seeded card still
 * lands as close to its brand hue as the band allows.
 *
 * `slack` exists because "smallest rotation that clears the band" makes every
 * rotated set stop the instant it is legal — which parks a stop at the band's
 * exact edge. Five of the 47 came out sharing a 92-94 degree chartreuse, the
 * closest legal hue to the volt accent and so the one the guard is most meant
 * to keep clear of. Requiring a hash-derived extra margin spreads those across
 * roughly 92-113 instead of piling them on the boundary, deterministically and
 * without weakening the guard itself.
 *
 * Always solvable: three stops forbid at most 3 x (40 + 21) = 183 degrees of
 * the 360 available rotations. The fallback return is unreachable in practice.
 */
function placeSet(base, offsets, dir, slack) {
  const at = (rot) => offsets.map((o) => (((base + rot + dir * o) % 360) + 360) % 360)
  for (let step = 0; step <= 180; step += 2) {
    for (const rot of step === 0 ? [0] : [step, -step]) {
      const set = at(rot)
      if (!set.some((h) => voltDist(h) <= VOLT_GUARD + slack)) return set
    }
  }
  return at(0)
}

/**
 * @param {string} domain
 * @param {number|null} favHue  dominant favicon hue in degrees, or null
 */
export function placeholderFor(domain, favHue = null) {
  const key = String(domain || '')
  const h0 = hash(key)
  const seeded = favHue != null && Number.isFinite(favHue)
  // Seeded cards start at the brand hue exactly; placeSet moves the set only if
  // the band forces it. Hash cards go through the bijection first so the
  // distribution stays even rather than piling against the band's edges.
  const base = seeded ? (((favHue % 360) + 360) % 360) : spreadOutsideVolt(h0 % 360)

  // Which hue relationship this site gets, and which way round it runs, both
  // from the hash — so sites do not all lean the same way.
  const dir = (h0 >> 8) % 2 ? 1 : -1
  const pat = HUE_PATTERNS[hash(key + ':pattern') % HUE_PATTERNS.length]
  // Slack is never 0: a zero would put that quarter of the library straight
  // back on the band's edge, which is the pile-up this exists to break.
  const [a, b, c] = placeSet(base, pat, dir, 4 + (hash(key + ':slack') % 4) * 6)

  return {
    comp: hash(key + ':comp') % COMPOSITION_COUNT,
    aspect: PLACEHOLDER_ASPECTS[hash(key + ':shape') % PLACEHOLDER_ASPECTS.length],
    hueA: +a.toFixed(2),
    hueB: +b.toFixed(2),
    hueC: +c.toFixed(2),
    seeded
  }
}
