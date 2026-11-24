// The app-side migration (desktop/src/main/schema.js): v1 -> v2.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { makeDb, addSave, addTag, migrateSchema, migrateV1 } from './fixtures.mjs'

const fts = (db, q) => db.prepare('SELECT b.id FROM bookmarks_fts f JOIN bookmarks b ON b.rowid = f.rowid WHERE bookmarks_fts MATCH ?').all(q).map((r) => r.id)
const tagsText = (db, id) => db.prepare('SELECT tags_text FROM bookmarks WHERE id = ?').get(id).tags_text

test('v1 library upgrades: backup taken, columns backfilled, new fields searchable', () => {
  const { db, dir } = makeDb({ version: 1 })
  const tag = addTag(db, 'onboarding')
  const ig = addSave(db, { url: 'https://www.instagram.com/reel/abc/', title: 'Reel', tags: [tag] })
  const web = addSave(db, { url: 'https://linear.app/method', title: 'Method', summary: 'Principles of craftsmanship' })

  const r = migrateSchema(db, { backupDir: dir })
  assert.equal(r.from, 1)
  assert.equal(r.to, 2)
  assert.ok(r.backup && existsSync(r.backup), 'backup written')
  const bak = new Database(r.backup, { readonly: true })
  assert.equal(bak.prepare('SELECT count(*) n FROM bookmarks').get().n, 2, 'backup holds the pre-migration rows')
  bak.close()

  assert.equal(db.prepare('SELECT platform FROM bookmarks WHERE id = ?').get(ig).platform, 'instagram')
  assert.equal(db.prepare('SELECT platform FROM bookmarks WHERE id = ?').get(web).platform, 'web')
  assert.equal(tagsText(db, ig), 'onboarding')
  assert.deepEqual(fts(db, 'onboarding'), [ig], 'tags are searchable')
  assert.deepEqual(fts(db, 'craftsmanship'), [web], 'summary is searchable')
})

test('migration runs once; the v1 step on later launches does not undo it', () => {
  const { db, dir } = makeDb({ version: 1 })
  addSave(db, { title: 'x' })
  migrateSchema(db, { backupDir: dir })
  const again = migrateSchema(db, { backupDir: dir }) // next launch: v1 runs first, then v2 check
  assert.deepEqual(again, { from: 2, to: 2, backup: null })
  const cols = db.prepare('PRAGMA table_info(bookmarks_fts)').all().map((c) => c.name)
  assert.ok(cols.includes('ai_description') && cols.includes('tags_text'))
  migrateV1(db)
  assert.ok(db.prepare('PRAGMA table_info(bookmarks_fts)').all().some((c) => c.name === 'ai_text'))
})

test('fresh database: no backup, lands on v2', () => {
  const { db, dir } = makeDb({ version: 1 })
  assert.deepEqual(migrateSchema(db, { backupDir: dir }), { from: 1, to: 2, backup: null })
})

test('tags_text and the index follow every tag change', () => {
  const { db } = makeDb()
  const a = addTag(db, 'motion')
  const b = addTag(db, 'typography')
  const id = addSave(db, { title: 'Easing', tags: [a] })
  assert.equal(tagsText(db, id), 'motion')

  db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(id, b)
  assert.deepEqual(tagsText(db, id).split(' ').sort(), ['motion', 'typography'])

  db.prepare('UPDATE tags SET name = ? WHERE id = ?').run('animation', a)
  assert.deepEqual(fts(db, 'animation'), [id], 'rename reaches search')
  assert.deepEqual(fts(db, 'motion'), [], 'old name gone from search')

  db.prepare('DELETE FROM tags WHERE id = ?').run(b) // cascades through bookmark_tags
  assert.equal(tagsText(db, id), 'animation')

  db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').run(id)
  assert.equal(tagsText(db, id), null)

  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id)
  assert.deepEqual(fts(db, 'easing'), [], 'deleted bookmark leaves the index')
})

test('AI fields are indexed once written', () => {
  const { db } = makeDb()
  const id = addSave(db, { title: 'IMG_2041' })
  db.prepare('UPDATE bookmarks SET ai_description = ?, ai_text = ? WHERE id = ?')
    .run('Mobile onboarding screen with a progress bar', 'Step 2 of 4 Continue', id)
  assert.deepEqual(fts(db, 'onboarding'), [id])
  assert.deepEqual(fts(db, 'continue'), [id])
})
