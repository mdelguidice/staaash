#!/usr/bin/env node
/**
 * staaash visual diff harness
 *
 * Renders each configured screen in the real Electron app under Playwright at
 * the Figma frame's exact width, fetches the corresponding Figma node as a PNG
 * at the configured scale, and reports a pixel delta percentage plus a
 * side-by-side image.
 *
 * This tool is standalone. It reads the app but never writes to it.
 *
 *   node tools/visual-diff/index.mjs [options]
 *
 *   --screen=<id>   Only run one screen from the config (repeatable).
 *   --calibrate     Capture each screen twice and diff the two captures.
 *                   Must be 0.00%; exits non-zero and names what moved if not.
 *   --rects[=a,b]   Print measured layout geometry and exit (for authoring regions).
 *   --refresh       Re-fetch Figma references even if cached. Needs FIGMA_TOKEN.
 *   --config=<path> Use a different config file.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import {
  REPO, c, die, withApp, toRaw, scorePixels, cropRaw, panelSheet, resolveAppEnv,
  stableScreenshot, sampleFlatColors, modalFlatColor
} from './lib.mjs'

const argv = process.argv.slice(2)
const flag = (name) => argv.some((a) => a === `--${name}`)
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}
const onlyScreens = argv.filter((a) => a.startsWith('--screen=')).map((a) => a.slice(9))
const mutateSpecs = argv.filter((a) => a.startsWith('--mutate=')).map((a) => a.slice(9))

/**
 * `--mutate=<selector>:<property>:<value>` — parsed from the RIGHT, so
 * selectors containing colons still work (a:hover:color:red).
 */
function parseMutation(spec) {
  const vi = spec.lastIndexOf(':')
  const rest = vi < 0 ? '' : spec.slice(0, vi)
  const pi = rest.lastIndexOf(':')
  if (vi < 0 || pi < 0) {
    die(`Bad --mutate "${spec}". Expected <selector>:<property>:<value>, e.g.\n` +
        `    --mutate=.sb:padding-left:21px`)
  }
  const selector = rest.slice(0, pi)
  const property = rest.slice(pi + 1)
  const value = spec.slice(vi + 1)
  return {
    spec, selector, property, value,
    css: `${selector} { ${property}: ${value} !important; }`
  }
}

/** `--frame=WxH` overrides a screen's frame. Calibration and mutation runs do
 *  not touch the Figma reference, so the capture size is free there. */
function frameOverride() {
  const raw = opt('frame')
  if (!raw) return null
  const m = /^(\d+)x(\d+)$/.exec(raw.trim())
  if (!m) die(`Bad --frame "${raw}". Expected WxH, e.g. --frame=1439x792`)
  return { width: +m[1], height: +m[2] }
}

const OUT_DIR = join(REPO, 'visual-diff')
const REF_DIR = join(OUT_DIR, 'figma')

/** Default selectors probed by --rects, for authoring `regions` in the config. */
const RECT_SELECTORS = ['.sb', '.topbar', '.content', '.masonry', '.ask-wrap', '.ask']

// ─── Figma reference ─────────────────────────────────────────────────────────

/**
 * Resolve the reference PNG for a screen. Prefers the on-disk cache so the
 * harness runs offline and without a token; falls back to the Figma REST API.
 */
async function getFigmaRef(screen, figma, refresh) {
  const cached = join(REF_DIR, `${screen.id}@${figma.scale}x.png`)
  if (!refresh && existsSync(cached)) return { path: cached, source: 'cache' }

  const token = process.env.FIGMA_TOKEN || process.env.FIGMA_ACCESS_TOKEN
  if (!token) {
    die(
      `No reference PNG for "${screen.id}" at\n    ${relative(REPO, cached)}\n\n` +
        `  Either set FIGMA_TOKEN (a personal access token from\n` +
        `  figma.com → Settings → Security → Personal access tokens) so the\n` +
        `  harness can export it, or drop the PNG at that path by hand\n` +
        `  (export the frame at ${figma.scale}x from Figma).`
    )
  }

  const nodeId = screen.figmaNodeId.replace('-', ':')
  const api =
    `https://api.figma.com/v1/images/${figma.fileKey}` +
    `?ids=${encodeURIComponent(nodeId)}&format=png&scale=${figma.scale}`

  const meta = await fetch(api, { headers: { 'X-Figma-Token': token } })
  if (!meta.ok) die(`Figma API ${meta.status} for ${nodeId}: ${await meta.text()}`)
  const body = await meta.json()
  if (body.err) die(`Figma API error for ${nodeId}: ${body.err}`)
  const url = body.images?.[nodeId]
  if (!url) die(`Figma returned no image for node ${nodeId}. Is the node id right?`)

  const png = await fetch(url)
  if (!png.ok) die(`Could not download the Figma export: HTTP ${png.status}`)
  await mkdir(REF_DIR, { recursive: true })
  await writeFile(cached, Buffer.from(await png.arrayBuffer()))
  return { path: cached, source: 'figma-api' }
}

// ─── calibration ─────────────────────────────────────────────────────────────

/**
 * Map differing pixels back to the elements underneath them, so a non-zero
 * calibration says *what* moved rather than just how much.
 */
async function describeChanges(page, mask, W, H, scale) {
  const BLOCK = 16
  const points = []
  for (let by = 0; by < H; by += BLOCK) {
    for (let bx = 0; bx < W; bx += BLOCK) {
      let hit = false
      for (let y = by; y < Math.min(by + BLOCK, H) && !hit; y++) {
        for (let x = bx; x < Math.min(bx + BLOCK, W); x++) {
          if (mask[(y * W + x) * 4 + 3] !== 0) { hit = true; break }
        }
      }
      if (hit) points.push([(bx + BLOCK / 2) / scale, (by + BLOCK / 2) / scale])
    }
  }
  if (!points.length) return []

  // The stabilise pass sets pointer-events:none on everything, which makes
  // elementFromPoint return <html> for every probe. Capture is finished by now,
  // so put hit testing back before naming anything.
  await page.addStyleTag({ content: '* { pointer-events: auto !important; }' })

  // One round trip: name the element under each differing block.
  const named = await page.evaluate((pts) => {
    const label = (el) => {
      if (!el) return 'nothing'
      const cls = typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).join('.')
        : ''
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
      return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text}"` : ''}`
    }
    return pts.map(([x, y]) => label(document.elementFromPoint(x, y)))
  }, points.slice(0, 4000))

  const tally = new Map()
  named.forEach((n, i) => {
    const e = tally.get(n) || { label: n, blocks: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1 }
    e.blocks++
    const [x, y] = points[i]
    e.x0 = Math.min(e.x0, Math.round(x)); e.y0 = Math.min(e.y0, Math.round(y))
    e.x1 = Math.max(e.x1, Math.round(x)); e.y1 = Math.max(e.y1, Math.round(y))
    tally.set(n, e)
  })
  return [...tally.values()].sort((a, b) => b.blocks - a.blocks)
}

/**
 * Are two captures the same image, exactly?
 *
 * "Exactly" means every RGBA byte — deliberately NOT `scorePixels`. The
 * capture-agreement question is "is the harness reproducible", which admits no
 * tolerance, whereas the scoring comparator is tuned to ignore differences on
 * purpose: `threshold: 0.1` discards any colour distance below ~26/255, and
 * `includeAA: false` discards pixels it classifies as anti-aliased — most of
 * the edges that a small layout shift moves. A gate built on that comparator is
 * strictly weaker than the one the diff path already enforces.
 *
 * PNG byte equality is the fast path. A mismatch there is re-checked against
 * decoded pixels, so a nondeterministic encoder can never manufacture a
 * disagreement out of identical images.
 */
async function compareCaptures(pngA, pngB, W, H, defaults) {
  if (pngA.equals(pngB)) {
    return {
      identical: true, exactDiffPixels: 0, scoredDiffPixels: 0,
      percent: 0, total: W * H, mask: null
    }
  }
  const a = await toRaw(pngA, W, H)
  const b = await toRaw(pngB, W, H)
  // Mark every byte-differing pixel. This, not the pixelmatch mask, is what
  // gets localised and saved: a difference small enough for pixelmatch to
  // discard still has to be findable, or the failure is undiagnosable.
  const mask = Buffer.alloc(a.data.length)
  let exactDiffPixels = 0
  for (let i = 0; i < a.data.length; i += 4) {
    if (
      a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] ||
      a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]
    ) {
      exactDiffPixels++
      mask[i] = 255; mask[i + 3] = 255
    }
  }
  const scored = scorePixels(a.data, b.data, W, H, defaults)
  return {
    identical: exactDiffPixels === 0,
    exactDiffPixels,
    scoredDiffPixels: scored.mismatched,
    percent: scored.percent,
    total: scored.total,
    mask
  }
}

async function calibrateScreen(screen, cfg, configDir) {
  const scale = cfg.figma.scale
  const W = screen.frame.width * scale
  const H = screen.frame.height * scale

  // Two independent launches — this asks "does re-running the harness give the
  // same answer?", which is the property that matters. A second capture from
  // the same session would miss anything that varies at startup.
  const first = await withApp({ cfg, screen, configDir }, async ({ page }) => {
    const s = await stableScreenshot(page)
    if (!s.settledAfter) console.warn(c.yellow('    ! run A never stopped repainting'))
    return s.png
  })

  return await withApp({ cfg, screen, configDir }, async ({ page, settled }) => {
    const s = await stableScreenshot(page)
    if (!s.settledAfter) console.warn(c.yellow('    ! run B never stopped repainting'))
    const second = s.png
    const cmp = await compareCaptures(first, second, W, H, cfg.defaults)
    const changes = cmp.identical ? [] : await describeChanges(page, cmp.mask, W, H, scale)
    return { first, second, changes, settled, ...cmp }
  })
}

/** CSS properties pulled off each RECT_SELECTORS element for the token audit. */
const STYLE_PROPS = [
  'color', 'background-color', 'border-top-color', 'border-bottom-color',
  'border-left-color', 'border-right-color', 'font-family', 'font-size',
  'font-weight', 'border-radius', 'padding'
]

const normHex = (v) => {
  if (!v) return null
  const s = String(v).trim().toLowerCase()
  let m = /^#([0-9a-f]{6})$/.exec(s)
  if (m) return `#${m[1]}`
  m = /^#([0-9a-f]{3})$/.exec(s)
  if (m) return '#' + m[1].split('').map((ch) => ch + ch).join('')
  m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(s)
  if (m) {
    // A fully transparent background is not a colour — reporting rgba(0,0,0,0)
    // as "#000000 matches no token" would be a false positive on every element
    // that simply inherits its background.
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null
    return '#' + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, '0')).join('')
  }
  return null
}

/** Read :root custom properties and per-element computed styles from the page. */
async function collectStyles(page, selectors, varNames, extraProps = []) {
  return page.evaluate(
    ({ sels, props, vars }) => {
      const rootCS = getComputedStyle(document.documentElement)
      const tokens = Object.fromEntries(
        vars.map((v) => [v, rootCS.getPropertyValue(v).trim() || null])
      )
      const elements = {}
      const rects = {}
      for (const sel of sels) {
        const el = document.querySelector(sel)
        if (!el) { elements[sel] = null; rects[sel] = null; continue }
        const cs = getComputedStyle(el)
        elements[sel] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p).trim()]))

        // Composited background: walk up compositing background-color until an
        // opaque layer is reached. getComputedStyle returns the *declared*
        // colour, so a translucent fill like the sidebar reads as
        // rgba(246,243,243,0.01) — nothing like the #0a0a0a it actually paints.
        // The colour sampler sees the painted result, so without this the two
        // checks can never agree on a value and `confirmed` is unreachable.
        const parse = (v) => {
          const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(v || '')
          return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : parseFloat(m[4])] : null
        }
        const layers = []
        for (let n = el; n; n = n.parentElement) {
          const p = parse(getComputedStyle(n).backgroundColor)
          if (!p || p[3] === 0) continue
          layers.push(p)
          if (p[3] >= 1) break
        }
        let out = layers.length && layers[layers.length - 1][3] >= 1
          ? layers.pop().slice(0, 3)
          : [0, 0, 0]
        while (layers.length) {
          const f = layers.pop()
          out = [0, 1, 2].map((i) => f[i] * f[3] + out[i] * (1 - f[3]))
        }
        elements[sel]._effectiveBackground =
          '#' + out.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

        const b = el.getBoundingClientRect()
        // right/bottom are carried explicitly so a spec can assert the edge that
        // is actually anchored. For a text-sized box pinned to a trailing edge,
        // x is width-dependent and right is not — asserting x there measures
        // glyph metrics, which is the same mistake as asserting the width.
        rects[sel] = {
          x: +b.x.toFixed(2), y: +b.y.toFixed(2),
          width: +b.width.toFixed(2), height: +b.height.toFixed(2),
          right: +(b.x + b.width).toFixed(2), bottom: +(b.y + b.height).toFixed(2)
        }

        // Is a fixed-position overlay covering this element? The `painted`
        // _effectiveBackground method samples the capture, so a scrim over the
        // element silently returns the SCRIM's composited colour instead of the
        // element's — the sidebar reads #050505 under the settings scrim and
        // #080809 under the drawer scrim, neither of which is a real drift.
        // Only `position: fixed` counts: that is what overlays are, and
        // absolutely-positioned siblings inside a scroller are not.
        const cx = b.x + b.width / 2
        const cy = b.y + b.height / 2
        let occludedBy = null
        for (const n of document.querySelectorAll('*')) {
          if (n === el || n.contains(el) || el.contains(n)) continue
          const ncs = getComputedStyle(n)
          if (ncs.position !== 'fixed') continue
          if (ncs.visibility === 'hidden' || ncs.display === 'none') continue
          const bgA = parse(ncs.backgroundColor)
          const paints =
            (bgA && bgA[3] > 0) ||
            (ncs.backdropFilter && ncs.backdropFilter !== 'none') ||
            (ncs.webkitBackdropFilter && ncs.webkitBackdropFilter !== 'none')
          if (!paints) continue
          const nb = n.getBoundingClientRect()
          if (nb.width <= 0 || nb.height <= 0) continue
          if (nb.x <= cx && nb.y <= cy && nb.right >= cx && nb.bottom >= cy) {
            const cls = typeof n.className === 'string' && n.className.trim()
              ? '.' + n.className.trim().split(/\s+/).join('.')
              : ''
            occludedBy = n.tagName.toLowerCase() + cls
            break
          }
        }
        elements[sel]._occludedBy = occludedBy
      }
      return { tokens, elements, rects }
    },
    { sels: selectors, props: [...new Set([...STYLE_PROPS, ...extraProps])], vars: varNames }
  )
}

/**
 * Diff computed styles against properties read out of Figma.
 *
 * The token audit only covers :root variables. This covers what an element
 * actually paints and how big it is — background, border, radius, shadow, box
 * size — against the layer properties from `get_design_context`/`get_metadata`,
 * committed to visual-diff/figma/<screen>.styles.json.
 *
 * Colours are compared channel-for-channel including alpha; lengths as
 * normalised strings; rects to within half a pixel.
 */
function auditStyles(styles, spec, paintedBg = null) {
  const findings = []
  const skipped = []
  for (const [sel, want] of Object.entries(spec.selectors || {})) {
    for (const [prop, why] of Object.entries(want._skipped || {})) {
      skipped.push({ selector: sel, property: prop, reason: why })
    }

    const got = styles.elements[sel]
    if (!got) {
      findings.push({
        selector: sel, property: '(element)', expected: 'present', actual: 'not found', source: null
      })
      continue
    }

    if (want._effectiveBackground) {
      const decl = want._effectiveBackground
      const expected = typeof decl === 'object' ? decl.value : decl
      // method: 'painted' reads the modal flat colour actually rendered inside
      // the element — required for translucent fills, because Chromium's
      // blending does not match arithmetic compositing (2% white over #080808
      // computes to #0d0d0d but paints #0c0c0c) and only the painted value can
      // match what the colour sampler sees. Only valid where the element's
      // interior really is its own background; on a container full of cards the
      // modal colour is a card, not the canvas. Default is 'computed'.
      const method = (typeof decl === 'object' && decl.method) || 'computed'
      const actual = method === 'painted'
        ? (paintedBg ? paintedBg(sel) : null) || got._effectiveBackground
        : got._effectiveBackground
      // The painted method reads the capture, so anything drawn on top of the
      // element is what gets sampled. Under a scrim the answer is the scrim,
      // not a drift — skip loudly rather than reporting a colour the element
      // never painted.
      if (method === 'painted' && got._occludedBy) {
        skipped.push({
          selector: sel,
          property: 'effective background',
          reason:
            `method "painted" samples the capture, and ${got._occludedBy} (position: fixed) ` +
            `covers this element on this screen, so the sample would be the overlay's ` +
            `composited colour rather than the element's. Not comparable — assert it on a ` +
            `screen with no overlay, or give this screen its own spec with method "computed".`
        })
      } else if (normHex(expected) !== normHex(actual)) {
        findings.push({
          selector: sel, property: 'effective background',
          expected, actual,
          source: typeof decl === 'object' ? decl.source : null,
          isColour: true,
          expectedHex: normHex(expected), actualHex: normHex(actual)
        })
      }
    }

    for (const [prop, decl] of Object.entries(want)) {
      if (prop.startsWith('_')) continue
      const expected = typeof decl === 'object' && decl !== null ? decl.value : decl
      const source = typeof decl === 'object' && decl !== null ? decl.source : null
      const actual = got[prop]
      if (actual === undefined) continue
      const ea = parseRgba(expected), aa = parseRgba(actual)
      const same = ea && aa
        ? ea.slice(0, 3).every((v, i) => v === aa[i]) && Math.abs(ea[3] - aa[3]) < 0.0005
        : String(expected).replace(/\s+/g, ' ').trim() === String(actual).replace(/\s+/g, ' ').trim()
      if (!same) {
        findings.push({
          selector: sel, property: prop, expected, actual, source,
          isColour: !!(ea && aa),
          expectedHex: ea ? normHex(expected) : null,
          actualHex: aa ? normHex(actual) : null
        })
      }
    }

    if (want._rect) {
      const r = styles.rects[sel]
      // `_adjust` corrects a Figma coordinate for a CSS layout fact Figma does
      // not model — currently only the stroke rule (see _strokeRule in the spec
      // and "Strokes and layout" in the README). The raw Figma number stays in
      // the file; only the comparison uses the adjusted one, and the finding
      // reports both so an adjustment can never quietly hide a real drift.
      const adj = want._rect._adjust || {}
      for (const dim of ['x', 'y', 'width', 'height', 'right', 'bottom']) {
        if (want._rect[dim] == null || !r) continue
        const delta = typeof adj[dim] === 'number' ? adj[dim] : 0
        const expected = want._rect[dim] + delta
        if (Math.abs(r[dim] - expected) > 0.5) {
          findings.push({
            selector: sel, property: dim,
            expected: `${expected}px`, actual: `${r[dim]}px`,
            source: want._rect.source || 'get_metadata', isColour: false,
            ...(delta ? { figmaRaw: `${want._rect[dim]}px`, adjustment: delta, adjustmentWhy: adj._why ?? null } : {})
          })
        }
      }
    }
  }
  return { findings, skipped }
}

/**
 * Decide whether a colour-check finding is independently supported.
 *
 * The flat-colour sampler cannot tell "same element, wrong colour" from
 * "different element, similar colour" — it only sees pixels. So a finding is
 * only reported once the style audit, which reads the DOM, agrees something is
 * actually wrong there. Everything else is a lead, not a finding.
 *
 *   confirmed    a style finding on a colour property with the same two values
 *   corroborated a style finding on an element overlapping this region
 *   lead         nothing independent supports it
 */
function corroborate(pair, region, styleFindings, rects) {
  // TYPE GATE: only a style finding on a COLOUR property is evidence about a
  // colour. A positional finding that happens to sit under the sample is not —
  // "#b9e900→#baeb00 corroborated by .sb-count x" said nothing about colour, it
  // only said a box near that colour had moved.
  const colourFindings = styleFindings.filter((f) => f.isColour)

  const exact = colourFindings.find(
    (f) => f.expectedHex === pair.figma && f.actualHex === pair.app
  )
  if (exact) {
    return { level: 'confirmed', by: `${exact.selector} ${exact.property}`, match: 'value' }
  }

  // Overlap is tested against where this colour pair was actually sampled, not
  // the whole region — otherwise one style finding vouches for every colour
  // difference anywhere near it, which is not corroboration.
  const b = pair.box
  const overlapping = b && colourFindings.find((f) => {
    const r = rects[f.selector]
    if (!r) return false
    return (
      r.x < b.x1 && r.x + r.width > b.x0 &&
      r.y < b.y1 && r.y + r.height > b.y0
    )
  })
  if (overlapping) {
    // Two tiers, not three. Once only colour findings can corroborate, the old
    // middle tier said "a colour assertion on an overlapping element failed" —
    // which is the same claim as `confirmed`, differing only in whether the two
    // checks named the identical hex pair. That distinction is recorded as
    // `match` rather than as a separate level.
    return { level: 'confirmed', by: `${overlapping.selector} ${overlapping.property}`, match: 'element' }
  }
  return { level: 'lead', by: null, match: null }
}

const rgbOf = (h) => {
  const v = normHex(h)
  return v ? [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) : null
}

/**
 * Resolve what a tokenMap entry says the app *should* be painting.
 *
 * Three forms:
 *   'ink/500'                                  → a Figma variable, compared as hex
 *   { color, alpha, over: 'ink/500' }          → a translucent fill composited
 *                                                over a base token, compared as
 *                                                the resulting flat hex
 *   { color, alpha }                           → a translucent value compared as
 *                                                rgba, channel for channel
 *
 * The composite form matters because a design can specify a colour that never
 * exists as a token: "#F6F3F3 at 1% over #080808" renders #0a0a0a, and an app
 * that hardcodes a hand-flattened approximation of it will drift by a level or
 * two — far below anything pixelmatch can see.
 */
function resolveExpected(spec, figmaVars) {
  if (typeof spec === 'string') {
    const raw = figmaVars[spec]
    return { label: spec, hex: normHex(raw), raw: raw ?? null }
  }
  if (spec && spec.color && spec.alpha != null) {
    const fg = rgbOf(spec.color)
    if (!fg) return { label: String(spec.color), error: 'fill is not a colour' }
    if (spec.over) {
      const bg = rgbOf(figmaVars[spec.over])
      if (!bg) return { label: `over ${spec.over}`, error: `base token ${spec.over} not found` }
      const mixed = fg.map((f, i) => Math.round(f * spec.alpha + bg[i] * (1 - spec.alpha)))
      const hex = '#' + mixed.map((v) => v.toString(16).padStart(2, '0')).join('')
      // Two implementations are equally correct: pre-flattened to the composite
      // hex, or declared layered and composited by the browser. Accept both —
      // insisting on the flattened form would flag the layered one, which is
      // the better implementation because it survives a canvas change.
      return {
        label: `${spec.color} @${spec.alpha * 100}% over ${spec.over}`,
        hex,
        alsoAccept: [...fg, spec.alpha],
        raw: `${hex} (or rgba(${fg.join(', ')}, ${spec.alpha}) layered)`,
        composite: true
      }
    }
    return {
      label: `${spec.color} @${spec.alpha * 100}%`,
      rgba: [...fg, spec.alpha],
      raw: `rgba(${fg.join(', ')}, ${spec.alpha})`
    }
  }
  return { label: JSON.stringify(spec), error: 'unrecognised tokenMap entry' }
}

/** Parse an app value into [r,g,b,a] for comparison against an alpha spec. */
function parseRgba(v) {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(String(v).trim())
  if (!m) {
    const hex = rgbOf(v)
    return hex ? [...hex, 1] : null
  }
  return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : parseFloat(m[4])]
}

/**
 * Compare the app's design tokens against the Figma variables exactly.
 *
 * Deliberately independent of pixel diffing: a token can be wrong by an amount
 * pixelmatch structurally cannot see (below ~27/255), and it can be wrong on an
 * element that is not even visible in this frame. Reported regardless of pixel
 * impact, which is the point.
 */
function auditTokens(styles, figmaVars, tokenMap) {
  const mapped = []
  for (const [cssVar, spec] of Object.entries(tokenMap || {})) {
    const appRaw = styles.tokens[cssVar]
    const want = resolveExpected(spec, figmaVars)
    const entry = {
      cssVar, expects: want.label, composite: !!want.composite,
      app: appRaw ?? null, figma: want.raw ?? null, match: false, reason: null
    }

    if (want.error) entry.reason = want.error
    else if (!appRaw) entry.reason = 'css var not defined'
    else if (want.rgba) {
      const got = parseRgba(appRaw)
      if (!got) entry.reason = 'app value is not a colour'
      else {
        const sameRGB = got.slice(0, 3).every((v, i) => v === want.rgba[i])
        const sameA = Math.abs(got[3] - want.rgba[3]) < 0.0005
        entry.match = sameRGB && sameA
        if (!entry.match) entry.reason = sameRGB ? 'alpha differs' : 'value differs'
      }
    } else if (!want.hex) entry.reason = 'figma token not found'
    else {
      const appHex = normHex(appRaw)
      const appRgba = parseRgba(appRaw)
      // A layered declaration (alpha < 1) is checked against the fill+alpha the
      // spec names; an opaque one against the composited result.
      if (want.alsoAccept && appRgba && appRgba[3] < 1) {
        entry.match =
          appRgba.slice(0, 3).every((v, i) => v === want.alsoAccept[i]) &&
          Math.abs(appRgba[3] - want.alsoAccept[3]) < 0.0005
        entry.layered = true
        if (!entry.match) entry.reason = 'layered value differs'
      } else if (!appHex) entry.reason = 'app value is not a comparable colour'
      else {
        entry.match = appHex === want.hex
        if (!entry.match) {
          const a = rgbOf(appHex), b = rgbOf(want.hex)
          entry.delta = a && b ? a.map((v, i) => v - b[i]) : null
          entry.reason = 'value differs'
        }
      }
    }
    mapped.push(entry)
  }

  // Every colour actually painted by the probed elements, matched back to a
  // token by value. Anything unmatched is a hardcoded or drifted colour.
  const byValue = new Map()
  for (const [name, val] of Object.entries(figmaVars)) {
    const h = normHex(val)
    if (h && !byValue.has(h)) byValue.set(h, name)
  }
  const unmatched = []
  for (const [sel, props] of Object.entries(styles.elements)) {
    if (!props) continue
    for (const [prop, val] of Object.entries(props)) {
      if (!prop.includes('color')) continue
      const h = normHex(val)
      if (!h) continue // transparent / currentColor / non-colour
      if (!byValue.has(h)) unmatched.push({ selector: sel, property: prop, value: h })
    }
  }

  const usedTokens = new Set(Object.values(tokenMap || {}))
  const unusedFigmaTokens = Object.keys(figmaVars).filter((n) => !usedTokens.has(n))

  return { mapped, unmatched, unusedFigmaTokens }
}

/** Score every configured region between two raw RGBA buffers. */
function scoreRegions(aData, bData, screen, W, H, scale, defaults) {
  const out = []
  for (const r of screen.regions || []) {
    const rx = r.x * scale, ry = r.y * scale
    const rw = Math.min(r.width * scale, W - rx)
    const rh = Math.min(r.height * scale, H - ry)
    if (rw <= 0 || rh <= 0) continue
    const s = scorePixels(
      cropRaw(aData, W, rx, ry, rw, rh), cropRaw(bData, W, rx, ry, rw, rh), rw, rh, defaults
    )
    out.push({
      name: r.name, diffPixels: s.mismatched, totalPixels: s.total,
      diffPercent: +s.percent.toFixed(3),
      ...(r.caveat ? { caveat: r.caveat } : {})
    })
  }
  return out
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const configPath = resolve(REPO, opt('config') || 'visual-diff.config.mjs')
  if (!existsSync(configPath)) die(`Config not found: ${configPath}`)
  const configDir = resolve(configPath, '..')
  const cfg = (await import(pathToFileURL(configPath).href)).default

  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(REF_DIR, { recursive: true })

  const screens = cfg.screens.filter((s) => !onlyScreens.length || onlyScreens.includes(s.id))
  if (!screens.length) {
    die(`No screens matched. Config defines: ${cfg.screens.map((s) => s.id).join(', ')}`)
  }

  const { fixtureHome } = resolveAppEnv(cfg, configDir)
  const dataNote = fixtureHome
    ? `fixture ${relative(REPO, fixtureHome)}`
    : c.yellow('REAL library (~/Library/Application Support/staaash)')

  const fo = frameOverride()
  const mutations = mutateSpecs.map(parseMutation)
  const mode = flag('calibrate')
    ? 'calibrate'
    : mutations.length
      ? 'mutate'
      : flag('rects') || opt('rects')
        ? 'rects'
        : 'diff'
  console.log(
    `\n${c.bold(`visual diff${mode === 'diff' ? '' : ` · ${mode}`}`)} ` +
      `${c.dim(`· ${screens.length} screen(s) · ${dataNote}`)}\n`
  )

  const results = []
  let failed = false

  for (const rawScreen of screens) {
    const screen = fo ? { ...rawScreen, frame: fo } : rawScreen
    const { width, height } = screen.frame
    const scale = cfg.figma.scale
    const W = width * scale
    const H = height * scale
    process.stdout.write(`  ${c.bold(screen.id)} ${c.dim(`(${width}×${height} @${scale}x)`)}\n`)

    // ── --rects ──────────────────────────────────────────────────────────────
    if (mode === 'rects') {
      const extra = (opt('rects') || '').split(',').map((s) => s.trim()).filter(Boolean)
      const sels = [...new Set([...RECT_SELECTORS, ...extra])]
      const rects = await withApp({ cfg, screen, configDir }, ({ page }) =>
        page.evaluate(
          (list) =>
            Object.fromEntries(
              list.map((s) => {
                const el = document.querySelector(s)
                if (!el) return [s, null]
                const b = el.getBoundingClientRect()
                return [s, {
                  x: Math.round(b.x), y: Math.round(b.y),
                  width: Math.round(b.width), height: Math.round(b.height)
                }]
              })
            ),
          sels
        )
      )
      console.log(`    ${c.dim('measured CSS-px rects (frame coords):')}`)
      for (const [sel, r] of Object.entries(rects)) {
        console.log(`      ${sel.padEnd(10)} ${r ? JSON.stringify(r) : c.dim('not present')}`)
      }
      console.log()
      continue
    }

    // ── --mutate ─────────────────────────────────────────────────────────────
    if (mode === 'mutate') {
      const cap = async (extraCss) =>
        withApp({ cfg, screen, configDir, extraCss }, async ({ page }) => {
          const s = await stableScreenshot(page)
          if (!s.settledAfter) console.warn(c.yellow('    ! never stopped repainting'))
          return s.png
        })

      const baselinePng = await cap(null)
      const base = await toRaw(baselinePng, W, H)
      process.stdout.write(`    ${c.dim('baseline captured')}\n`)

      // Only meaningful against Figma when the frame was not overridden.
      let fig = null
      let figBase = null
      if (!fo) {
        const ref = await getFigmaRef(screen, cfg.figma, false)
        fig = await toRaw(await readFile(ref.path), W, H)
        figBase = scorePixels(fig.data, base.data, W, H, cfg.defaults).percent
      }

      const rows = []
      for (const m of mutations) {
        const png = await cap(m.css)
        const mut = await toRaw(png, W, H)
        const vsBase = scorePixels(base.data, mut.data, W, H, cfg.defaults)
        const regions = scoreRegions(base.data, mut.data, screen, W, H, scale, cfg.defaults)
        const vsFig = fig ? scorePixels(fig.data, mut.data, W, H, cfg.defaults).percent : null
        const figRegions = fig
          ? scoreRegions(fig.data, mut.data, screen, W, H, scale, cfg.defaults)
          : []

        const tint = vsBase.percent === 0 ? c.red : vsBase.percent < 0.1 ? c.yellow : c.green
        process.stdout.write(
          `    ${c.bold(`${m.selector} { ${m.property}: ${m.value} }`)}\n` +
            `      vs baseline ${tint(`${vsBase.percent.toFixed(3)}%`)} ` +
            `${c.dim(`(${vsBase.diffPixels ?? vsBase.mismatched} px)`)}  ` +
            regions.map((r) => `${r.name} ${r.diffPercent.toFixed(3)}%`).join('  ') + `\n`
        )
        if (vsFig !== null) {
          process.stdout.write(
            `      vs figma    ${vsFig.toFixed(3)}% ${c.dim(`(unmutated ${figBase.toFixed(3)}%)`)}  ` +
              figRegions.map((r) => `${r.name} ${r.diffPercent.toFixed(3)}%`).join('  ') + `\n`
          )
        }

        rows.push({
          selector: m.selector, property: m.property, value: m.value,
          vsBaseline: { diffPixels: vsBase.mismatched, diffPercent: +vsBase.percent.toFixed(4), regions },
          vsFigma: vsFig === null ? null : { diffPercent: +vsFig.toFixed(4), regions: figRegions }
        })
      }

      await writeFile(
        join(OUT_DIR, `${screen.id}.mutations.json`),
        JSON.stringify(
          { screen: screen.id, frame: screen.frame, figmaBaselinePercent: figBase, mutations: rows },
          null, 2
        ) + '\n'
      )
      process.stdout.write(`    ${c.dim(`→ ${relative(REPO, join(OUT_DIR, `${screen.id}.mutations.json`))}`)}\n\n`)
      continue
    }

    // ── --calibrate ──────────────────────────────────────────────────────────
    if (mode === 'calibrate') {
      const r = await calibrateScreen(screen, cfg, configDir)
      // Byte-exact, matching the diff path's own capture-agreement gate. The
      // scored percentage is printed alongside, because the gap between the two
      // numbers is the interesting part: pixels that differ but score zero are
      // exactly what a tolerance-based gate would wave through.
      const clean = r.identical
      process.stdout.write(
        `    exact  ${clean ? c.green('identical') : c.red(`${r.exactDiffPixels.toLocaleString()} px differ`)} ` +
          `${c.dim(`(of ${r.total.toLocaleString()}, two launches)`)}\n`
      )
      if (!clean) {
        process.stdout.write(
          `    scored ${c.dim(`${r.percent.toFixed(2)}% (${r.scoredDiffPixels.toLocaleString()} px) after threshold ${cfg.defaults.threshold} / includeAA ${cfg.defaults.includeAA === true}`)}` +
            `${r.scoredDiffPixels === 0 ? c.yellow('  ← scored zero: a tolerance-based gate would have passed this') : ''}\n`
        )
      }

      if (!clean) {
        failed = true
        process.stdout.write(`    ${c.red('captures are not reproducible. what changed:')}\n`)
        for (const ch of r.changes.slice(0, 12)) {
          process.stdout.write(
            `      ${c.dim(`${String(ch.blocks).padStart(4)} blk`)}  ${ch.label}\n` +
              `      ${c.dim(`           at ${ch.x0},${ch.y0} → ${ch.x1},${ch.y1} css px`)}\n`
          )
        }
        if (r.changes.length > 12) {
          process.stdout.write(`      ${c.dim(`… and ${r.changes.length - 12} more`)}\n`)
        }
        // Keep both frames so a failure can be inspected at full resolution.
        await writeFile(join(OUT_DIR, `${screen.id}.calibrate.a.png`), r.first)
        await writeFile(join(OUT_DIR, `${screen.id}.calibrate.b.png`), r.second)
        const sheet = join(OUT_DIR, `${screen.id}.calibrate.png`)
        await writeFile(
          sheet,
          await panelSheet(
            [
              { title: 'Run A', sub: 'first launch', buf: r.first },
              { title: 'Run B', sub: 'second launch', buf: r.second },
              {
                title: 'Delta',
                sub: `${r.exactDiffPixels.toLocaleString()} px differ between runs`,
                buf: await sharp(r.mask, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
              }
            ],
            W, H
          )
        )
        process.stdout.write(`    ${c.dim(`→ ${relative(REPO, sheet)}`)}\n`)
      }
      process.stdout.write('\n')
      continue
    }

    // ── default: diff against Figma ──────────────────────────────────────────
    const cachedRef = join(REF_DIR, `${screen.id}@${scale}x.png`)
    const hasNode = screen.figmaNodeId != null
    let ref = null
    if (hasNode || existsSync(cachedRef)) {
      ref = await getFigmaRef(screen, cfg.figma, flag('refresh'))
      process.stdout.write(`    figma    ${c.dim(ref.source)}\n`)
    } else {
      process.stdout.write(
        `    figma    ${c.yellow('no reference')} ${c.dim('(figmaNodeId is null — pixel delta skipped)')}\n`
      )
    }

    // Capture twice, in two separate launches. A delta is only worth reporting
    // if the capture it came from is reproducible, so disagreement is fatal for
    // that screen rather than a footnote.
    const captureOnce = () =>
      withApp({ cfg, screen, configDir }, async ({ page, settled }) => {
        const shot = await stableScreenshot(page)
        const specSels = Object.keys(styleSpec?.selectors || {})
        const specProps = Object.values(styleSpec?.selectors || {})
          .flatMap((v) => Object.keys(v).filter((k) => !k.startsWith('_')))
        const styles = await collectStyles(
          page,
          [...new Set([...RECT_SELECTORS, ...specSels])],
          Object.keys(cfg.tokenMap || {}),
          specProps
        )
        return { png: shot.png, settled, settledAfter: shot.settledAfter, styles }
      })

    const stylePath = [
      join(REF_DIR, `${screen.id}.styles.json`),
      join(REF_DIR, 'everything.styles.json')
    ].find((p2) => existsSync(p2))
    const styleSpec = stylePath ? JSON.parse(await readFile(stylePath, 'utf8')) : null

    const capA = await captureOnce()
    let agreement = { captures: 1, identical: null, diffPixels: null }

    if (!flag('single-capture')) {
      const capB = await captureOnce()
      // Same comparator as --calibrate, so the two gates cannot disagree about
      // what "reproducible" means.
      const cmp = await compareCaptures(capA.png, capB.png, W, H, cfg.defaults)
      const identical = cmp.identical
      agreement = {
        captures: 2,
        identical,
        diffPixels: cmp.exactDiffPixels,
        scoredDiffPixels: cmp.scoredDiffPixels
      }
      if (!identical) {
        // Keep both frames and the mask — refusing to report without saving
        // anything makes the failure undiagnosable. This is what made the 20px
        // scroll shift traceable.
        const mask = cmp.mask
        await writeFile(join(OUT_DIR, `${screen.id}.capture-a.png`), capA.png)
        await writeFile(join(OUT_DIR, `${screen.id}.capture-b.png`), capB.png)
        await writeFile(
          join(OUT_DIR, `${screen.id}.capture-diff.png`),
          await sharp(mask, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
        )
        agreement.artifacts = [`${screen.id}.capture-a.png`, `${screen.id}.capture-b.png`, `${screen.id}.capture-diff.png`]
      }
      process.stdout.write(
        `    capture  ${identical ? c.green('2/2 identical') : c.red(`2 captures DISAGREE (${cmp.exactDiffPixels.toLocaleString()} px exact, ${cmp.scoredDiffPixels.toLocaleString()} scored)`)}\n`
      )
      if (!identical) {
        failed = true
        process.stdout.write(
          `    ${c.red('refusing to report a delta for this screen')} ` +
            `${c.dim('— run --calibrate to see what moved')}\n\n`
        )
        results.push({
          id: screen.id,
          figmaNodeId: screen.figmaNodeId ?? null,
          frame: screen.frame,
          window: { requested: [width, height], settled: capA.settled },
          captureAgreement: agreement,
          styleAudit: null,
          colourCheck: null,
          tokenAudit: null,
          debug: { pixelDelta: null },
          skipped: 'captures disagreed'
        })
        continue
      }
    }

    const shotPng = capA.png
    const settled = capA.settled
    const settledAfter = capA.settledAfter
    if (!settledAfter) {
      console.warn(c.yellow('    ! page never stopped repainting'))
    }

    // ── computed style vs Figma layer properties ─────────────────────────────
    // Runs before the colour check, which is gated on it.
    const appRaw = await toRaw(shotPng, W, H)
    const paintedBg = (sel) => {
      const r = capA.styles.rects[sel]
      if (!r || r.width <= 0 || r.height <= 0) return null
      return modalFlatColor(appRaw.data, W, H, r, scale)?.hex || null
    }
    let styleAudit = null
    if (styleSpec) styleAudit = auditStyles(capA.styles, styleSpec, paintedBg)
    const styleFindings = styleAudit?.findings ?? []

    // ── pixel delta (only possible with a reference) ─────────────────────────
    let percent = null, mismatched = null, total = null
    let regions = []
    let colourCheck = []
    let resampled = null
    let paths = null

    if (ref) {
      const figmaPng = await readFile(ref.path)
      const a = await toRaw(figmaPng, W, H)
      const b = appRaw
      if (a.resampled) console.warn(c.yellow(`    ! figma ref was ${a.from}, resampled to ${W}×${H}`))
      if (b.resampled) console.warn(c.yellow(`    ! app shot was ${b.from}, resampled to ${W}×${H}`))
      resampled = {
        figma: { resampled: a.resampled, source: a.from },
        app: { resampled: b.resampled, source: b.from }
      }

      const scored = scorePixels(a.data, b.data, W, H, cfg.defaults)
      percent = scored.percent; mismatched = scored.mismatched; total = scored.total
      regions = scoreRegions(a.data, b.data, screen, W, H, scale, cfg.defaults)

      // Exact colour comparison, independent of pixelmatch's threshold.
      //
      // Gated on the style audit. The sampler only sees pixels, so it cannot
      // tell "same element, wrong colour" from "different element, similar
      // colour" — magnitude was a poor proxy for that and is gone. A pair is
      // only a finding once the DOM-reading style audit independently agrees
      // something is wrong there; everything else is a lead.
      for (const r of screen.regions || []) {
        const s = sampleFlatColors(a.data, b.data, W, H, r, scale)
        const scored = s.pairs
          .filter((p) => p.maxDelta > 0)
          .map((p) => ({ ...p, ...corroborate(p, r, styleFindings, capA.styles.rects) }))
        colourCheck.push({
          name: r.name,
          flatSamples: s.flatPoints,
          exactSamples: s.exactMatches,
          findings: scored.filter((p) => p.level !== 'lead').slice(0, 8),
          leads: scored.filter((p) => p.level === 'lead').slice(0, 8),
          leadCount: scored.filter((p) => p.level === 'lead').length
        })
      }

      paths = {
        figma: join(OUT_DIR, `${screen.id}.figma.png`),
        shot: join(OUT_DIR, `${screen.id}.app.png`),
        diff: join(OUT_DIR, `${screen.id}.diff.png`),
        sideBySide: join(OUT_DIR, `${screen.id}.side-by-side.png`)
      }
      const diffPng = await sharp(scored.diff, { raw: { width: W, height: H, channels: 4 } })
        .png().toBuffer()
      await writeFile(paths.figma, figmaPng)
      await writeFile(paths.shot, shotPng)
      await writeFile(paths.diff, diffPng)
      await writeFile(
        paths.sideBySide,
        await panelSheet(
          [
            { title: 'Figma', sub: `node ${screen.figmaNodeId}`, buf: figmaPng },
            { title: 'App', sub: `${width}×${height}`, buf: shotPng },
            { title: 'Delta', sub: `${percent.toFixed(2)}% of pixels differ`, buf: diffPng }
          ],
          W, H
        )
      )

      // Deliberately untinted: a green delta reads as a pass, and this number
      // is not a verdict. It lives under `debug` in report.json for the same
      // reason. The style and colour audits below are the output.
      process.stdout.write(
        `    delta    ${c.dim(`${percent.toFixed(2)}%  (${mismatched.toLocaleString()} / ${total.toLocaleString()} px) — diagnostic only, not a score`)}\n`
      )
      if (screen.deltaCaveat) {
        process.stdout.write(`             ${c.dim('! blind to card placement — see report.json')}\n`)
      }
      for (const r of regions) {
        const t = r.diffPercent < 2 ? c.green : r.diffPercent < 10 ? c.yellow : c.red
        process.stdout.write(
          `      ${r.name.padEnd(22)} ${t(`${r.diffPercent.toFixed(2)}%`)}` +
            `${r.caveat ? c.dim(`  ${r.caveat}`) : ''}\n`
        )
      }
      for (const cc of colourCheck) {
        const head = `${cc.exactSamples.toLocaleString()}/${cc.flatSamples.toLocaleString()} exact`
        const verdict = cc.findings.length
          ? c.red(`  ${cc.findings.length} finding(s)`)
          : c.green('  no findings')
        const leads = cc.leadCount ? c.dim(`  · ${cc.leadCount} lead(s)`) : ''
        process.stdout.write(
          `      ${c.dim('colour')} ${cc.name.padEnd(9)} ${c.dim(head)}${verdict}${leads}\n`
        )
        for (const f of cc.findings.slice(0, 3)) {
          process.stdout.write(
            `        ${c.red('✗')} ${f.figma}→${f.app} Δ${f.maxDelta} ×${f.samples}  ` +
              `${c.dim(`${f.level} (${f.match} match) by ${f.by}`)}\n`
          )
        }
      }
    } else {
      await writeFile(join(OUT_DIR, `${screen.id}.app.png`), shotPng)
      paths = { shot: join(OUT_DIR, `${screen.id}.app.png`) }
    }

    // ── token audit (independent of pixels, runs with or without a reference) ─
    const varsPath = [
      join(REF_DIR, `${screen.id}.variables.json`),
      join(REF_DIR, 'everything.variables.json')
    ].find((p2) => existsSync(p2))
    let tokenAudit = null
    if (varsPath && cfg.tokenMap) {
      const figmaVars = JSON.parse(await readFile(varsPath, 'utf8')).variables || {}
      tokenAudit = auditTokens(capA.styles, figmaVars, cfg.tokenMap)
      tokenAudit.source = relative(REPO, varsPath)
      tokenAudit.borrowed = !varsPath.endsWith(`${screen.id}.variables.json`)
      const bad = tokenAudit.mapped.filter((m) => !m.match)
      process.stdout.write(
        `    tokens   ${bad.length === 0 ? c.green(`${tokenAudit.mapped.length}/${tokenAudit.mapped.length} exact`) : c.red(`${bad.length} mismatched`)}` +
          `${c.dim(`  · ${tokenAudit.unmatched.length} element colour(s) match no token`)}` +
          `${tokenAudit.borrowed ? c.dim(' · vars borrowed from everything') : ''}\n`
      )
      for (const m of bad) {
        process.stdout.write(
          `      ${c.red('✗')} ${m.cssVar} ${c.dim('should be')} ${m.expects}\n` +
            `        app ${m.app ?? '—'}  expected ${m.figma ?? '—'}` +
            `${m.delta ? `  Δ(${m.delta.join(',')})` : ''}  ${c.dim(`(${m.reason})`)}\n`
        )
      }
      for (const u of tokenAudit.unmatched.slice(0, 6)) {
        process.stdout.write(
          `      ${c.yellow('?')} ${u.value} ${c.dim(`on ${u.selector} ${u.property} — no Figma token`)}\n`
        )
      }
    }

    if (styleAudit) {
      const n = styleFindings.length
      process.stdout.write(
        `    styles   ${n === 0 ? c.green('all match') : c.red(`${n} mismatched`)}` +
          `${c.dim(`  · ${Object.keys(styleSpec.selectors || {}).length} selector(s), ${styleAudit.skipped.length} property(s) skipped`)}\n`
      )
      for (const f of styleFindings.slice(0, 14)) {
        process.stdout.write(
          `      ${c.red('✗')} ${f.selector} ${c.dim(f.property)}  ` +
            `figma ${f.expected}  ${c.dim('app')} ${f.actual}` +
            `${f.source ? c.dim(`  [${f.source}]`) : ''}\n`
        )
      }
    }

    if (paths?.sideBySide) {
      process.stdout.write(`    ${c.dim(`→ ${relative(REPO, paths.sideBySide)}`)}\n`)
    }
    process.stdout.write('\n')

    results.push({
      id: screen.id,
      figmaNodeId: screen.figmaNodeId ?? null,
      frame: screen.frame,
      route: screen.route?.description ?? null,
      window: { requested: [width, height], settled },
      settledAfterFrames: settledAfter,
      captureAgreement: agreement,

      // ── the actual output ──────────────────────────────────────────────────
      // Style and colour findings read the DOM and sample exact pixels, so they
      // say which property is wrong on which element. Everything derived from
      // the pixel delta lives under `debug` — see the note on `debug` below.
      styleAudit,
      colourCheck,
      tokenAudit,

      debug: {
        _why:
          'Pixel-delta numbers are diagnostic only — do not gate on them. They ' +
          'move in the wrong direction: correcting the 20px grid offset raised ' +
          'the whole-screen delta from 2.175% to 2.471% while bringing the app ' +
          'closer to the design, and a 20px offset of the entire card grid ' +
          'scored 0.00% in the gallery region. Fixture card artwork is cropped ' +
          'from the reference at app-measured rects, so cards align by ' +
          'construction wherever they sit. Use styleAudit and colourCheck.',
        capture: { width: W, height: H, scale },
        resampled,
        pixelDelta: {
          diffPixels: mismatched,
          totalPixels: total,
          diffPercent: percent === null ? null : +percent.toFixed(3),
          ...(screen.deltaCaveat ? { caveat: screen.deltaCaveat } : {})
        },
        regions
      },

      referenceSource: ref?.source ?? null,
      artifacts: Object.fromEntries(Object.entries(paths || {}).map(([k, v]) => [k, relative(REPO, v)]))
    })
  }

  if (mode === 'calibrate') {
    console.log(
      failed
        ? `  ${c.red('calibration failed')} ${c.dim('— the harness is not reproducible; fix the sources above before trusting any score.')}\n`
        : `  ${c.green('calibration clean')} ${c.dim('— captures are byte-identical across launches.')}\n`
    )
    process.exit(failed ? 1 : 0)
  }
  if (!results.length) return // --rects mode

  const report = {
    generatedAt: new Date().toISOString(),
    config: relative(REPO, configPath),
    dataSource: fixtureHome ? { type: 'fixture', path: relative(REPO, fixtureHome) } : { type: 'real-library' },
    figma: { fileKey: cfg.figma.fileKey, scale: cfg.figma.scale },
    compare: { threshold: cfg.defaults.threshold, includeAA: cfg.defaults.includeAA },
    screens: results
  }
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`  ${c.dim(`report → ${relative(REPO, join(OUT_DIR, 'report.json'))}`)}\n`)

  if (failed) {
    console.error(
      `  ${c.red('one or more screens had disagreeing captures — their deltas were withheld')}\n`
    )
    process.exit(1)
  }
}

main().catch((err) => die(err.stack || err.message))
