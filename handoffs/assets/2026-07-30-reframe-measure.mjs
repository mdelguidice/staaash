/**
 * Phase 1 measurement for content-aware reframing. READ ONLY.
 *
 * Reads a copy of the library DB and the real images directory. Writes one JSON
 * dump to the scratchpad. Touches no app, layout or harness code.
 *
 * Bounding box method: a row/column variance scan against an estimated border
 * colour, NOT sharp's .trim(). Reasons, in order of how much they mattered:
 *   1. .trim() keys off the top-left pixel. Any image whose subject reaches the
 *      top-left corner trims to nothing, and I cannot tell that case apart from
 *      "genuinely full-bleed" in its output.
 *   2. It returns a box and nothing else. The per-row/per-column profiles are
 *      what make the classification in section 4 possible at all — margin
 *      symmetry, edge contact and solid-row fraction all come from them.
 *   3. Tolerance control. A single JPEG ringing artifact on a flat background
 *      defeats an all-or-nothing threshold; requiring a minimum FRACTION of a
 *      row to differ does not.
 * .trim() is still run as an independent cross-check and both boxes reported.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const REPO = '/Users/mike/staaash'
const OUT = '/private/tmp/claude-501/-Users-mike-staaash/fef7c9b1-8d0d-4fd9-be77-91c9cc421f0b/scratchpad'
const DB = `${OUT}/lib2/staaash.db`
const IMG = `${process.env.HOME}/Library/Application Support/staaash/images`
const sharp = (await import(`${REPO}/tools/visual-diff/node_modules/sharp/dist/index.cjs`)).default

// A card is 365 CSS px wide; the app forces devicePixelRatio 2.
const TARGET_DEVICE_W = 730

// Scan parameters. Reported so the numbers can be re-derived.
const TOL = 12          // max per-channel distance from border colour to count as content
const MIN_FRAC = 0.005  // fraction of a row/col that must differ before it is content
const RING = 2          // px of border sampled to estimate the background colour

const rows = JSON.parse(
  execFileSync('sqlite3', [DB, '-json',
    `SELECT id, url, domain, image_path, image_w, image_h, preview_source,
            deleted_at, archived_at
       FROM bookmarks WHERE image_path IS NOT NULL ORDER BY domain`],
    { encoding: 'utf8' })
)

const median = (a) => {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function analyse(data, W, H, ch) {
  const px = (x, y, c) => data[(y * W + x) * ch + c]

  // Border colour: median of a RING-thick frame, per channel. Median rather
  // than mean so a subject bleeding off one edge cannot drag the estimate.
  const ringVals = [[], [], []]
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const onRing = x < RING || y < RING || x >= W - RING || y >= H - RING
      if (!onRing) continue
      for (let c = 0; c < 3; c++) ringVals[c].push(px(x, y, Math.min(c, ch - 1)))
    }
  }
  const bg = ringVals.map((v) => median(v))

  // How uniform is that border? A flat studio background reads near 0; a
  // full-bleed photograph reads high. This is the primary "is there a
  // background at all" signal.
  let ringDev = 0
  let ringN = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const onRing = x < RING || y < RING || x >= W - RING || y >= H - RING
      if (!onRing) continue
      let d = 0
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(px(x, y, Math.min(c, ch - 1)) - bg[c]))
      ringDev += d
      ringN++
    }
  }
  ringDev /= ringN

  const differs = (x, y) => {
    let d = 0
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(px(x, y, Math.min(c, ch - 1)) - bg[c]))
    return d > TOL
  }

  const rowFrac = new Float32Array(H)
  const colFrac = new Float32Array(W)
  // Solid rows: a row where almost nothing differs from ITS OWN modal colour is
  // a flat band. UI chrome produces many; photographs produce almost none.
  let solidRows = 0
  for (let y = 0; y < H; y++) {
    let n = 0
    const first = [px(0, y, 0), px(0, y, Math.min(1, ch - 1)), px(0, y, Math.min(2, ch - 1))]
    let sameAsFirst = 0
    for (let x = 0; x < W; x++) {
      if (differs(x, y)) { n++; colFrac[x]++ }
      let d2 = 0
      for (let c = 0; c < 3; c++) d2 = Math.max(d2, Math.abs(px(x, y, Math.min(c, ch - 1)) - first[c]))
      if (d2 <= 6) sameAsFirst++
    }
    rowFrac[y] = n / W
    if (sameAsFirst / W > 0.98) solidRows++
  }
  for (let x = 0; x < W; x++) colFrac[x] /= H

  const firstIdx = (arr, len) => { for (let i = 0; i < len; i++) if (arr[i] > MIN_FRAC) return i; return -1 }
  const lastIdx = (arr, len) => { for (let i = len - 1; i >= 0; i--) if (arr[i] > MIN_FRAC) return i; return -1 }

  const top = firstIdx(rowFrac, H)
  const bottom = lastIdx(rowFrac, H)
  const left = firstIdx(colFrac, W)
  const right = lastIdx(colFrac, W)

  if (top < 0 || left < 0) {
    return { empty: true, bg, ringDev: +ringDev.toFixed(2), solidRowFrac: +(solidRows / H).toFixed(3) }
  }
  return {
    empty: false, bg,
    ringDev: +ringDev.toFixed(2),
    solidRowFrac: +(solidRows / H).toFixed(3),
    box: { left, top, width: right - left + 1, height: bottom - top + 1 },
    margins: { left, top, right: W - 1 - right, bottom: H - 1 - bottom }
  }
}

const out = []
let failed = 0
for (const r of rows) {
  const path = join(IMG, r.image_path)
  let meta
  try { meta = await sharp(path).metadata() } catch { failed++; continue }
  const swap = meta.orientation >= 5 && meta.orientation <= 8
  const W = swap ? meta.height : meta.width
  const H = swap ? meta.width : meta.height
  if (!W || !H) { failed++; continue }

  let raw
  try {
    raw = await sharp(path).rotate().raw().toBuffer({ resolveWithObject: true })
  } catch { failed++; continue }
  const ch = raw.info.channels
  const a = analyse(raw.data, raw.info.width, raw.info.height, ch)

  // Independent cross-check.
  let trimBox = null
  try {
    const t = await sharp(path).rotate().trim({ threshold: 10 }).toBuffer({ resolveWithObject: true })
    trimBox = { width: t.info.width, height: t.info.height }
  } catch { /* trim can fail on a fully uniform image */ }

  const srcAspect = W / H
  const bboxAspect = a.empty ? srcAspect : a.box.width / a.box.height
  const trimmedAreaFrac = a.empty ? 0 : 1 - (a.box.width * a.box.height) / (W * H)

  out.push({
    id: r.id, domain: r.domain, file: r.image_path,
    live: !r.deleted_at && !r.archived_at,
    W, H, format: meta.format,
    bytes: readFileSync(path).length,
    srcAspect: +srcAspect.toFixed(4),
    bbox: a.empty ? null : a.box,
    bboxAspect: +bboxAspect.toFixed(4),
    aspectChange: +(Math.abs(bboxAspect - srcAspect) / srcAspect).toFixed(4),
    trimmedAreaFrac: +trimmedAreaFrac.toFixed(4),
    margins: a.margins ?? null,
    marginFrac: a.margins
      ? {
          left: +(a.margins.left / W).toFixed(4), right: +(a.margins.right / W).toFixed(4),
          top: +(a.margins.top / H).toFixed(4), bottom: +(a.margins.bottom / H).toFixed(4)
        }
      : null,
    ringDev: a.ringDev,
    solidRowFrac: a.solidRowFrac,
    upscaleAtTarget: a.empty
      ? +(TARGET_DEVICE_W / W).toFixed(3)
      : +(TARGET_DEVICE_W / a.box.width).toFixed(3),
    upscaleNative: +(TARGET_DEVICE_W / W).toFixed(3),
    trimCrossCheck: trimBox,
    preview_source: r.preview_source
  })
}

writeFileSync(`${OUT}/reframe.json`, JSON.stringify({ TOL, MIN_FRAC, RING, TARGET_DEVICE_W, out }, null, 2))
console.log(`measured ${out.length} / ${rows.length}   (unreadable: ${failed})`)
console.log(`params: TOL=${TOL} MIN_FRAC=${MIN_FRAC} RING=${RING} TARGET_DEVICE_W=${TARGET_DEVICE_W}`)
