/**
 * A stable of gradient-placeholder compositions, drawn as SVG so shape is
 * resolved at render time and every arrangement works at any proportion.
 *
 * All geometry is expressed in fractions of the box and scaled by
 * D = hypot(w, h), so a composition holds its balance whether the card is 1.91
 * or 0.8. Nothing is baked to a fixed pixel size.
 *
 * Register: dark base, two or three hues within ~40 deg of each other, large
 * soft blobs, grain on top. Muted deliberately — these sit next to mostly-dark
 * thumbnails and must not out-shout them.
 */

// ── deterministic hashing ────────────────────────────────────────────────────
export function hash(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h >>> 0
}
const pick = (h, n) => h % n
const jitter = (h, spread) => ((h % 1000) / 1000 - 0.5) * 2 * spread

// ── colour ──────────────────────────────────────────────────────────────────
export function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}
export function hex2hsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return null
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

/**
 * Three hues close together, muted to sit beside dark thumbnails.
 * seedHue comes from the favicon where one is usable; otherwise from the domain
 * hash, which is what keeps it stable across launches.
 */
export function palette(domain, seedHue = null, hueNudge = 0) {
  const h0 = hash(domain)
  const base = (seedHue == null ? (h0 % 360) : seedHue) + hueNudge
  const dir = (h0 >> 8) % 2 ? 1 : -1
  const spread = 16 + ((h0 >> 3) % 14)          // 16-30 deg between stops
  return {
    base: hsl2hex(base, 0.30, 0.055),           // near-black, faintly tinted
    a: hsl2hex(base, 0.52, 0.34),
    b: hsl2hex(base + dir * spread, 0.46, 0.29),
    c: hsl2hex(base + dir * spread * 2, 0.40, 0.24),
    hue: ((base % 360) + 360) % 360
  }
}

// ── the compositions ────────────────────────────────────────────────────────
// Each entry returns an array of blobs in FRACTIONAL coordinates:
//   cx, cy  centre as a fraction of w and h
//   r       radius as a fraction of the diagonal
//   k       which palette colour
//   o       opacity
const COMPOSITIONS = [
  { name: 'corner-rise',   blobs: [[0.12, 1.02, 0.62, 'a', 0.95], [0.86, 0.06, 0.34, 'b', 0.75], [0.55, 0.62, 0.26, 'c', 0.5]] },
  { name: 'centre-bloom',  blobs: [[0.50, 0.52, 0.52, 'a', 0.95], [0.16, 0.18, 0.24, 'b', 0.6], [0.88, 0.84, 0.28, 'c', 0.6]] },
  { name: 'diagonal-sweep',blobs: [[0.08, 0.92, 0.50, 'a', 0.9], [0.55, 0.48, 0.40, 'b', 0.7], [0.96, 0.08, 0.40, 'c', 0.8]] },
  { name: 'top-arc',       blobs: [[0.50, -0.10, 0.66, 'a', 0.95], [0.18, 0.72, 0.30, 'c', 0.55], [0.86, 0.58, 0.24, 'b', 0.5]] },
  { name: 'twin-poles',    blobs: [[0.14, 0.16, 0.44, 'a', 0.85], [0.88, 0.86, 0.46, 'b', 0.85], [0.52, 0.5, 0.2, 'c', 0.35]] },
  { name: 'off-orbit',     blobs: [[0.34, 0.40, 0.50, 'a', 0.92], [0.80, 0.22, 0.22, 'b', 0.6], [0.72, 0.80, 0.26, 'c', 0.6], [0.10, 0.86, 0.18, 'b', 0.4]] },
  { name: 'low-horizon',   blobs: [[0.50, 1.06, 0.72, 'a', 0.95], [0.24, 0.44, 0.28, 'b', 0.5], [0.78, 0.34, 0.22, 'c', 0.45]] },
  { name: 'edge-glow',     blobs: [[1.08, 0.46, 0.60, 'a', 0.95], [0.10, 0.24, 0.26, 'b', 0.55], [0.28, 0.86, 0.24, 'c', 0.5]] },
  { name: 'scatter-trio',  blobs: [[0.24, 0.28, 0.36, 'a', 0.85], [0.74, 0.44, 0.34, 'b', 0.8], [0.44, 0.88, 0.32, 'c', 0.7]] },
  { name: 'vertical-drift',blobs: [[0.44, 0.06, 0.46, 'a', 0.8], [0.58, 0.50, 0.42, 'b', 0.75], [0.40, 0.98, 0.44, 'c', 0.8]] }
]
export const COMPOSITION_NAMES = COMPOSITIONS.map((c) => c.name)

/**
 * Render one placeholder. `w`/`h` in device px, so the same composition can be
 * asked for any card shape.
 */
export function gradientSvg(w, h, { domain, seedHue = null, comp = null, hueNudge = 0, grain = true }) {
  const p = palette(domain, seedHue, hueNudge)
  const idx = comp != null ? comp : pick(hash(domain + ':comp'), COMPOSITIONS.length)
  const C = COMPOSITIONS[idx]
  const D = Math.hypot(w, h)
  const blur = Math.round(D * 0.10)

  const stops = C.blobs.map(([cx, cy, r, k, o], i) => {
    const col = p[k]
    return `<radialGradient id="g${i}" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${col}" stop-opacity="${o}"/>` +
      `<stop offset="60%" stop-color="${col}" stop-opacity="${(o * 0.45).toFixed(3)}"/>` +
      `<stop offset="100%" stop-color="${col}" stop-opacity="0"/></radialGradient>`
  }).join('')

  const circles = C.blobs.map(([cx, cy, r], i) =>
    `<ellipse cx="${(cx * w).toFixed(1)}" cy="${(cy * h).toFixed(1)}" ` +
    `rx="${(r * D).toFixed(1)}" ry="${(r * D * 0.86).toFixed(1)}" fill="url(#g${i})"/>`).join('')

  // Grain via fractal noise, desaturated and held at low opacity. Drawn, not
  // sampled from a file, so it costs nothing at rest and scales with the card.
  const grainLayer = grain
    ? `<filter id="grain" x="0" y="0" width="100%" height="100%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="n"/>` +
      `<feColorMatrix type="saturate" values="0" in="n" result="ns"/>` +
      `<feComponentTransfer in="ns"><feFuncA type="linear" slope="0.42"/></feComponentTransfer>` +
      `</filter><rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.32" style="mix-blend-mode:overlay"/>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>${stops}<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">` +
    `<feGaussianBlur stdDeviation="${blur}"/></filter></defs>` +
    `<rect width="${w}" height="${h}" fill="${p.base}"/>` +
    `<g filter="url(#soft)">${circles}</g>` +
    grainLayer +
    `<rect width="${w}" height="${h}" fill="none" stroke="rgba(250,255,230,0.05)" stroke-width="2"/>` +
    `</svg>`
}
