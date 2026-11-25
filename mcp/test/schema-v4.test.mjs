// The v3 -> v4 table rebuild (desktop/src/main/schema.js): URL becomes optional.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { makeDb, addSave, addTag, migrateSchema } from './fixtures.mjs'

const fts = (db, q) => db.prepare('SELECT b.id FROM bookmarks_fts f JOIN bookmarks b ON b.rowid = f.rowid WHERE bookmarks_fts MATCH ?').all(q).map((r) => r.id).sort()
const col = (db, name) => db.prepare('PRAGMA table_info(bookmarks)').all().find((c) => c.name === name)

function v3Library() {
  const lib = makeDb({ version: 3 })
  const { db } = lib
  const motion = addTag(db, 'motion')
  const ui = addTag(db, 'ui')
  const a = addSave(db, { url: 'https://linear.app/method', title: 'Method', summary: 'Craftsmanship principles', tags: [motion], note: 'keep' })
  const b = addSave(db, { url: 'https://www.instagram.com/p/AAA111/', title: 'alenn · Compact profile card', tags: [motion, ui] })
  // A gap in rowids, so a copy that renumbers would be caught.
  const gone = addSave(db, { title: 'deleted later' })
  const c = addSave(db, { url: 'https://stripe.com/pricing', title: 'Pricing', archived_at: '2026-01-01T00:00:00Z' })
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(gone)
  db.prepare('INSERT INTO bookmark_images (bookmark_id, position, image_path) VALUES (?, 1, ?), (?, 2, ?)').run(b, 'f1.jpg', b, 'f2.jpg')
  db.prepare("UPDATE bookmarks SET external_id = 'AAA111', layout_type = 'profile card', favorited = 1 WHERE id = ?").run(b)
  return { ...lib, ids: { a, b, c }, tags: { motion, ui } }
}

test('v3 library rebuilds to v4: backup, every row, rowid, tags, frames and search survive', () => {
  const { db, dir, ids, tags } = v3Library()
  const before = db.prepare('SELECT rowid, * FROM bookmarks ORDER BY rowid').all()

  const r = migrateSchema(db, { backupDir: dir })
  assert.deepEqual([r.from, r.to], [3, 4])
  assert.ok(r.backup && existsSync(r.backup), 'backup written')
  const bak = new Database(r.backup, { readonly: true })
  assert.equal(bak.prepare('SELECT count(*) n FROM bookmarks').get().n, 3)
  bak.close()

  const after = db.prepare('SELECT rowid, * FROM bookmarks ORDER BY rowid').all()
  assert.equal(after.length, before.length)
  for (const [i, row] of before.entries()) {
    const { kind, inbox_id, ...rest } = after[i]
    assert.deepEqual(rest, row, `row ${row.id} unchanged, rowid included`)
    assert.equal(kind, 'link')
    assert.equal(inbox_id, null)
  }

  const tagRows = db.prepare('SELECT bookmark_id, tag_id FROM bookmark_tags ORDER BY bookmark_id, tag_id').all()
  assert.equal(tagRows.length, 3, 'no tag links lost to a cascade')
  assert.equal(db.prepare('SELECT count(*) n FROM bookmark_images WHERE bookmark_id = ?').get(ids.b).n, 2, 'frames kept')

  assert.deepEqual(fts(db, 'craftsmanship'), [ids.a])
  assert.deepEqual(fts(db, 'motion'), [ids.a, ids.b].sort(), 'tags_text searchable')
  assert.deepEqual(fts(db, 'profile'), [ids.b])
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1, 'foreign keys back on')

  // Triggers still work on the rebuilt table.
  db.prepare('UPDATE tags SET name = ? WHERE id = ?').run('animation', tags.motion)
  assert.deepEqual(fts(db, 'animation'), [ids.a, ids.b].sort())
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(ids.b)
  assert.equal(db.prepare('SELECT count(*) n FROM bookmark_images').get().n, 0, 'frames still cascade')
  assert.deepEqual(fts(db, 'profile'), [])
})

test('v4 makes url optional and adds kind and inbox_id', () => {
  const { db } = v3Library()
  migrateSchema(db)
  assert.equal(col(db, 'url').notnull, 0)
  assert.equal(col(db, 'normalized_url').notnull, 0)
  assert.equal(col(db, 'id').pk, 1)
  assert.equal(col(db, 'created_at').notnull, 1, 'other NOT NULLs kept')
  assert.equal(col(db, 'favorited').dflt_value, '0', 'defaults kept')
  const fk = db.prepare('PRAGMA foreign_key_list(bookmarks)').all()
  assert.equal(fk[0]?.table, 'collections', 'collection reference kept')

  const id = addSave(db, { url: null, title: 'Screenshot · 25 Nov', note: 'checkout empty state', inbox_id: 'inb_1' })
  const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id)
  assert.equal(row.url, null)
  assert.equal(row.kind, 'image')
  assert.deepEqual(fts(db, 'checkout'), [id])
  assert.throws(() => addSave(db, { url: null, inbox_id: 'inb_1' }), /UNIQUE/, 'one save per inbox item')
})

test('v4 runs once; a fresh database lands on v4 with no backup', () => {
  const { db, dir } = v3Library()
  migrateSchema(db, { backupDir: dir })
  assert.deepEqual(migrateSchema(db, { backupDir: dir }), { from: 4, to: 4, backup: null })
  const fresh = makeDb({ version: 1 })
  assert.deepEqual(migrateSchema(fresh.db, { backupDir: fresh.dir }), { from: 1, to: 4, backup: null })
  assert.equal(col(fresh.db, 'url').notnull, 0)
})

test('orphaned links are cleared instead of blocking the upgrade', () => {
  const { db, ids } = v3Library()
  db.pragma('foreign_keys = OFF')
  db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run('no-such-save', 'no-such-tag')
  db.prepare("INSERT INTO bookmark_images (bookmark_id, position, image_path) VALUES ('no-such-save', 1, 'x.jpg')").run()
  db.prepare("UPDATE bookmarks SET collection_id = 'no-such-collection' WHERE id = ?").run(ids.a)
  db.pragma('foreign_keys = ON')
  migrateSchema(db)
  assert.equal(db.prepare('SELECT count(*) n FROM bookmark_tags').get().n, 3, 'real links kept')
  assert.equal(db.prepare('SELECT count(*) n FROM bookmark_images').get().n, 2)
  assert.equal(db.prepare('SELECT collection_id FROM bookmarks WHERE id = ?').get(ids.a).collection_id, null)
})

test('a failed rebuild rolls back and leaves v3 intact', () => {
  const { db } = v3Library()
  // A view naming a column the rebuild can't see forces a failure mid-swap.
  db.exec('CREATE VIEW broken_view AS SELECT url FROM bookmarks')
  assert.throws(() => migrateSchema(db))
  assert.equal(db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get().value, '3')
  assert.equal(col(db, 'url').notnull, 1, 'still the v3 table')
  assert.equal(db.prepare('SELECT count(*) n FROM bookmarks').get().n, 3)
  assert.equal(fts(db, 'craftsmanship').length, 1, 'search still works')
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1)
})
