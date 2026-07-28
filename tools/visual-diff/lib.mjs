/**
 * Shared plumbing for the visual diff harness and the fixture seeder:
 * launching the app, sizing the window, running route steps, and comparing
 * images. Nothing here writes to app code or to the real user data directory.
 */
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright-core'
import pixelmatch from 'pixelmatch'
import sharp from 'sharp'

export const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO = resolve(HERE, '../..')
export const SHIM_DIR = join(HERE, 'electron-shim')
export const SEED_APP_DIR = join(HERE, 'seed-app')

export const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`
}

export function die(msg) {
  console.error(`\n${c.red('✗')} ${msg}\n`)
  process.exit(1)
}

export function electronBinary(appDir) {
  const pkgDir = join(appDir, 'node_modules', 'electron')
  const pathTxt = join(pkgDir, 'path.txt')
  if (!existsSync(pathTxt)) {
    die(`Electron is not installed in ${relative(REPO, appDir)}. Run: npm install`)
  }
  let bin = join(pkgDir, 'dist', readFileSync(pathTxt, 'utf8').trim())
  // path.txt sometimes names the .app bundle rather than the executable inside
  // it (notably when Electron was unpacked by hand). Descend if so.
  if (bin.endsWith('.app')) bin = join(bin, 'Contents', 'MacOS', 'Electron')
  if (!existsSync(bin)) die(`Electron binary missing at ${bin}`)
  return bin
}

/**
 * Work out where the app should read its database from.
 *
 * Setting `app.env.HOME` in the config selects a fixture. On macOS that alone
 * is not enough: Electron derives `appData` from NSHomeDirectory(), which
 * ignores $HOME, so the app would still open the real library. We therefore
 * also hand the shim an explicit appData path. HOME still matters — the app's
 * legacy-migration check reads process.env.HOME (src/main/migrate.js), so
 * redirecting it is what keeps migration a no-op inside a fixture.
 */
export function resolveAppEnv(cfg, configDir) {
  const env = { ...(cfg.app?.env || {}) }
  if (!env.HOME) return { env, appData: null, fixtureHome: null }

  const home = resolve(configDir, env.HOME)
  env.HOME = home
  return { env, appData: join(home, 'Library', 'Application Support'), fixtureHome: home }
}

/**
 * Chromium switches that make rasterization reproducible run to run. GPU
 * rasterization, subpixel LCD text and partial raster all introduce small,
 * timing-dependent pixel differences — enough to keep `--calibrate` from ever
 * reaching 0.00%. Software rasterization is slower but byte-stable.
 * Override with `app.chromiumFlags` in the config.
 */
export const DETERMINISM_FLAGS = [
  '--disable-gpu',
  '--disable-gpu-rasterization',
  '--disable-lcd-text',
  '--disable-partial-raster',
  '--force-color-profile=srgb'
]

/**
 * Chromium state that changes between launches: caches, shader/code caches,
 * storage. The first launch into a fresh profile paints subtly differently from
 * every later one, so leaving these in place makes the very first run of a
 * fixture disagree with all the rest. Clearing them means every launch starts
 * identically cold.
 *
 * Only ever called for a fixture — the database and cached images are left
 * alone, and the real library is never touched.
 */
const VOLATILE = [
  'Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache',
  'Shared Dictionary', 'Local Storage', 'Session Storage', 'blob_storage',
  'Network Persistent State', 'DevToolsActivePort', 'Local State',
  'DIPS', 'DIPS-wal', 'DIPS-journal', 'Trust Tokens', 'Trust Tokens-journal'
]
export function resetVolatileState(userDataDir) {
  for (const name of VOLATILE) {
    rmSync(join(userDataDir, name), { recursive: true, force: true })
  }
}

/** CSS injected before capture: kill scrollbars, hover and motion. */
export const STABILISE_CSS = `
  *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
  * { scrollbar-width: none !important; }
  /* Cards reveal a veil, heart and check on :hover (styles.css:654+). The
     window opens under the physical cursor, so whichever card it lands on would
     render differently every run. With pointer-events off the hit test matches
     nothing, so :hover can never apply — and the Figma reference shows no
     hovered card either. Injected after the route steps, so clicks still work. */
  * { pointer-events: none !important; }
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`

export async function runSteps(page, steps = []) {
  for (const step of steps) {
    if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: 20000 })
    else if (step.click) await page.click(step.click)
    else if (step.clickText) {
      await page.locator(step.clickText.sel, { hasText: step.clickText.text }).first().click()
    } else if (step.key) await page.keyboard.press(step.key)
    else if (step.eval) await page.evaluate(step.eval)
    else if (step.wait) await page.waitForTimeout(step.wait)
    else die(`Unknown route step: ${JSON.stringify(step)}`)
  }
}

/**
 * Launch the app, size it to the frame, drive it to the screen's state, then
 * hand the page to `fn`. Always closes the app afterwards.
 */
export async function withApp({ cfg, screen, configDir, skipSteps = false, extraCss = null }, fn) {
  const appDir = resolve(configDir, cfg.app.dir)
  const mainEntry = join(appDir, 'out', 'main', 'index.js')
  if (!existsSync(mainEntry)) {
    die(
      `The app is not built — ${relative(REPO, mainEntry)} is missing.\n` +
        `  Run:  cd ${relative(REPO, appDir)} && npm run build`
    )
  }

  const { width, height } = screen.frame
  const scale = cfg.figma.scale
  const { env, appData } = resolveAppEnv(cfg, configDir)

  if (appData && !existsSync(join(appData, 'staaash', 'staaash.db'))) {
    die(
      `Fixture database missing at\n    ${join(appData, 'staaash', 'staaash.db')}\n\n` +
        `  Seed it with:  node tools/visual-diff/seed-fixture.mjs`
    )
  }

  // Routing through the shim is what redirects the database. Without a fixture
  // configured we launch the app directly and it uses the real library.
  const useShim = !!appData
  if (appData) resetVolatileState(join(appData, 'staaash'))
  const app = await electron.launch({
    executablePath: electronBinary(appDir),
    // Pinning the scale factor makes the capture resolution host-independent,
    // so a 1440pt frame always lands on 1440*scale device pixels.
    args: [
      useShim ? SHIM_DIR : appDir,
      `--force-device-scale-factor=${scale}`,
      ...(cfg.app.chromiumFlags ?? DETERMINISM_FLAGS)
    ],
    cwd: appDir,
    env: {
      ...process.env,
      ...env,
      ...(useShim ? { STAAASH_VD_APPDATA: appData, STAAASH_VD_MAIN: mainEntry } : {})
    }
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Size the *content* area, not the window frame, so the viewport is exactly
    // the Figma frame. hiddenInset title bars make these differ otherwise.
    //
    // BrowserWindow.getContentSize() echoes back what you just asked for, even
    // when the resize has not landed — so it cannot be trusted as confirmation.
    // The renderer's innerWidth/innerHeight is what actually drives layout, so
    // we re-apply until *that* matches, and treat failure as fatal.
    // The app opens at 1520×940, which is wider than a 14" MacBook work area —
    // macOS zooms it, and setContentSize is silently ignored while a window is
    // maximized. Unmaximizing animates, so do it once and let it finish before
    // sizing; re-applying mid-animation just fights it and never converges.
    await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win.isFullScreen()) win.setFullScreen(false)
      if (win.isMaximized()) win.unmaximize()
      win.setResizable(true)
      if (!win.isVisible()) win.show()
    })
    await page.waitForTimeout(450)

    let settled = null
    for (let attempt = 0; attempt < 30 && !settled; attempt++) {
      await app.evaluate(
        async ({ BrowserWindow }, size) => {
          const win = BrowserWindow.getAllWindows()[0]
          win.setContentSize(size.width, size.height)
        },
        { width, height }
      )
      await page.waitForTimeout(150)
      const vp = await page.evaluate(() => [window.innerWidth, window.innerHeight])
      if (vp[0] === width && vp[1] === height) settled = vp
    }

    if (!settled) {
      const vp = await page.evaluate(() => [window.innerWidth, window.innerHeight])
      die(
        `Window would not size to the frame.\n` +
          `    requested ${width}×${height}, renderer viewport is ${vp[0]}×${vp[1]}\n\n` +
          `  Any score taken at the wrong size would be meaningless, so this is fatal.\n` +
          `  The app enforces minWidth 880 / minHeight 600 (src/main/index.js).`
      )
    }

    if (!skipSteps) await runSteps(page, screen.route?.steps)

    // Park the pointer. The window opens underneath wherever the physical mouse
    // happens to be, and cards reveal their veil / heart / check on hover — so
    // without this, whichever card the cursor lands on renders differently and
    // the capture stops being reproducible. Route clicks also leave the pointer
    // wherever they landed, so this has to come after them. (0,0) is the drag
    // strip above the sidebar rows: no hover affordance anywhere near it.
    await page.mouse.move(0, 0)

    if (cfg.defaults.hideScrollbars !== false) {
      await page.addStyleTag({ content: STABILISE_CSS })
    }

    // Mutation overrides go last so they win against the stabilise pass.
    if (extraCss) await page.addStyleTag({ content: extraCss })

    // Webfonts are bundled but still load asynchronously; text painted before
    // they resolve uses a fallback face and every glyph differs.
    await page.evaluate(() => document.fonts.ready).catch(() => {})

    await page.waitForTimeout(cfg.defaults.settleMs ?? 3000)

    // Wait for still-decoding images so previews don't pop in mid-capture, but
    // only those actually in the viewport — off-screen cards use loading="lazy"
    // and never resolve, so an unbounded wait here hangs forever.
    await page
      .evaluate((budget) => {
        const inView = (el) => {
          const b = el.getBoundingClientRect()
          return b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth
        }
        const pending = Array.from(document.images)
          .filter((i) => !i.complete && inView(i))
          .map((i) => new Promise((r) => { i.onload = i.onerror = r }))
        return Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, budget))])
      }, cfg.defaults.imageWaitMs ?? 8000)
      .catch(() => {})

    return await fn({ page, app, settled })
  } finally {
    await app.close().catch(() => {})
  }
}

/**
 * Screenshot the page repeatedly until it stops changing, and return the
 * converged frame.
 *
 * A single screenshot can land while the compositor is still settling — webfont
 * glyphs, image decodes and raster tiles finish a frame or two after everything
 * reports "ready". Requiring repeats is a generic way to only ever measure a
 * converged frame instead of chasing each source of late paint individually.
 *
 * Two consecutive matches is NOT enough: on a cold first launch the page holds
 * an intermediate state long enough to match twice, then paints again — which
 * showed up as the first run of a session disagreeing with every later one.
 * Two consecutive matches is NOT enough: on a cold launch the page holds an
 * intermediate state long enough to match twice, then paints again. Three at
 * 500ms measured best (4/5 clean calibrations); waiting longer does not help —
 * streak=4/gap=700 scored worse, which is what rules out a pure timing race and
 * points at the residual being genuinely bistable rasterization. See README.
 * Returns settledAfter: null if it never converged.
 */
export async function stableScreenshot(page, { gap = 500, tries = 25, streak = 3 } = {}) {
  let prev = await page.screenshot({ type: 'png' })
  let matches = 0
  for (let i = 1; i <= tries; i++) {
    await page.waitForTimeout(gap)
    const next = await page.screenshot({ type: 'png' })
    if (next.equals(prev)) {
      if (++matches >= streak) return { png: next, settledAfter: i }
    } else {
      matches = 0
    }
    prev = next
  }
  return { png: prev, settledAfter: null }
}

// ─── image helpers ───────────────────────────────────────────────────────────

/** Decode to raw RGBA at exactly w×h, reporting whether a resample was needed. */
export async function toRaw(input, w, h) {
  let img = sharp(input)
  const meta = await img.metadata()
  const resampled = meta.width !== w || meta.height !== h
  if (resampled) img = img.resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
  return {
    data: await img.ensureAlpha().raw().toBuffer(),
    resampled,
    from: `${meta.width}×${meta.height}`
  }
}

export function scorePixels(a, b, w, h, opts = {}, { diffMask = false } = {}) {
  const diff = Buffer.alloc(w * h * 4)
  const mismatched = pixelmatch(a, b, diff, w, h, {
    threshold: opts.threshold ?? 0.1,
    includeAA: opts.includeAA ?? false,
    alpha: 0.25,
    diffMask,
    diffColor: [255, 0, 90],
    diffColorAlt: [255, 170, 0]
  })
  return { diff, mismatched, total: w * h, percent: (mismatched / (w * h)) * 100 }
}

export function cropRaw(raw, imgW, x, y, w, h) {
  const out = Buffer.alloc(w * h * 4)
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * imgW + x) * 4
    raw.copy(out, row * w * 4, from, from + w * 4)
  }
  return out
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Three labelled panels side by side, scaled to half size. */
export async function panelSheet(panels, w, h) {
  const GAP = 24
  const HEAD = 64
  const PAD = 24
  const panelW = Math.round(w / 2)
  const panelH = Math.round(h / 2)
  const totalW = panelW * panels.length + GAP * (panels.length - 1) + PAD * 2
  const totalH = panelH + HEAD + PAD * 2

  const labels = panels
    .map((p, i) => {
      const x = PAD + (panelW + GAP) * i
      return `
        <text x="${x}" y="${PAD + 22}" fill="#f5ffe1" font-family="Helvetica, Arial, sans-serif"
              font-size="17" font-weight="600">${esc(p.title)}</text>
        <text x="${x}" y="${PAD + 42}" fill="rgba(245,255,225,0.45)"
              font-family="Helvetica, Arial, sans-serif" font-size="13">${esc(p.sub)}</text>`
    })
    .join('')

  const svg = Buffer.from(
    `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">${labels}</svg>`
  )

  const imgs = await Promise.all(
    panels.map((p) =>
      sharp(p.buf).resize(panelW, panelH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
    )
  )

  return sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 8, g: 8, b: 8, alpha: 1 }
    }
  })
    .composite([
      { input: svg, top: 0, left: 0 },
      ...imgs.map((input, i) => ({ input, top: HEAD + PAD, left: PAD + (panelW + GAP) * i }))
    ])
    .png()
    .toBuffer()
}
