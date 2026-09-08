// Crops every raster/vector asset for the 5181:38 rebuild out of the committed
// 2x Figma export. The Figma MCP asset host (www.figma.com) is denied by the
// container's egress policy, so download_assets cannot be used here; the crops
// are taken at the node rects from get_metadata instead. Rects are in 1x frame
// coordinates and doubled for the 2x source.
//
//   node figma-5181-38/tools/crop-assets.mjs
//
// Icons drawn on a flat background are unmixed to RGBA (alpha from distance to
// the background colour) so the same PNG sits correctly on any surface.
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('../../tools/visual-diff/node_modules/sharp')
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REF = join(HERE, '../../visual-diff/figma/everything@2x.png')
const OUT = join(HERE, '../assets')
mkdirSync(OUT, { recursive: true })

// name, x, y, w, h (1x), node, mode
//   raw   → keep pixels as exported
//   alpha → monochrome glyph on flat bg: unmix to RGBA
const CROPS = [
  // sidebar chrome
  ['window-controls', 20, 20, 52, 12, '5181:41', 'raw'],
  ['icon-everything', 28, 78, 16, 16, '5181:46', 'alpha', [204, 255, 0]], // glyph touches every edge; name the row fill
  ['icon-unread', 28, 118, 16, 16, '5181:53', 'alpha'],
  ['icon-favorite', 28, 158, 16, 16, '5181:60', 'alpha'],
  ['icon-archived', 28, 198, 15, 16, '5181:67', 'alpha'],
  ['icon-trash', 28, 238, 16, 16, '5181:74', 'alpha'],
  ['dot-craft', 28, 316, 16, 16, '5181:92', 'alpha'],
  ['dot-typography', 28, 356, 16, 16, '5181:100', 'alpha'],
  ['dot-motion', 28, 396, 16, 16, '5181:108', 'alpha'],
  ['dot-systems', 28, 436, 16, 16, '5181:116', 'alpha'],
  // the export predates the current sidebar; these three sit at their old y/x
  ['icon-more', 28, 516, 16, 16, '5181:134', 'alpha'],
  ['icon-chevron-down', 204, 564, 16, 16, '5270:131', 'alpha'],
  ['icon-plus-8', 1332, 31, 8, 8, '5181:220', 'alpha'],
  ['icon-add', 224, 286, 16, 16, '5181:85', 'alpha'],
  ['icon-shortcuts', 28, 694, 14, 14, '5181:144', 'alpha'],
  ['icon-footer-right', 220, 752, 24, 24, '5269:551', 'alpha'],
  // header
  ['icon-info', 511, 26, 18, 18, '5181:210', 'alpha'],
  ['icon-gear', 1394, 25, 20, 20, '5181:228', 'alpha'],
  // search
  ['icon-sparkle', 525, 747, 10, 10, '5181:542', 'alpha'],
  // cards
  ['icon-external', 371, 687, 8, 8, '5181:303', 'alpha'],
  ['fav-rauno', 290, 297, 8, 8, '5181:261', 'raw'],
  ['fav-interfaces', 284, 687, 8, 8, '5181:299', 'raw'],
  ['fav-polar', 669, 452, 8, 8, '5181:376', 'raw'],
  ['fav-dropshot', 1054, 297, 6, 8, '5181:453', 'raw'],
  ['fav-stateofai', 1054, 532, 8, 8, '5181:492', 'raw'],
  // thumbnails: the full node rect — Figma draws the 1px stroke over the image,
  // not around it. Cards that run past the frame's bottom edge are cropped to
  // what the export contains.
  ['thumb-rauno-1', 284, 90, 365, 195, '5181:233', 'raw'],
  ['thumb-interfaces-1', 284, 325, 365, 350, '5181:271', 'raw'],
  ['thumb-rauno-2', 284, 715, 365, 77, '5181:309', 'raw'],
  ['thumb-polar-1', 669, 90, 365, 350, '5181:348', 'raw'],
  ['thumb-polar-2', 669, 480, 365, 312, '5181:386', 'raw'],
  ['thumb-dropshot', 1054, 90, 365, 195, '5181:425', 'raw'],
  ['thumb-stateofai', 1054, 325, 365, 195, '5181:464', 'raw'],
  ['thumb-interfaces-2', 1054, 560, 365, 232, '5181:502', 'raw']
]

const src = sharp(REF)
const meta = await src.metadata()

for (const [name, x, y, w, h, node, mode, bg] of CROPS) {
  const region = { left: x * 2, top: y * 2, width: w * 2, height: h * 2 }
  if (region.left + region.width > meta.width || region.top + region.height > meta.height) {
    throw new Error(`${name} (${node}) runs outside the export`)
  }
  let img = sharp(REF).extract(region)
  if (mode === 'alpha') img = await unmix(img, w * 2, h * 2, bg)
  await img.png().toFile(join(OUT, `${name}.png`))
  console.log(`${name}.png  ${w}x${h}@2x  ${node}`)
}

// Take the background as the modal colour of the crop's border ring, the glyph
// colour as the pixel farthest from it, and solve O = a*C + (1-a)*B for a.
async function unmix(img, w, h, bgOverride) {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const px = (i) => [data[i * ch], data[i * ch + 1], data[i * ch + 2]]
  const ring = []
  for (let x = 0; x < w; x++) { ring.push(px(x), px((h - 1) * w + x)) }
  for (let y = 0; y < h; y++) { ring.push(px(y * w), px(y * w + w - 1)) }
  const key = (p) => p.join(',')
  const counts = new Map()
  for (const p of ring) counts.set(key(p), (counts.get(key(p)) || 0) + 1)
  const B = bgOverride || [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number)
  const dist = (p) => Math.hypot(p[0] - B[0], p[1] - B[1], p[2] - B[2])
  let C = B, best = 0
  for (let i = 0; i < w * h; i++) { const p = px(i); const d = dist(p); if (d > best) { best = d; C = p } }
  const out = Buffer.alloc(w * h * 4)
  const cb = Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2]) || 1
  for (let i = 0; i < w * h; i++) {
    const p = px(i)
    // project onto the B→C axis
    const a = Math.max(0, Math.min(1, ((p[0] - B[0]) * (C[0] - B[0]) + (p[1] - B[1]) * (C[1] - B[1]) + (p[2] - B[2]) * (C[2] - B[2])) / (cb * cb)))
    out[i * 4] = C[0]; out[i * 4 + 1] = C[1]; out[i * 4 + 2] = C[2]; out[i * 4 + 3] = Math.round(a * 255)
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
}
