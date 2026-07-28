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
  stableScreenshot, sampleFlatColors
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
    const a = await toRaw(first, W, H)
    const b = await toRaw(second, W, H)
    const { mismatched, total, percent } = scorePixels(a.data, b.data, W, H, cfg.defaults)
    const { diff: mask } = scorePixels(a.data, b.data, W, H, cfg.defaults, { diffMask: true })
    const changes = mismatched ? await describeChanges(page, mask, W, H, scale) : []
    return { first, second, mask, mismatched, total, percent, changes, settled }
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
async function collectStyles(page, selectors, varNames) {
  return page.evaluate(
    ({ sels, props, vars }) => {
      const rootCS = getComputedStyle(document.documentElement)
      const tokens = Object.fromEntries(
        vars.map((v) => [v, rootCS.getPropertyValue(v).trim() || null])
      )
      const elements = {}
      for (const sel of sels) {
        const el = document.querySelector(sel)
        if (!el) { elements[sel] = null; continue }
        const cs = getComputedStyle(el)
        elements[sel] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p).trim()]))
      }
      return { tokens, elements }
    },
    { sels: selectors, props: STYLE_PROPS, vars: varNames }
  )
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
  for (const [cssVar, figmaName] of Object.entries(tokenMap || {})) {
    const appRaw = styles.tokens[cssVar]
    const figRaw = figmaVars[figmaName]
    const appHex = normHex(appRaw)
    const figHex = normHex(figRaw)
    mapped.push({
      cssVar, figmaToken: figmaName,
      app: appRaw ?? null, figma: figRaw ?? null,
      match: !!appHex && !!figHex && appHex === figHex,
      reason: !figRaw ? 'figma token not found'
        : !appRaw ? 'css var not defined'
        : !appHex || !figHex ? 'not a comparable colour'
        : appHex === figHex ? null : 'value differs'
    })
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
      diffPercent: +s.percent.toFixed(3)
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
      const clean = r.mismatched === 0
      process.stdout.write(
        `    delta  ${clean ? c.green('0.00%') : c.red(`${r.percent.toFixed(2)}%`)} ` +
          `${c.dim(`(${r.mismatched.toLocaleString()} / ${r.total.toLocaleString()} px, two launches)`)}\n`
      )

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
                sub: `${r.percent.toFixed(2)}% differs between runs`,
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
        const styles = await collectStyles(page, RECT_SELECTORS, Object.keys(cfg.tokenMap || {}))
        return { png: shot.png, settled, settledAfter: shot.settledAfter, styles }
      })

    const capA = await captureOnce()
    let agreement = { captures: 1, identical: null, diffPixels: null }

    if (!flag('single-capture')) {
      const capB = await captureOnce()
      const identical = capA.png.equals(capB.png)
      let diffPixels = 0
      if (!identical) {
        const ra = await toRaw(capA.png, W, H)
        const rb = await toRaw(capB.png, W, H)
        diffPixels = scorePixels(ra.data, rb.data, W, H, cfg.defaults).mismatched
      }
      agreement = { captures: 2, identical, diffPixels }
      process.stdout.write(
        `    capture  ${identical ? c.green('2/2 identical') : c.red(`2 captures DISAGREE (${diffPixels.toLocaleString()} px)`)}\n`
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
          diffPercent: null,
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

    // ── pixel delta (only possible with a reference) ─────────────────────────
    let percent = null, mismatched = null, total = null
    let regions = []
    let colourCheck = []
    let resampled = null
    let paths = null

    if (ref) {
      const figmaPng = await readFile(ref.path)
      const a = await toRaw(figmaPng, W, H)
      const b = await toRaw(shotPng, W, H)
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
      // Split by magnitude. A small delta on a flat fill is a genuine colour
      // drift — and below ~27/255 pixelmatch structurally cannot see it, which
      // is the whole reason this check exists. A large delta means the two
      // images simply have different things at that point (a card edge landing
      // elsewhere), which the pixel delta already reports; counting those as
      // "colour" findings would bury the signal.
      const DRIFT_MAX = 8
      for (const r of screen.regions || []) {
        const s = sampleFlatColors(a.data, b.data, W, H, r, scale)
        const nonZero = s.pairs.filter((p) => p.maxDelta > 0)
        colourCheck.push({
          name: r.name,
          flatSamples: s.flatPoints,
          exactSamples: s.exactMatches,
          drift: nonZero.filter((p) => p.maxDelta <= DRIFT_MAX).slice(0, 8),
          structuralPairs: nonZero.filter((p) => p.maxDelta > DRIFT_MAX).length
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

      const tint = percent < 2 ? c.green : percent < 10 ? c.yellow : c.red
      process.stdout.write(
        `    delta    ${tint(`${percent.toFixed(2)}%`)} ` +
          `${c.dim(`(${mismatched.toLocaleString()} / ${total.toLocaleString()} px)`)}\n`
      )
      for (const r of regions) {
        const t = r.diffPercent < 2 ? c.green : r.diffPercent < 10 ? c.yellow : c.red
        process.stdout.write(`      ${r.name.padEnd(10)} ${t(`${r.diffPercent.toFixed(2)}%`)}\n`)
      }
      for (const cc of colourCheck) {
        const head = `${cc.exactSamples.toLocaleString()}/${cc.flatSamples.toLocaleString()} exact`
        const drift = cc.drift.length
          ? c.red(
              '  drift ' +
                cc.drift.slice(0, 3).map((d) => `${d.figma}→${d.app} Δ${d.maxDelta}(×${d.samples})`).join(' ')
            )
          : c.green('  no drift')
        const struct = cc.structuralPairs
          ? c.dim(`  · ${cc.structuralPairs} structural`)
          : ''
        process.stdout.write(
          `      ${c.dim('colour')} ${cc.name.padEnd(9)} ${c.dim(head)}${drift}${struct}\n`
        )
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
          `      ${c.red('✗')} ${m.cssVar} ${c.dim('vs')} ${m.figmaToken}  ` +
            `app ${m.app ?? '—'}  figma ${m.figma ?? '—'}  ${c.dim(`(${m.reason})`)}\n`
        )
      }
      for (const u of tokenAudit.unmatched.slice(0, 8)) {
        process.stdout.write(
          `      ${c.yellow('?')} ${u.value} ${c.dim(`on ${u.selector} ${u.property} — no Figma token`)}\n`
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
      capture: { width: W, height: H, scale },
      resampled,
      diffPixels: mismatched,
      totalPixels: total,
      diffPercent: percent === null ? null : +percent.toFixed(3),
      regions,
      colourCheck,
      tokenAudit,
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
