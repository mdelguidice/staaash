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

/**
 * The aspect is seeded directly as image_w/image_h, which is what breaks the
 * circularity the fixture used to have: pass 1 laid out at whatever shape the
 * app assigned, pass 2 cropped the reference at those rects, and the resulting
 * images could only ever re-assert the assignment. Seeding the size up front
 * lets pass 1 lay out at the DESIGN's ratios, so the crops land on the design's
 * own card boxes.
 *
 * Nominal width only — the app reads the ratio, not the pixels.
 */
const NOMINAL_W = 1000
const sizeForAspect = (aspect) => ({ w: NOMINAL_W, h: Math.round(NOMINAL_W / aspect) })

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400_000).toISOString()

const PATCH_PATH = process.env.STAAASH_VD_PATCH

app.whenReady().then(async () => {
  const result = { ok: false }
  try {
    const db = await import(pathToFileURL(join(DESKTOP, 'src/main/db.js')).href)
    const { placeholderFor } = await import(pathToFileURL(join(DESKTOP, 'src/main/placeholder.js')).href)

    // ── patch mode: point seeded rows at their cropped preview images ──────
    if (PATCH_PATH) {
      const handle = db.openDb()
      const rows = JSON.parse(readFileSync(PATCH_PATH, 'utf8'))
      // image_w/image_h as well as the path: cards take their image's shape,
      // and the masonry reads the size off the record before anything paints.
      // Without these the app would fall back to hashed shapes here, and the
      // background size-sweep would then WRITE them into the fixture database
      // on the first harness run — making run 1 differ from run 2.
      const stmt = handle.prepare(
        `UPDATE bookmarks
            SET image_path = ?, image_w = ?, image_h = ?,
                preview_source = 'og', focal_y = 0.5
          WHERE id = ?`
      )
      const tx = handle.transaction((list) => {
        for (const r of list) stmt.run(r.name, r.w ?? null, r.h ?? null, r.id)
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
      const id = `fx-${c.slug}`
      db.insertBookmark({
        id,
        url: c.url,
        title: c.title,
        domain: c.domain,
        created_at: iso(c.daysAgo + i / 1440),
        source: 'fixture'
      })
      // Seed the shape before any image exists, so pass 1 lays the grid out at
      // the design's ratios rather than at a fallback constant. preview_source
      // goes in for the same reason the size does: the backfill sweep selects
      // rows missing it, and a sweep that writes to the fixture on run 1 makes
      // run 1 differ from run 2. The Figma crops stand in for og:images.
      const { w, h } = sizeForAspect(c.aspect)
      db.updateBookmark(id, { image_w: w, image_h: h, preview_source: 'og', focal_y: 0.5 })
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
      const ph = placeholderFor(`fx-filler-${i}`, null)
      db.insertBookmark({
        id: `fx-filler-${i}`,
        url: `https://example.org/filler/${i}`,
        title: `Filler bookmark ${i + 1}`,
        domain: 'example.org',
        created_at: iso(daysAgo),
        read_at: i < readTarget ? iso(daysAgo - 1) : null,
        favorited: i < favorite ? 1 : 0,
        collection_id: assign[i] ?? null,
        source: 'fixture',
        // Filler cards have no preview, so the app would generate a gradient
        // placeholder for each on first launch — and the backfill sweep fires
        // 1200ms after mount, i.e. inside the harness's settle window. Seeding
        // them here is what stops run 1 from differing from run 2. Same reason
        // image_w and preview_source are seeded.
        ph_comp: ph.comp,
        ph_hue_a: ph.hueA,
        ph_hue_b: ph.hueB,
        ph_hue_c: ph.hueC,
        ph_aspect: ph.aspect
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
        source: 'fixture',
        ...(() => { const p = placeholderFor(`fx-archived-${i}`, null)
          return { ph_comp: p.comp, ph_hue_a: p.hueA, ph_hue_b: p.hueB, ph_hue_c: p.hueC, ph_aspect: p.aspect } })()
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
