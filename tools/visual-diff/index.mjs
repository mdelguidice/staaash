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
  stableScreenshot
} from './lib.mjs'

const argv = process.argv.slice(2)
const flag = (name) => argv.some((a) => a === `--${name}`)
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}
const onlyScreens = argv.filter((a) => a.startsWith('--screen=')).map((a) => a.slice(9))

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

  const mode = flag('calibrate') ? 'calibrate' : flag('rects') || opt('rects') ? 'rects' : 'diff'
  console.log(
    `\n${c.bold(`visual diff${mode === 'diff' ? '' : ` · ${mode}`}`)} ` +
      `${c.dim(`· ${screens.length} screen(s) · ${dataNote}`)}\n`
  )

  const results = []
  let failed = false

  for (const screen of screens) {
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
    const ref = await getFigmaRef(screen, cfg.figma, flag('refresh'))
    process.stdout.write(`    figma  ${c.dim(ref.source)}\n`)

    const { png: shotPng, settled, settledAfter } = await withApp(
      { cfg, screen, configDir },
      async ({ page, settled }) => {
        const s = await stableScreenshot(page)
        return { png: s.png, settled, settledAfter: s.settledAfter }
      }
    )
    if (!settledAfter) {
      console.warn(c.yellow('    ! page never stopped repainting — score may not be reproducible'))
    }
    const figmaPng = await readFile(ref.path)

    const a = await toRaw(figmaPng, W, H)
    const b = await toRaw(shotPng, W, H)
    if (a.resampled) console.warn(c.yellow(`    ! figma ref was ${a.from}, resampled to ${W}×${H}`))
    if (b.resampled) console.warn(c.yellow(`    ! app shot was ${b.from}, resampled to ${W}×${H}`))

    const { diff, mismatched, total, percent } = scorePixels(a.data, b.data, W, H, cfg.defaults)

    const regions = []
    for (const r of screen.regions || []) {
      const rx = r.x * scale, ry = r.y * scale
      const rw = Math.min(r.width * scale, W - rx)
      const rh = Math.min(r.height * scale, H - ry)
      if (rw <= 0 || rh <= 0) {
        console.warn(c.yellow(`    ! region "${r.name}" falls outside the frame — skipped`))
        continue
      }
      const s = scorePixels(cropRaw(a.data, W, rx, ry, rw, rh), cropRaw(b.data, W, rx, ry, rw, rh), rw, rh, cfg.defaults)
      regions.push({
        name: r.name, diffPixels: s.mismatched, totalPixels: s.total,
        diffPercent: +s.percent.toFixed(3)
      })
    }

    const paths = {
      figma: join(OUT_DIR, `${screen.id}.figma.png`),
      shot: join(OUT_DIR, `${screen.id}.app.png`),
      diff: join(OUT_DIR, `${screen.id}.diff.png`),
      sideBySide: join(OUT_DIR, `${screen.id}.side-by-side.png`)
    }
    const diffPng = await sharp(diff, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()

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
      `    delta  ${tint(`${percent.toFixed(2)}%`)} ` +
        `${c.dim(`(${mismatched.toLocaleString()} / ${total.toLocaleString()} px)`)}\n`
    )
    for (const r of regions) {
      const t = r.diffPercent < 2 ? c.green : r.diffPercent < 10 ? c.yellow : c.red
      process.stdout.write(`      ${r.name.padEnd(10)} ${t(`${r.diffPercent.toFixed(2)}%`)}\n`)
    }
    process.stdout.write(`    ${c.dim(`→ ${relative(REPO, paths.sideBySide)}`)}\n\n`)

    results.push({
      id: screen.id,
      figmaNodeId: screen.figmaNodeId,
      frame: screen.frame,
      route: screen.route?.description ?? null,
      window: { requested: [width, height], settled },
      settledAfterFrames: settledAfter,
      capture: { width: W, height: H, scale },
      resampled: {
        figma: { resampled: a.resampled, source: a.from },
        app: { resampled: b.resampled, source: b.from }
      },
      diffPixels: mismatched,
      totalPixels: total,
      diffPercent: +percent.toFixed(3),
      regions,
      referenceSource: ref.source,
      artifacts: Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, relative(REPO, v)]))
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
}

main().catch((err) => die(err.stack || err.message))
