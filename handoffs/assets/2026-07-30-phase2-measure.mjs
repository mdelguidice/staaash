/**
 * Phase 2 — fixed aspect set, bbox used only to CHOOSE the aspect and CENTRE the
 * window. The crop is taken from the full source image, never from the bbox.
 * Measurement only; writes JSON to the scratchpad and nothing else.
 *
 * Window construction, per candidate aspect A:
 *   maxW = min(W, H * A)          largest width whose A-shaped box fits the source
 *   maxH = maxW / A
 *   left = clamp(cx - maxW/2, 0, W - maxW)   centred on the bbox centre, then
 *   top  = clamp(cy - maxH/2, 0, H - maxH)   pushed inside the source bounds
 * Clamping is recorded rather than hidden: a window that had to slide is a window
 * whose centre is no longer the subject's centre.
 */
import { readFileSync, writeFileSync } from 'node:fs'
const OUT = '/private/tmp/claude-501/-Users-mike-staaash/fef7c9b1-8d0d-4fd9-be77-91c9cc421f0b/scratchpad'
const all = JSON.parse(readFileSync(`${OUT}/classified.json`, 'utf8'))

const ASPECTS = [1.91, 1.6, 1.33, 1.0, 0.8]
const TARGET = 730          // 365 CSS px at 2x
const MAX_UPSCALE = 1.3
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function windows(o, marginReq) {
  const { W, H, bbox } = o
  const cx = bbox.left + bbox.width / 2
  const cy = bbox.top + bbox.height / 2

  return ASPECTS.map((A) => {
    const w = Math.min(W, H * A)
    const h = w / A
    const idealLeft = cx - w / 2
    const idealTop = cy - h / 2
    const left = clamp(idealLeft, 0, W - w)
    const top = clamp(idealTop, 0, H - h)

    const shiftX = left - idealLeft
    const shiftY = top - idealTop
    // Where the window's centre actually landed, and whether that point is still
    // on the subject at all.
    const wcx = left + w / 2
    const wcy = top + h / 2
    const centreOnSubject =
      wcx >= bbox.left && wcx <= bbox.left + bbox.width &&
      wcy >= bbox.top && wcy <= bbox.top + bbox.height

    const mL = bbox.left - left
    const mR = left + w - (bbox.left + bbox.width)
    const mT = bbox.top - top
    const mB = top + h - (bbox.top + bbox.height)
    const contains = mL >= 0 && mR >= 0 && mT >= 0 && mB >= 0
    const marginOK =
      mL >= marginReq * w && mR >= marginReq * w &&
      mT >= marginReq * h && mB >= marginReq * h

    const upscale = TARGET / w
    return {
      A, left: Math.round(left), top: Math.round(top),
      w: Math.round(w), h: Math.round(h),
      upscale: +upscale.toFixed(3),
      clamped: Math.abs(shiftX) > 0.5 || Math.abs(shiftY) > 0.5,
      shiftX: +shiftX.toFixed(1), shiftY: +shiftY.toFixed(1),
      centreOnSubject,
      margins: { L: +(mL / w).toFixed(3), R: +(mR / w).toFixed(3), T: +(mT / h).toFixed(3), B: +(mB / h).toFixed(3) },
      contains, marginOK,
      upscaleOK: upscale < MAX_UPSCALE,
      ok: contains && marginOK && upscale < MAX_UPSCALE,
      subjectFracOfCard: +(bbox.width / w).toFixed(3)
    }
  })
}

/** Tightest = smallest crop width, i.e. the subject renders largest. */
export function select(cands) {
  const ok = cands.filter((c) => c.ok).sort((a, b) => a.w - b.w)
  return ok[0] ?? null
}

function run(pool, marginReq) {
  return pool.map((o) => {
    const cands = windows(o, marginReq)
    const sel = select(cands)
    return {
      domain: o.domain, file: o.file, W: o.W, H: o.H,
      bbox: o.bbox,
      centre: { x: +(o.bbox.left + o.bbox.width / 2).toFixed(1), y: +(o.bbox.top + o.bbox.height / 2).toFixed(1) },
      srcAspect: o.srcAspect, bboxAspect: o.bboxAspect,
      subjectFracNative: +(o.bbox.width / o.W).toFixed(3),
      cands, sel,
      // Why nothing was selectable, when nothing was.
      failReason: sel ? null : (() => {
        const fits = cands.filter((c) => c.contains && c.marginOK)
        if (!fits.length) return 'no aspect contains the bbox with the required margin'
        return `margin ok at ${fits.map((c) => c.A).join('/')} but upscale ${fits.map((c) => c.upscale.toFixed(2)).join('/')}x`
      })()
    }
  })
}

const reframe = all.filter((o) => o.bucket === 'reframe' && o.bbox)
const designed = all.filter((o) => o.bucket === 'designed' && o.bbox)

const r10 = run(reframe, 0.10)
const d20 = run(designed, 0.20)
const d10 = run(designed, 0.10)
const r20 = run(reframe, 0.20)

writeFileSync(`${OUT}/p2.json`, JSON.stringify(
  { ASPECTS, TARGET, MAX_UPSCALE, reframe10: r10, reframe20: r20, designed20: d20, designed10: d10 }, null, 2))
console.log(`reframe n=${reframe.length}  designed n=${designed.length}`)
console.log(`selected @10%: reframe ${r10.filter((x) => x.sel).length}/${r10.length}` +
  `   designed ${d10.filter((x) => x.sel).length}/${d10.length}`)
console.log(`selected @20%: reframe ${r20.filter((x) => x.sel).length}/${r20.length}` +
  `   designed ${d20.filter((x) => x.sel).length}/${d20.length}`)
