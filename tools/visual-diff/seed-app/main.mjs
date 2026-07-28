/**
 * Electron-side fixture seeder.
 *
 * Runs as an Electron main process because the app's better-sqlite3 is built
 * against Electron's ABI (146), not Node's — and the system `sqlite3` CLI on
 * macOS ships without FTS5, which the schema requires.
 *
 * It imports the app's real src/main/db.js, so the fixture schema can never
 * drift from the app's. It writes ONLY inside the fixture directory.
 *
 * Driven by seed-fixture.mjs; not meant to be run directly.
 */
import { app } from 'electron'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

const APPDATA = process.env.STAAASH_VD_APPDATA
const DESKTOP = process.env.STAAASH_VD_DESKTOP
const SPEC_PATH = process.env.STAAASH_VD_SPEC
const OUT_PATH = process.env.STAAASH_VD_RESULT

// Same redirect the capture shim performs — see electron-shim/main.mjs.
const realGetPath = app.getPath.bind(app)
app.getPath = (name) => (name === 'appData' ? APPDATA : realGetPath(name))
app.setName('staaash')
app.setPath('userData', join(APPDATA, 'staaash'))

/** Mirrors renderer/src/lib/format.js cardAspect(). Kept in sync deliberately. */
const CARD_ASPECTS = [1.78, 1.6, 1.42, 1.25, 1.0, 1.0, 0.85]
function aspectIndex(id) {
  let h = 7
  const s = String(id)
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0
  return h % CARD_ASPECTS.length
}

/** Find an id of the form `<slug>-<n>` whose hash lands on the wanted aspect. */
function idForAspect(slug, aspect) {
  const wanted = CARD_ASPECTS.indexOf(aspect)
  if (wanted === -1) throw new Error(`aspect ${aspect} is not one of ${CARD_ASPECTS.join(', ')}`)
  for (let n = 0; n < 200000; n++) {
    const id = `fx-${slug}-${n}`
    const idx = aspectIndex(id)
    if (CARD_ASPECTS[idx] === aspect) return id
  }
  throw new Error(`no id found for ${slug} @ ${aspect}`)
}

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400_000).toISOString()

const PATCH_PATH = process.env.STAAASH_VD_PATCH

app.whenReady().then(async () => {
  const result = { ok: false }
  try {
    const db = await import(pathToFileURL(join(DESKTOP, 'src/main/db.js')).href)

    // ── patch mode: point seeded rows at their cropped preview images ──────
    if (PATCH_PATH) {
      const handle = db.openDb()
      const rows = JSON.parse(readFileSync(PATCH_PATH, 'utf8'))
      const stmt = handle.prepare('UPDATE bookmarks SET image_path = ? WHERE id = ?')
      const tx = handle.transaction((list) => {
        for (const r of list) stmt.run(r.name, r.id)
      })
      tx(rows)
      result.ok = true
      result.patched = rows.length
      const { writeFileSync } = await import('node:fs')
      writeFileSync(OUT_PATH, JSON.stringify(result, null, 2))
      app.exit(0)
      return
    }

    const spec = (await import(pathToFileURL(SPEC_PATH).href)).default

    db.openDb()

    // Never migrate legacy data into a fixture.
    db.setSetting('migrated_v1', new Date().toISOString())
    db.setSetting('fixture_seeded_at', new Date().toISOString())

    // ── collections ────────────────────────────────────────────────────────
    const collectionIds = spec.collections.map((c) => db.createCollection(c.name).id)

    // ── tags ───────────────────────────────────────────────────────────────
    for (const t of spec.tags) db.createTag(t)

    // ── visible cards ──────────────────────────────────────────────────────
    // listBookmarks() sorts by created_at DESC with no tiebreaker (db.js:158),
    // so cards sharing a timestamp land in arbitrary slots and the capture
    // stops being reproducible. Offset each card by a minute to force a total
    // order — small enough that it never changes the "N days ago" label.
    const cards = spec.cards.map((c, i) => {
      const id = idForAspect(c.slug, c.aspect)
      db.insertBookmark({
        id,
        url: c.url,
        title: c.title,
        domain: c.domain,
        created_at: iso(c.daysAgo + i / 1440),
        source: 'fixture'
      })
      return { id, slug: c.slug, aspect: c.aspect }
    })

    // ── filler, to make the sidebar counts add up ──────────────────────────
    const { everything, unread, favorite, archived } = spec.library
    const fillerActive = everything - cards.length
    if (fillerActive < 0) throw new Error('more cards than the everything count')

    // read_at is set on (everything - unread) rows; all visible cards stay unread.
    const readTarget = everything - unread
    // Collection assignment lives entirely in filler: collection pills only
    // render in the hover veil, so they never affect the captured pixels.
    const assign = []
    spec.collections.forEach((c, i) => {
      for (let n = 0; n < c.count; n++) assign.push(collectionIds[i])
    })

    const span = spec.filler.oldestDaysAgo - spec.filler.startDaysAgo
    for (let i = 0; i < fillerActive; i++) {
      const daysAgo = spec.filler.startDaysAgo + (span * i) / Math.max(1, fillerActive - 1)
      db.insertBookmark({
        id: `fx-filler-${i}`,
        url: `https://example.org/filler/${i}`,
        title: `Filler bookmark ${i + 1}`,
        domain: 'example.org',
        created_at: iso(daysAgo),
        read_at: i < readTarget ? iso(daysAgo - 1) : null,
        favorited: i < favorite ? 1 : 0,
        collection_id: assign[i] ?? null,
        source: 'fixture'
      })
    }

    for (let i = 0; i < archived; i++) {
      db.insertBookmark({
        id: `fx-archived-${i}`,
        url: `https://example.org/archived/${i}`,
        title: `Archived bookmark ${i + 1}`,
        domain: 'example.org',
        created_at: iso(spec.filler.oldestDaysAgo + i + 1),
        archived_at: iso(1),
        source: 'fixture'
      })
    }

    for (let i = 0; i < (spec.library.trash || 0); i++) {
      db.insertBookmark({
        id: `fx-trash-${i}`,
        url: `https://example.org/trash/${i}`,
        title: `Trashed bookmark ${i + 1}`,
        domain: 'example.org',
        created_at: iso(spec.filler.oldestDaysAgo + 50 + i),
        deleted_at: iso(1),
        source: 'fixture'
      })
    }

    // Verify against the app's own view predicates rather than trusting the loop.
    const all = db.listBookmarks()
    const counts = {
      everything: all.filter((b) => !b.deleted_at && !b.archived_at).length,
      unread: all.filter((b) => !b.deleted_at && !b.archived_at && !b.read_at).length,
      favorite: all.filter((b) => !b.deleted_at && !b.archived_at && b.favorited).length,
      archived: all.filter((b) => !!b.archived_at && !b.deleted_at).length,
      trash: all.filter((b) => !!b.deleted_at).length
    }

    result.ok = true
    result.counts = counts
    result.expected = spec.library
    result.cards = cards
    result.dataDir = db.dataDir()
    result.imagesDir = db.imagesDir()
  } catch (err) {
    result.error = err.stack || err.message
  }

  const { writeFileSync } = await import('node:fs')
  writeFileSync(OUT_PATH, JSON.stringify(result, null, 2))
  app.exit(result.ok ? 0 : 1)
})
