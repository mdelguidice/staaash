// Small formatting helpers shared across the renderer.

export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, (Date.now() - then) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`
  const d = Math.floor(h / 24)
  if (d < 7) return d === 1 ? 'yesterday' : `${d} days ago`
  const w = Math.floor(d / 7)
  if (w < 5) return w === 1 ? '1 week ago' : `${w} weeks ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return mo <= 1 ? '1 month ago' : `${mo} months ago`
  const y = Math.floor(d / 365)
  return y <= 1 ? '1 year ago' : `${y} years ago`
}

// Deterministic tag / favicon colors from an id hash — muted, never volt.
const TAG_COLORS = [
  '#e06a6a', '#e0946a', '#d9b96a', '#a8c46a', '#6ac48f',
  '#6ab8c4', '#6a93c4', '#8f7fd4', '#b76fc4', '#c46a9a'
]

export function hashColor(id) {
  let h = 0
  const s = String(id)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return TAG_COLORS[h % TAG_COLORS.length]
}

// Deterministic per-bookmark card shape — a weighted mix of landscape,
// square, and portrait so the masonry reads varied, not uniform.
// Shapes for cards whose preview has not been measured yet, and for cards with
// no preview at all. Deterministic per id so the grid is stable across renders.
const CARD_ASPECTS = [1.78, 1.6, 1.42, 1.25, 1.0, 1.0, 0.85]

// A card that is much wider or much taller than these reads as a banner or a
// column rather than a card, and one very tall image would dominate its whole
// column. Outside the range the card is clamped and the image letterboxes
// instead — which is what shouldContain then detects.
export const CARD_ASPECT_MIN = 0.7
export const CARD_ASPECT_MAX = 2.1

function hashedAspect(id) {
  let h = 7
  const s = String(id)
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0
  return CARD_ASPECTS[h % CARD_ASPECTS.length]
}

/**
 * The shape a card takes.
 *
 * Its image's own proportions where we know them — the design draws thumbnails
 * at their natural ratios (365x195 and 365x350, i.e. 1.872 and 1.043), not at
 * shapes assigned to them, and a hash cannot land on a ratio that is not in its
 * bucket list. Falls back to the hashed bucket for cards with no preview, and
 * for previews not yet measured (image_w/image_h are backfilled in the
 * background, so an upgraded library converges rather than reflowing at once).
 *
 * Accepts a bookmark or a bare id; the id form always uses the fallback.
 */
export function cardAspect(bookmarkOrId) {
  const b = bookmarkOrId
  if (b && typeof b === 'object') {
    const w = Number(b.image_w)
    const h = Number(b.image_h)
    if (w > 0 && h > 0) {
      return Math.min(CARD_ASPECT_MAX, Math.max(CARD_ASPECT_MIN, w / h))
    }
    return hashedAspect(b.id)
  }
  return hashedAspect(b)
}

// When the card shape deviates this far from the image's natural ratio,
// the card letterboxes the full image over a blurred fill instead of
// cover-cropping — text-heavy OG banners stay legible.
export function shouldContain(bookmarkOrId, naturalAspect) {
  if (!naturalAspect) return false
  const shape = cardAspect(bookmarkOrId)
  return shape < naturalAspect * 0.9 || shape > naturalAspect * 1.25
}

export function faviconSrc(bookmark) {
  return bookmark.favicon_path ? `staaash-img://img/${bookmark.favicon_path}` : null
}

export function imageSrc(bookmark) {
  if (bookmark.image_path) return `staaash-img://img/${bookmark.image_path}`
  if (bookmark.image_url) return bookmark.image_url
  return null
}

export function domainInitial(bookmark) {
  const d = bookmark.domain || bookmark.title || '?'
  return d.charAt(0).toUpperCase()
}
