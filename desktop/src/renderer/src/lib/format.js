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

/**
 * The tallest a card may be, as a multiple of the column width.
 *
 * Cards otherwise take their image's exact proportions, so this only ever binds
 * on the portrait tail. Measured against a real 293-row library: the aspect
 * histogram has nothing at all between 0.564 and 0.769, so every candidate from
 * 1.3x to 1.75x clamps the same five images (all Instagram, all ~361x640) and
 * the choice only changes how much of them is cropped — 27% at 1.3x, 15% at
 * 1.5x, 1% at 1.75x.
 *
 * 1.5x is where the old letterbox mechanism dies rather than merely idles. That
 * mechanism triggered when the card's shape differed from the image's by more
 * than -10%/+25%; a 1.5x clamp on a 0.564 image lands inside that tolerance, so
 * no card can request a letterbox any more. Nothing has to decide between
 * letterboxing and cropping because only one of them still exists.
 */
export const MAX_CARD_TALLNESS = 1.5
const MIN_CARD_ASPECT = 1 / MAX_CARD_TALLNESS

/**
 * The shape of a card whose preview has not been measured.
 *
 * 1.905 is 1200x630 — the og:image convention, and 70.4% of a real library sits
 * on it exactly. For an unmeasured card any constant is a guess, so the guess is
 * the modal ratio: it minimises the expected crop when the image does arrive,
 * and it keeps the grid from reflowing when a measurement lands on the common
 * case. Reached by 6 rows of 243, all of them files the header parser cannot
 * read (see imageSize.js).
 */
const UNMEASURED_ASPECT = 1.905

/**
 * The shape a card takes: its image's own proportions, clamped at the tall end.
 *
 * Always derived from the RECORD, never from the loaded <img> — the masonry
 * places every card before any of them paint, so a shape that arrived with the
 * image would reflow the whole grid underneath the user.
 */
export function cardShape(b) {
  const w = Number(b?.image_w)
  const h = Number(b?.image_h)
  if (w > 0 && h > 0) return Math.max(MIN_CARD_ASPECT, w / h)
  // No preview at all: the gradient placeholder carries its own shape, assigned
  // once at save time from the domain (main/placeholder.js). Not clamped — it is
  // chosen from a fixed set that is already inside the clamp.
  const ph = Number(b?.ph_aspect)
  if (ph > 0) return ph
  return UNMEASURED_ASPECT
}

/** True when the clamp bound, so the card shows less than the whole image. */
export function isCropped(b) {
  const w = Number(b?.image_w)
  const h = Number(b?.image_h)
  return w > 0 && h > 0 && w / h < MIN_CARD_ASPECT
}

/**
 * Where to hold the image when a card crops it, as a CSS object-position.
 *
 * Only clamped cards crop, and cropping is vertical only: every column is the
 * same width and a card's width is always its column's, so the horizontal axis
 * never has anything to discard.
 *
 * Uncropped cards get the default rather than a computed value — with shape ==
 * natural aspect there is no overflow for a focal point to bias.
 */
export function focalPosition(b) {
  if (!isCropped(b)) return undefined
  // Number(null) is 0, and 0 is a legitimate focal value (top) — so a null has to
  // be rejected BEFORE the numeric check or every unmeasured row silently
  // top-anchors. That matters more than it looks: focal_y is null on every row
  // until the backfill sweep has run, so getting this wrong top-anchors the
  // whole library on first launch.
  const raw = b?.focal_y
  const stored = raw == null ? NaN : Number(raw)
  const y = Number.isFinite(stored) && stored >= 0 && stored <= 1
    ? stored
    : b?.preview_source === 'screenshot'
      ? 0
      : 0.5
  return `50% ${(y * 100).toFixed(2)}%`
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
