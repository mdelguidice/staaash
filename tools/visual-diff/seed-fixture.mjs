#!/usr/bin/env node
/**
 * Build the seeded fixture database.
 *
 *   node tools/visual-diff/seed-fixture.mjs [--fixture=figma-mock] [--config=...]
 *
 * Two passes:
 *   1. Launch Electron with a seeding entry point that imports the app's real
 *      src/main/db.js and inserts the content described by the fixture spec.
 *   2. Launch the app for real, measure every .card-media box, and crop those
 *      rectangles straight out of the Figma reference PNG to use as the cards'
 *      preview images — so the gallery compares layout and chrome rather than
 *      unrelated artwork.
 *
 * Everything is written inside tools/visual-diff/fixtures/<name>/. The real
 * library at ~/Library/Application Support/staaash is never opened.
 */
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import {
  HERE, REPO, SEED_APP_DIR, c, die, electronBinary, resolveAppEnv, withApp
} from './lib.mjs'

const argv = process.argv.slice(2)
const opt = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : null
}

const fixtureName = opt('fixture') || 'figma-mock'
const fixtureDir = join(HERE, 'fixtures', fixtureName)
const specPath = join(fixtureDir, 'fixture.mjs')
if (!existsSync(specPath)) die(`No fixture spec at ${relative(REPO, specPath)}`)

const configPath = resolve(REPO, opt('config') || 'visual-diff.config.mjs')
if (!existsSync(configPath)) die(`Config not found: ${configPath}`)
const configDir = resolve(configPath, '..')
const cfg = (await import(pathToFileURL(configPath).href)).default
const spec = (await import(pathToFileURL(specPath).href)).default

const screen = cfg.screens.find((s) => s.id === spec.screen)
if (!screen) die(`Fixture targets screen "${spec.screen}", which the config does not define.`)

const { appData, fixtureHome } = resolveAppEnv(cfg, configDir)
if (!appData) {
  die(
    `The config does not select a fixture.\n` +
      `  Set app.env.HOME in ${relative(REPO, configPath)} to a fixture directory, e.g.\n` +
      `    env: { HOME: './tools/visual-diff/fixtures/${fixtureName}/home' }`
  )
}
if (!fixtureHome.startsWith(join(HERE, 'fixtures'))) {
  die(`Refusing to seed outside the fixtures directory:\n    ${fixtureHome}`)
}

const appDir = resolve(configDir, cfg.app.dir)
const mainEntry = join(appDir, 'out', 'main', 'index.js')
if (!existsSync(mainEntry)) {
  die(`The app is not built. Run:  cd ${relative(REPO, appDir)} && npm run build`)
}

console.log(`\n${c.bold('seed fixture')} ${c.dim(`· ${fixtureName} → ${relative(REPO, fixtureHome)}`)}\n`)

// ── pass 1: fresh database ───────────────────────────────────────────────────
await rm(fixtureHome, { recursive: true, force: true })
await mkdir(join(appData, 'staaash'), { recursive: true })

/**
 * Run the seeding entry point under Electron. Deliberately a plain spawn, not
 * playwright's electron.launch — this process opens no window and exits as soon
 * as it is done, which trips playwright's debugger handshake.
 */
function runElectron(env) {
  return new Promise((res, rej) => {
    const child = spawn(electronBinary(appDir), [SEED_APP_DIR], {
      cwd: appDir,
      env: { ...process.env, HOME: fixtureHome, STAAASH_VD_APPDATA: appData, STAAASH_VD_DESKTOP: appDir, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', rej)
    child.on('exit', (code) => res({ code, stderr }))
  })
}

const resultPath = join(fixtureHome, 'seed-result.json')
const run = await runElectron({ STAAASH_VD_SPEC: specPath, STAAASH_VD_RESULT: resultPath })
if (run.code !== 0 && !existsSync(resultPath)) {
  die(`Seeding process exited ${run.code}.\n${run.stderr.split('\n').slice(-15).join('\n')}`)
}

if (!existsSync(resultPath)) die('The seeding process produced no result file.')
const seeded = JSON.parse(await readFile(resultPath, 'utf8'))
if (!seeded.ok) die(`Seeding failed:\n${seeded.error}`)

// Trust the app's own view predicates, not the insert loop.
const bad = Object.entries(seeded.expected).filter(([k, v]) => seeded.counts[k] !== v)
if (bad.length) {
  die(
    `Seeded counts do not match the spec:\n` +
      bad.map(([k, v]) => `    ${k}: expected ${v}, got ${seeded.counts[k]}`).join('\n')
  )
}
console.log(`  ${c.green('✓')} database  ${c.dim(Object.entries(seeded.counts).map(([k, v]) => `${k} ${v}`).join(' · '))}`)

// ── pass 2: card images cropped from the Figma reference ─────────────────────
const refPath = join(REPO, 'visual-diff', 'figma', `${screen.id}@${cfg.figma.scale}x.png`)
if (!existsSync(refPath)) {
  console.log(
    `  ${c.yellow('!')} no Figma reference at ${relative(REPO, refPath)} — ` +
      `skipping card images.\n    Run the harness once to populate it, then re-seed.`
  )
} else {
  const scale = cfg.figma.scale
  const rects = await withApp({ cfg, screen, configDir }, async ({ page }) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-id]')).map((el) => {
        const media = el.querySelector('.card-media')
        const b = media.getBoundingClientRect()
        return {
          id: el.getAttribute('data-card-id'),
          x: Math.round(b.x), y: Math.round(b.y),
          width: Math.round(b.width), height: Math.round(b.height)
        }
      })
    )
  )

  const ref = sharp(refPath)
  const { width: RW, height: RH } = await ref.metadata()
  await mkdir(seeded.imagesDir, { recursive: true })

  const written = []
  for (const r of rects) {
    const left = r.x * scale
    const top = r.y * scale
    const w = r.width * scale
    const h = r.height * scale
    if (w <= 0 || h <= 0) continue

    // Cards at the bottom edge run past the frame. Crop the part that exists in
    // the reference and pad the rest — the padding sits below the viewport, so
    // it is never captured, but the image keeps the card's true aspect ratio
    // (which matters: a wrong ratio would trip the app's letterboxing rule).
    const ix = Math.max(0, left)
    const iy = Math.max(0, top)
    const iw = Math.min(left + w, RW) - ix
    const ih = Math.min(top + h, RH) - iy
    if (iw <= 0 || ih <= 0) continue // entirely off-reference: leave it imageless

    const name = `fixture-${r.id}.png`
    await sharp(refPath)
      .extract({ left: ix, top: iy, width: iw, height: ih })
      .extend({
        top: iy - top,
        left: ix - left,
        bottom: h - ih - (iy - top),
        right: w - iw - (ix - left),
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .png()
      .toFile(join(seeded.imagesDir, name))
    written.push({ id: r.id, name })
  }

  // Point the seeded rows at the crops. Runs inside Electron for the same
  // ABI/FTS5 reasons as pass 1.
  const patchPath = join(fixtureHome, 'image-patch.json')
  const patchResult = join(fixtureHome, 'patch-result.json')
  await writeFile(patchPath, JSON.stringify(written))
  const pRun = await runElectron({ STAAASH_VD_PATCH: patchPath, STAAASH_VD_RESULT: patchResult })
  if (pRun.code !== 0 && !existsSync(patchResult)) {
    die(`Image patch process exited ${pRun.code}.\n${pRun.stderr.split('\n').slice(-15).join('\n')}`)
  }

  const pr = JSON.parse(await readFile(patchResult, 'utf8'))
  if (!pr.ok) die(`Image patch failed:\n${pr.error}`)
  console.log(`  ${c.green('✓')} images    ${c.dim(`${written.length} card crops from ${relative(REPO, refPath)}`)}`)
}

console.log(
  `\n  ${c.dim('fixture ready. The harness uses it because app.env.HOME points here.')}\n` +
    `  ${c.dim(`timestamps are relative to seed time — re-seed if "days ago" labels drift.`)}\n`
)
