// Renders index.html in Chromium at 1440x792 and checks it two ways:
//
//   1. Geometry — every element carrying data-node-id is measured with
//      getBoundingClientRect and compared with the Figma node rect from
//      expected-rects.json (get_metadata, absolute). Any edge off by more than
//      TOL px is listed. Text nodes are reported separately: their width is
//      set by font metrics, which Chromium and Figma do not share.
//   2. Pixels — a 2x screenshot is diffed against the committed Figma export
//      (visual-diff/figma/everything@2x.png) with pixelmatch, per region. The
//      export predates the current sidebar/header, so only the gallery region
//      is a valid comparison; the others are printed for reference.
//
//   node figma-5181-38/tools/check.mjs
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('../../tools/visual-diff/node_modules/playwright-core')
const pixelmatch = (await import('../../tools/visual-diff/node_modules/pixelmatch/index.js')).default
const sharp = require('../../tools/visual-diff/node_modules/sharp')

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'diff')
mkdirSync(OUT, { recursive: true })
const TOL = 1
const expected = JSON.parse(readFileSync(join(HERE, 'expected-rects.json'), 'utf8'))
delete expected._source

const launch = {
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars']
}
if (process.env.HTTPS_PROXY) launch.proxy = { server: process.env.HTTPS_PROXY }
const browser = await chromium.launch(launch)

async function open(dpr) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 792 }, deviceScaleFactor: dpr })
  const page = await ctx.newPage()
  await page.goto(pathToFileURL(join(ROOT, 'index.html')).href)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.images].every((i) => i.complete))
  await page.waitForTimeout(300)
  return { ctx, page }
}

// ── 1. geometry ─────────────────────────────────────────────────────────────
const { ctx: ctx1, page } = await open(1)
const fontsLoaded = await page.evaluate(() =>
  ['400 14px "Instrument Sans"', '500 14px "Instrument Sans"', '600 10px "Instrument Sans"', '500 10px Inter']
    .map((f) => `${f}: ${document.fonts.check(f)}`))
console.log('fonts:', fontsLoaded.join(' | '))

const actual = await page.evaluate(() => {
  const out = {}
  for (const el of document.querySelectorAll('[data-node-id]')) {
    const r = el.getBoundingClientRect()
    out[el.dataset.nodeId] = { x: r.x, y: r.y, w: r.width, h: r.height, text: el.tagName === 'P' }
  }
  return out
})
await page.screenshot({ path: join(OUT, 'render@1x.png') })
await ctx1.close()

const geom = [], textOnly = [], missing = []
for (const [id, [ex, ey, ew, eh]] of Object.entries(expected)) {
  const a = actual[id]
  if (!a) { missing.push(id); continue }
  const d = { x: a.x - ex, y: a.y - ey, r: (a.x + a.w) - (ex + ew), b: (a.y + a.h) - (ey + eh) }
  const bad = Object.entries(d).filter(([, v]) => Math.abs(v) > TOL)
  if (!bad.length) continue
  const row = { id, expected: [ex, ey, ew, eh], actual: [r2(a.x), r2(a.y), r2(a.w), r2(a.h)], delta: Object.fromEntries(bad.map(([k, v]) => [k, r2(v)])) }
  // text: left/top edges are layout, right/bottom are glyph metrics
  if (a.text && !bad.some(([k]) => k === 'x' || k === 'y')) textOnly.push(row); else geom.push(row)
}
function r2(n) { return Math.round(n * 100) / 100 }

console.log(`\nGEOMETRY  ${Object.keys(expected).length} nodes checked, ${geom.length} off by >${TOL}px, ${textOnly.length} text-metric only, ${missing.length} missing`)
for (const g of geom) console.log(`  ${g.id.padEnd(9)} exp ${g.expected.join(',').padEnd(18)} got ${g.actual.join(',').padEnd(22)} ${JSON.stringify(g.delta)}`)
if (textOnly.length) {
  console.log('\nTEXT (glyph-advance deltas, left/top edges within tolerance):')
  for (const g of textOnly) console.log(`  ${g.id.padEnd(9)} exp ${g.expected.join(',').padEnd(18)} got ${g.actual.join(',').padEnd(22)} ${JSON.stringify(g.delta)}`)
}
if (missing.length) console.log('\nMISSING in DOM:', missing.join(' '))

// ── 2. pixels ───────────────────────────────────────────────────────────────
const { ctx: ctx2, page: page2 } = await open(2)
await page2.screenshot({ path: join(OUT, 'render@2x.png') })
await ctx2.close()
await browser.close()

const REF = join(ROOT, '../visual-diff/figma/everything@2x.png')
const ref = await sharp(REF).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const got = await sharp(join(OUT, 'render@2x.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
if (ref.info.width !== got.info.width || ref.info.height !== got.info.height) throw new Error('size mismatch')
const W = ref.info.width, H = ref.info.height
const diff = Buffer.alloc(W * H * 4)
const n = pixelmatch(ref.data, got.data, diff, W, H, { threshold: 0.1, includeAA: false })
await sharp(diff, { raw: { width: W, height: H, channels: 4 } }).png().toFile(join(OUT, 'diff@2x.png'))

// 50% overlay, as asked
await sharp(REF).composite([{ input: join(OUT, 'render@2x.png'), blend: 'over', premultiplied: false }])
  .png().toFile(join(OUT, 'overlay-raw.png'))
const half = await sharp(join(OUT, 'render@2x.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
for (let i = 3; i < half.data.length; i += 4) half.data[i] = 128
await sharp(REF).composite([{ input: await sharp(half.data, { raw: half.info }).png().toBuffer() }])
  .png().toFile(join(OUT, 'overlay@2x.png'))

const regions = [
  ['gallery (valid: export matches live)', 284, 70, 1156, 636],
  ['sidebar (export is stale below y=282)', 0, 0, 264, 792],
  ['sidebar top (library, unchanged)', 0, 0, 264, 282],
  ['header (export has old button order)', 264, 0, 1176, 70],
  ['blur + search', 264, 706, 1176, 86]
]
console.log(`\nPIXELS vs committed export  whole frame: ${n} px (${(100 * n / (W * H)).toFixed(2)}%)`)
for (const [name, x, y, w, h] of regions) {
  let c = 0
  for (let yy = y * 2; yy < (y + h) * 2; yy++) for (let xx = x * 2; xx < (x + w) * 2; xx++) {
    const i = (yy * W + xx) * 4
    if (diff[i] === 255 && diff[i + 1] === 0 && diff[i + 2] === 0) c++
  }
  console.log(`  ${name.padEnd(40)} ${c} px (${(100 * c / (w * h * 4)).toFixed(2)}%)`)
}
writeFileSync(join(OUT, 'geometry.json'), JSON.stringify({ geom, textOnly, missing }, null, 2))
