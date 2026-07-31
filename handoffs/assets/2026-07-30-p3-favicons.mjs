/**
 * Viability of favicon colours as the seed for gradient placeholders.
 * Read-only. Covers every card with no preview image.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
const OUT = '/private/tmp/claude-501/-Users-mike-staaash/fef7c9b1-8d0d-4fd9-be77-91c9cc421f0b/scratchpad'
const IMG = `${process.env.HOME}/Library/Application Support/staaash/images`
const sharp = (await import('/Users/mike/staaash/tools/visual-diff/node_modules/sharp/dist/index.cjs')).default

const rows = JSON.parse(execFileSync('sqlite3', [`${OUT}/lib2/staaash.db`, '-json',
  `SELECT id, domain, url, favicon_path FROM bookmarks
    WHERE image_path IS NULL AND deleted_at IS NULL AND archived_at IS NULL
    ORDER BY domain`], { encoding: 'utf8' }))

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0))
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

const out = []
for (const r of rows) {
  const rec = { domain: r.domain, favicon: r.favicon_path, status: null, colours: [] }
  if (!r.favicon_path) { rec.status = 'no-favicon'; out.push(rec); continue }
  let data, info
  try {
    const res = await sharp(join(IMG, r.favicon_path)).ensureAlpha().resize(48, 48, { fit: 'inside' })
      .raw().toBuffer({ resolveWithObject: true })
    data = res.data; info = res.info
  } catch { rec.status = 'unreadable'; out.push(rec); continue }

  // Bucket by hue (18 bins of 20 deg), keeping only pixels that carry real
  // colour: opaque, not near-black, not near-white, meaningfully saturated.
  const bins = new Map()
  let opaque = 0, chromatic = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const [R, G, B, A] = [data[i], data[i + 1], data[i + 2], info.channels > 3 ? data[i + 3] : 255]
    if (A < 128) continue
    opaque++
    const [h, s, l] = rgb2hsl(R, G, B)
    if (s < 0.18 || l < 0.12 || l > 0.90) continue
    chromatic++
    const k = Math.floor(h / 20)
    const e = bins.get(k) ?? { n: 0, r: 0, g: 0, b: 0 }
    e.n++; e.r += R; e.g += G; e.b += B
    bins.set(k, e)
  }
  const total = chromatic || 1
  const clusters = [...bins.entries()]
    .map(([k, e]) => ({ hueBin: k, share: e.n / total, n: e.n, hex: hex(e.r / e.n, e.g / e.n, e.b / e.n) }))
    .filter((c) => c.share >= 0.12)          // a colour has to be present, not a stray pixel
    .sort((a, b) => b.n - a.n)

  rec.chromaticFrac = +(chromatic / Math.max(1, opaque)).toFixed(3)
  rec.colours = clusters.slice(0, 4)
  if (chromatic / Math.max(1, opaque) < 0.10) rec.status = 'achromatic'   // near-black/white/grey only
  else if (clusters.length >= 2) rec.status = 'two-plus'
  else if (clusters.length === 1) rec.status = 'one-colour'
  else rec.status = 'achromatic'
  out.push(rec)
}

writeFileSync(`${OUT}/favicons.json`, JSON.stringify(out, null, 2))
const by = (s) => out.filter((o) => o.status === s)
console.log(`cards with no preview image: ${out.length}\n`)
console.log(`  two or more distinct colours : ${by('two-plus').length}`)
console.log(`  effectively one colour       : ${by('one-colour').length}`)
console.log(`  near-black / near-white only : ${by('achromatic').length}`)
console.log(`  no favicon at all            : ${by('no-favicon').length}`)
console.log(`  favicon unreadable           : ${by('unreadable').length}`)
const usable = by('two-plus').length + by('one-colour').length
console.log(`\n  usable as a colour seed      : ${usable} / ${out.length}  (${((usable / out.length) * 100).toFixed(1)}%)`)
console.log('\n  sample of what was extracted:')
for (const o of out.filter((x) => x.colours.length).slice(0, 12)) {
  console.log(`    ${o.domain.padEnd(28)} ${o.status.padEnd(12)} ${o.colours.map((c) => `${c.hex} ${(c.share * 100).toFixed(0)}%`).join('  ')}`)
}
console.log('\n  achromatic / missing:')
for (const o of out.filter((x) => !x.colours.length)) console.log(`    ${o.domain.padEnd(28)} ${o.status}`)
