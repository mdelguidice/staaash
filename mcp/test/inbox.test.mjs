// Phase 3: writing phone-inbox items into the library, and paste-link
// (desktop/src/main/inbox.js), run against the app's own schema.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { makeDb, addSave, addTag } from './fixtures.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const inbox = await import(pathToFileURL(join(HERE, '../../desktop/src/main/inbox.js')).href)
const { Library } = await import(pathToFileURL(join(HERE, '../dist/library.js')).href)

const get = (db, id) => db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id)
const frames = (db, id) => db.prepare('SELECT position, image_path FROM bookmark_images WHERE bookmark_id = ? ORDER BY position').all(id)
const count = (db) => db.prepare('SELECT count(*) n FROM bookmarks').get().n
const shot = (n) => ({ name: `phone_x_${n}.png`, w: 1080, h: 2400 })

test('a screenshot becomes an image save with no URL, titled from its note or date', () => {
  const { db } = makeDb()
  const r = inbox.applyInboxItem(db, { id: 'i1', saved_at: '2026-11-25T08:30:00Z', note: null }, [shot(1), shot(2)])
  assert.equal(r.status, 'created')
  const row = get(db, r.id)
  assert.equal(row.url, null)
  assert.equal(row.kind, 'image')
  assert.equal(row.source, 'phone')
  assert.equal(row.title, 'Screenshot · 25 Nov')
  assert.equal(row.created_at, '2026-11-25T08:30:00Z', 'the phone’s time, not the sync time')
  assert.equal(row.image_path, 'phone_x_1.png', 'frame 1 is the cover')
  assert.equal(row.preview_source, 'screenshot')
  assert.deepEqual(frames(db, r.id).map((f) => f.image_path), ['phone_x_1.png', 'phone_x_2.png'])

  const n = inbox.applyInboxItem(db, { id: 'i2', saved_at: '2026-11-25T08:31:00Z', note: '  Checkout empty state\nfrom Linear' }, [shot(3)])
  assert.equal(get(db, n.id).title, 'Checkout empty state')
})

test('each inbox item is applied once, even after its save is deleted', () => {
  const { db } = makeDb()
  const item = { id: 'i1', saved_at: '2026-11-25T08:30:00Z' }
  const first = inbox.applyInboxItem(db, item, [shot(1)])
  assert.equal(inbox.applyInboxItem(db, item, [shot(1)]).status, 'applied-before')
  assert.equal(count(db), 1)
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(first.id)
  assert.equal(inbox.applyInboxItem(db, item, [shot(1)]).status, 'applied-before', 'a deleted save stays deleted')
  assert.equal(count(db), 0)
})

test('a new link is saved with its link fields and flagged for a preview', () => {
  const { db } = makeDb()
  const r = inbox.applyInboxItem(db, { id: 'i1', saved_at: '2026-11-25T08:30:00Z', url: 'Look at this https://linear.app/method?utm_source=x. so good' })
  assert.equal(r.status, 'created')
  assert.equal(r.needsPreview, true)
  const row = get(db, r.id)
  assert.equal(row.url, 'https://linear.app/method?utm_source=x')
  assert.equal(row.normalized_url, 'linear.app/method')
  assert.equal(row.domain, 'linear.app')
  assert.equal(row.kind, 'link')
  assert.equal(row.platform, 'web')
})

test('a link already here gets the phone’s images and note, not a second save', () => {
  const { db } = makeDb()
  const tag = addTag(db, 'pricing')
  const id = addSave(db, { url: 'https://stripe.com/pricing', title: 'Pricing', note: 'Mike’s note', tags: [tag] })
  db.prepare("UPDATE bookmarks SET image_path = 'og.jpg', image_w = 1200, image_h = 630 WHERE id = ?").run(id)
  const r = inbox.applyInboxItem(db, { id: 'i1', saved_at: '2026-11-25T08:30:00Z', url: 'https://www.stripe.com/pricing/', note: 'tier table' }, [shot(1)])
  assert.deepEqual([r.status, r.id, r.needsPreview], ['added-to', id, false])
  assert.equal(count(db), 1)
  const row = get(db, id)
  assert.equal(row.image_path, 'og.jpg', 'cover kept')
  assert.equal(row.title, 'Pricing', 'title kept')
  assert.equal(row.note, 'Mike’s note\n\ntier table')
  assert.deepEqual(frames(db, id).map((f) => f.image_path), ['og.jpg', 'phone_x_1.png'], 'cover listed first, screenshot after')
})

test('an Instagram reel from the phone finds the save the export import made', () => {
  const { db } = makeDb()
  const id = addSave(db, { url: 'https://www.instagram.com/p/DLprzdPtdoH/', title: 'physician card' })
  db.prepare("UPDATE bookmarks SET external_id = 'DLprzdPtdoH' WHERE id = ?").run(id)
  const r = inbox.applyInboxItem(db, { id: 'i1', saved_at: '2026-11-25T08:30:00Z', url: 'https://www.instagram.com/reel/DLprzdPtdoH/?igsh=abc' })
  assert.deepEqual([r.status, r.id], ['added-to', id])

  const fresh = inbox.applyInboxItem(db, { id: 'i2', saved_at: '2026-11-25T08:30:00Z', url: 'https://instagram.com/reel/NEW123/?igsh=1' })
  const row = get(db, fresh.id)
  assert.equal(row.url, 'https://www.instagram.com/p/NEW123/', 'stored the way the import stores it')
  assert.equal(row.external_id, 'NEW123')
  assert.equal(row.platform, 'instagram')
})

test('a trashed save with the same link doesn’t swallow a new phone save', () => {
  const { db } = makeDb()
  addSave(db, { url: 'https://stripe.com/pricing', deleted_at: '2026-11-01T00:00:00Z' })
  assert.equal(inbox.applyInboxItem(db, { id: 'i1', url: 'https://stripe.com/pricing' }).status, 'created')
})

test('an item with neither a link nor an image is refused', () => {
  const { db } = makeDb()
  assert.throws(() => inbox.applyInboxItem(db, { id: 'i1', note: 'hm' }, []), /neither/)
  assert.equal(db.prepare('SELECT count(*) n FROM inbox_applied').get().n, 0)
})

test('paste-link attaches a new link, or reports the save that already has it', () => {
  const { db } = makeDb()
  const img = inbox.applyInboxItem(db, { id: 'i1', saved_at: '2026-11-25T08:30:00Z', note: 'empty state' }, [shot(1)]).id
  const a = inbox.attachLink(db, img, ' https://linear.app/method ')
  assert.equal(a.status, 'attached')
  const row = get(db, img)
  assert.deepEqual([row.url, row.kind, row.domain, row.title], ['https://linear.app/method', 'link', 'linear.app', 'empty state'])

  const other = addSave(db, { url: 'https://stripe.com/pricing', title: 'Pricing' })
  const img2 = inbox.applyInboxItem(db, { id: 'i2', saved_at: '2026-11-25T08:30:00Z' }, [shot(2)]).id
  const d = inbox.attachLink(db, img2, 'https://stripe.com/pricing?utm_campaign=x')
  assert.equal(d.status, 'duplicate')
  assert.equal(d.existing.id, other)
  assert.equal(get(db, img2).url, null, 'nothing written until Mike chooses')
  assert.throws(() => inbox.attachLink(db, img2, 'not a link'), /link/)
})

test('merge moves frames, note and tags into the existing save and deletes the image save', () => {
  const { db } = makeDb()
  const t1 = addTag(db, 'checkout')
  const t2 = addTag(db, 'pricing')
  const target = addSave(db, { url: 'https://stripe.com/pricing', title: 'Pricing', note: 'old', tags: [t2] })
  const img = inbox.applyInboxItem(db, { id: 'i1', saved_at: '2026-11-25T08:30:00Z', note: 'tier table' }, [shot(1), shot(2)]).id
  db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(img, t1)

  inbox.mergeInto(db, img, target)
  assert.equal(get(db, img), undefined)
  const row = get(db, target)
  assert.equal(row.image_path, 'phone_x_1.png', 'target had no cover, so it takes the screenshot')
  assert.equal(row.note, 'old\n\ntier table')
  assert.deepEqual(frames(db, target).map((f) => f.image_path), ['phone_x_1.png', 'phone_x_2.png'])
  const tags = db.prepare('SELECT tag_id FROM bookmark_tags WHERE bookmark_id = ?').all(target).map((r) => r.tag_id).sort()
  assert.deepEqual(tags, [t1, t2].sort())
  assert.equal(db.prepare('SELECT bookmark_id FROM inbox_applied WHERE inbox_id = ?').get('i1').bookmark_id, target)
})

test('the MCP server returns an image save with url null and all its frames', () => {
  const { db, path } = makeDb()
  const id = inbox.applyInboxItem(db, { id: 'i1', saved_at: '2026-11-25T08:30:00Z', note: 'onboarding carousel' }, [shot(1), shot(2)]).id
  db.close()
  const lib = new Library(path)
  const hits = lib.search('onboarding')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].url, null)
  assert.equal(hits[0].image_count, 2)
  const s = lib.get(id)
  assert.equal(s.url, null)
  assert.equal(s.images.length, 2)
  assert.equal(s.kind, 'image')
  assert.equal(hits[0].kind, 'image')
})

test('firstUrl pulls the link out of Android share text', () => {
  assert.equal(inbox.firstUrl('Check out this reel! https://www.instagram.com/reel/ABC/?igsh=x'), 'https://www.instagram.com/reel/ABC/?igsh=x')
  assert.equal(inbox.firstUrl('(https://linear.app/method).'), 'https://linear.app/method')
  assert.equal(inbox.firstUrl('no link here'), null)
})
