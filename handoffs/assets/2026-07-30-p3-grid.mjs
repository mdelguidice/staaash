/**
 * Gallery mock at true card size, using the app's real layout constants.
 * Reads Gallery.jsx's numbers rather than inventing any:
 *   GAP_X 20 · GAP_Y 12 · MAX_COLS 3 · META_H 28 · colW 365.33 at the 1440 frame
 * Placement is the app's own: shortest column first, ties to the leftmost.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const OUT = '/private/tmp/claude-501/-Users-mike-staaash/fef7c9b1-8d0d-4fd9-be77-91c9cc421f0b/scratchpad'
const IMG = `${process.env.HOME}/Library/Application Support/staaash/images`
const sharp = (await import('/Users/mike/staaash/tools/visual-diff/node_modules/sharp/dist/index.cjs')).default

export const S = 2                    // device pixel ratio
export const COL_W = 365.33
export const GAP_X = 20
export const GAP_Y = 12
export const META_H = 28
export const COLS = 3
export const PAD = 20
export const CANVAS = '#080808'
export const RADIUS = 16

export function layout(cards) {
  const heights = new Array(COLS).fill(0)
  const placed = []
  for (const c of cards) {
    let col = 0
    for (let i = 1; i < COLS; i++) if (heights[i] < heights[col] - 0.01) col = i
    const mediaH = COL_W / c.aspect
    const h = mediaH + META_H
    placed.push({ ...c, x: col * (COL_W + GAP_X), y: heights[col], mediaH, h })
    heights[col] = heights[col] + h + GAP_Y
  }
  return { placed, totalH: Math.max(...heights) - GAP_Y }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** One card: media box plus the 28px meta row, at device scale. */
async function renderCard(c) {
  const w = Math.round(COL_W * S)
  const mh = Math.round(c.mediaH * S)
  const r = RADIUS * S

  let media
  if (c.gradientSvg) {
    media = await sharp(Buffer.from(c.gradientSvg(w, mh))).png().toBuffer()
  } else {
    const win = c.win ?? { left: 0, top: 0, w: c.srcW, h: c.srcH }
    media = await sharp(join(IMG, c.file)).rotate()
      .extract({ left: win.left, top: win.top, width: win.w, height: win.h })
      .resize(w, mh, { fit: 'fill', kernel: 'lanczos3' })
      .toColourspace('srgb').png().toBuffer()
  }
  media = await sharp(media).composite([{
    input: Buffer.from(`<svg width="${w}" height="${mh}"><rect width="${w}" height="${mh}" rx="${r}" ry="${r}"/></svg>`),
    blend: 'dest-in'
  }]).png().toBuffer()

  // Meta row: 4px gap then a 24px row, 14px favicon, 10px text.
  const metaH = Math.round(META_H * S)
  const fav = 14 * S, pad = 4 * S, gap = 6 * S
  const cy = pad + (24 * S) / 2
  const meta = Buffer.from(
    `<svg width="${w}" height="${metaH}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${w}" height="${metaH}" fill="${CANVAS}"/>` +
    `<rect x="0" y="${cy - fav / 2}" width="${fav}" height="${fav}" rx="${4 * S}" fill="${c.favColor ?? '#1a1a19'}"/>` +
    `<text x="${fav + gap}" y="${cy + 3.6 * S}" font-family="sans-serif" font-size="${10 * S}" ` +
    `fill="rgba(245,255,225,0.62)">${esc(c.domain ?? '')}</text>` +
    `<text x="${w}" y="${cy + 3.6 * S}" text-anchor="end" font-family="sans-serif" font-size="${10 * S}" ` +
    `fill="rgba(245,255,225,0.4)">${esc(c.time ?? '')}</text>` +
    `</svg>`)
  return { media, meta, w, mh, metaH }
}

export async function renderGrid(cards, { label = null } = {}) {
  const { placed, totalH } = layout(cards)
  const W = Math.round((COL_W * COLS + GAP_X * (COLS - 1) + PAD * 2) * S)
  const LABEL_H = label ? 44 * S : 0
  const H = Math.round(totalH * S) + Math.round(PAD * 2 * S) + LABEL_H

  const comp = []
  if (label) {
    comp.push({
      input: Buffer.from(`<svg width="${W}" height="${LABEL_H}"><rect width="${W}" height="${LABEL_H}" fill="${CANVAS}"/>` +
        `<text x="${PAD * S}" y="${28 * S / 1}" font-family="sans-serif" font-size="${15 * S}" fill="#f5ffe1">${esc(label)}</text></svg>`),
      top: 0, left: 0
    })
  }
  for (const c of placed) {
    const R = await renderCard(c)
    const left = Math.round((PAD + c.x) * S)
    const top = Math.round((PAD + c.y) * S) + LABEL_H
    comp.push({ input: R.media, top, left })
    comp.push({ input: R.meta, top: top + R.mh, left })
  }
  return sharp({ create: { width: W, height: H, channels: 3, background: CANVAS } })
    .composite(comp).png().toBuffer()
}

export async function sideBySide(panels, gap = 40) {
  const bufs = panels
  const metas = await Promise.all(bufs.map((b) => sharp(b).metadata()))
  const W = metas.reduce((a, m) => a + m.width, 0) + gap * (bufs.length - 1)
  const H = Math.max(...metas.map((m) => m.height))
  const comp = []
  let x = 0
  for (let i = 0; i < bufs.length; i++) { comp.push({ input: bufs[i], top: 0, left: x }); x += metas[i].width + gap }
  return sharp({ create: { width: W, height: H, channels: 3, background: '#000000' } })
    .composite(comp).png().toBuffer()
}
