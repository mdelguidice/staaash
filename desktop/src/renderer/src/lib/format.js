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

export function imageSrc(bookmark) {
  if (bookmark.image_path) return `staaash-img://img/${bookmark.image_path}`
  if (bookmark.image_url) return bookmark.image_url
  return null
}

export function domainInitial(bookmark) {
  const d = bookmark.domain || bookmark.title || '?'
  return d.charAt(0).toUpperCase()
}
