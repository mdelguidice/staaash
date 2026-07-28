// Launcher shim. Electron on macOS derives `appData` from NSHomeDirectory(),
// which ignores $HOME — so redirecting the app's database to a fixture cannot
// be done with env alone. We patch app.getPath('appData') *before* importing
// the real main, which computes userData = appData/staaash at module scope
// (src/main/index.js) and opens the DB later, on whenReady.
//
// This shim exists so the harness never has to modify app code.
//
// It also runs the fixture precheck. That has to happen here rather than in the
// Node-side harness because better-sqlite3 in desktop/ is built against
// Electron's ABI and cannot be required from plain Node — and the macOS system
// sqlite3 ships without FTS5, so shelling out to the CLI is not a substitute.
import { app } from 'electron'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const appData = process.env.STAAASH_VD_APPDATA
const desktop = process.env.STAAASH_VD_DESKTOP
const precheckOut = process.env.STAAASH_VD_PRECHECK

/** Record why we refused so the harness can report it, then stop. */
function refuse(reason) {
  if (precheckOut) {
    try {
      writeFileSync(precheckOut, JSON.stringify({ ok: false, reason }, null, 2))
    } catch {
      /* nothing useful to do — we are exiting anyway */
    }
  }
  console.error(`[visual-diff precheck] ${reason}`)
  app.exit(1)
  return false
}

/**
 * Refuse to launch against a fixture whose `migrated_v1` flag is unset.
 *
 * Without it the app runs its one-time legacy migration on first open and
 * imports the real library into the fixture, silently invalidating every score.
 *
 * Fails CLOSED: any error at all — missing db, unreadable file, better-sqlite3
 * not loadable — refuses the launch rather than proceeding unverified.
 */
function precheckFixture() {
  const dbPath = join(appData, 'staaash', 'staaash.db')
  let db = null
  try {
    const require = createRequire(join(desktop, 'package.json'))
    const Database = require('better-sqlite3')
    db = new Database(dbPath, { readonly: true, fileMustExist: true })
    const row = db.prepare("SELECT value FROM settings WHERE key = 'migrated_v1'").get()
    if (!row || !row.value) {
      return refuse(
        `fixture has no migrated_v1 flag: ${dbPath}\n` +
          `  Launching it would run the legacy migration and pull the real library into the fixture.\n` +
          `  Re-seed: node tools/visual-diff/seed-fixture.mjs`
      )
    }
  } catch (err) {
    return refuse(`could not verify fixture at ${dbPath} — ${err.message}`)
  } finally {
    try { db?.close() } catch { /* already closed or never opened */ }
  }

  if (precheckOut) {
    try {
      writeFileSync(precheckOut, JSON.stringify({ ok: true, db: dbPath }, null, 2))
    } catch { /* non-fatal: a successful launch is itself the signal */ }
  }
  return true
}

if (appData) {
  const ok = desktop
    ? precheckFixture()
    : refuse('STAAASH_VD_DESKTOP not set — cannot resolve better-sqlite3 for the precheck')

  if (ok) {
    const real = app.getPath.bind(app)
    app.getPath = (name) => (name === 'appData' ? appData : real(name))
  }
}

const target = process.env.STAAASH_VD_MAIN
if (!target) throw new Error('STAAASH_VD_MAIN not set')
await import(pathToFileURL(target).href)
