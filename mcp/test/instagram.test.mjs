// Phase 2: the Instagram export import and the saves-pilot import
// (desktop/src/main/instagram.js), run against the app's own schema.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { makeDb, addSave, addTag, tempDir, migrateSchema } from './fixtures.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ig = await import(pathToFileURL(join(HERE, '../../desktop/src/main/instagram.js')).href)
const { Library } = await import(pathToFileURL(join(HERE, '../dist/library.js')).href)

// What Instagram does to UTF-8: every byte becomes one Latin-1 character.
const mangle = (s) => Buffer.from(s, 'utf8').toString('latin1')

const owner = (u) => ({ title: 'Owner', dict: [{ title: '', dict: [{ label: 'Name', value: 'X' }, { label: 'Username', value: u }] }] })
const post = (url, ts, caption, user) => ({
  timestamp: ts,
  media: [],
  label_values: [
    { label: 'URL', value: url, href: url },
    { label: 'Caption', value: mangle(caption) },
    { label: 'Title', value: '' },
    { title: 'Hashtags', dict: [] },
    owner(user)
  ]
})
const collection = (name, ts, members) => ({
  timestamp: ts,
  media: [],
  label_values: [
    { label: 'Name', value: mangle(name) },
    { label: 'Type', value: 'Default' },
    { label: 'Update time', timestamp_value: ts },
    {
      title: 'Media',
      dict: members.map((m) => ({ title: '', dict: m.label_values }))
    }
  ]
})

const T = (iso) => Date.parse(iso) / 1000
const A = post('https://www.instagram.com/p/AAA111/', T('2025-03-01T10:00:00Z'), 'Compact profile card 🔥\n\n#ui #ux', 'alenn.design')
const B = post('https://www.instagram.com/reel/BBB222/', T('2026-01-05T09:00:00Z'), '#design #figma\nPricing card exploration', 'tranmautritam')
const B_AGAIN = post('https://www.instagram.com/p/BBB222/', T('2026-02-01T09:00:00Z'), '#design #figma\nPricing card exploration', 'tranmautritam')
const C = post('https://www.instagram.com/reel/CCC333/', T('2024-06-01T09:00:00Z'), 'U10 passing drill', 'coach')
const D = post('https://www.instagram.com/p/DDD444/', T('2024-02-01T09:00:00Z'), 'Unfiled design post', 'studio')
const ONLY_IN_COLLECTION = post('https://www.instagram.com/reel/EEE555/', 0, 'Missing from saved posts', 'ghost')

const EXPORT = {
  posts: [A, B, B_AGAIN, C, D],
  collections: [
    collection('AI tools', T('2026-04-01T00:00:00Z'), [A, B]),
    collection('Basketball', T('2026-04-01T00:00:00Z'), [C]),
    collection('basketball ', T('2026-04-01T00:00:00Z'), [C]),
    collection('U10 Soccer', T('2026-03-01T00:00:00Z'), [C, ONLY_IN_COLLECTION]),
    collection('Café', T('2026-03-01T00:00:00Z'), [A])
  ]
}

const rows = (db) => db.prepare("SELECT * FROM bookmarks WHERE platform = 'instagram' ORDER BY external_id").all()
const tagsOf = (db, id) =>
  db.prepare('SELECT t.name FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = ? ORDER BY t.name').all(id).map((r) => r.name)

test('parse: decodes text, dedupes reel and post links, keeps the earliest date, merges case-only duplicate collections', () => {
  const p = ig.parseExport(EXPORT)
  assert.equal(p.saves.size, 5, 'A, B (twice), C, D, plus one save found only in a collection')
  assert.equal(p.saves.get('AAA111').caption, 'Compact profile card 🔥\n\n#ui #ux')
  assert.equal(p.saves.get('BBB222').created_at, '2026-01-05T09:00:00.000Z', 'earliest of the two saves of B')
  assert.equal(p.saves.get('AAA111').creator, 'alenn.design')
  assert.deepEqual(p.collections.map((c) => c.key).sort(), ['ai tools', 'basketball', 'café', 'u10 soccer'])
  assert.deepEqual([...p.unfiled], ['DDD444'])
  assert.equal(p.undated, 1)
  assert.equal(p.saves.get('EEE555').created_at, '2026-03-01T00:00:00.000Z', 'falls back to the collection date')
})

test('fixMojibake leaves clean text and undecodable text alone', () => {
  assert.equal(ig.fixMojibake('plain'), 'plain')
  assert.equal(ig.fixMojibake('already “fine” 🔥'), 'already “fine” 🔥')
  assert.equal(ig.fixMojibake('café'), 'café', 'a real Latin-1 é is not valid UTF-8, so it stays')
  const oneBroken = mangle('📌 Save this for your next trip—you’ll love it 🌴') + 'â\u0080'
  assert.equal(ig.fixMojibake(oneBroken), '📌 Save this for your next trip—you’ll love it 🌴', 'one broken sequence among many good ones')
})

test('title: creator plus the first line that is not just hashtags', () => {
  const p = ig.parseExport(EXPORT)
  assert.equal(ig.titleFor(p.saves.get('AAA111')), 'alenn.design · Compact profile card 🔥')
  assert.equal(ig.titleFor(p.saves.get('BBB222')), 'tranmautritam · Pricing card exploration')
  assert.equal(ig.titleFor({ creator: null, caption: '#a #b' }), 'Instagram post')
})

test('import: only checked collections come in, each becomes a tag, saved dates kept', () => {
  const { db } = makeDb()
  const parsed = ig.parseExport(EXPORT)
  const picks = { collections: ['ai tools'], unfiled: false }

  const plan = ig.planImport(db, parsed, picks)
  assert.deepEqual(plan.counts, { add: 2, tag: 0, unchanged: 0, trashed: 0 })
  assert.equal(rows(db).length, 0, 'planning writes nothing')

  assert.deepEqual(ig.applyImport(db, parsed, picks), plan.counts, 'apply does what the plan said')
  const r = rows(db)
  assert.deepEqual(r.map((x) => x.external_id), ['AAA111', 'BBB222'])
  assert.equal(r[0].created_at, '2025-03-01T10:00:00.000Z')
  assert.equal(r[0].url, 'https://www.instagram.com/p/AAA111/')
  assert.equal(r[0].source, 'instagram-export')
  assert.equal(r[0].summary, 'Compact profile card 🔥\n\n#ui #ux')
  assert.ok(r[0].ph_comp !== null, 'gets a gradient placeholder')
  assert.deepEqual(tagsOf(db, r[0].id), ['ai tools'])
})

test('import: unfiled saves only when checked; a save in two checked collections gets both tags', () => {
  const { db } = makeDb()
  const parsed = ig.parseExport(EXPORT)
  ig.applyImport(db, parsed, { collections: ['ai tools', 'café'], unfiled: true })
  const byId = Object.fromEntries(rows(db).map((x) => [x.external_id, x]))
  assert.deepEqual(Object.keys(byId).sort(), ['AAA111', 'BBB222', 'DDD444'])
  assert.deepEqual(tagsOf(db, byId.AAA111.id), ['ai tools', 'café'])
  assert.deepEqual(tagsOf(db, byId.DDD444.id), [])
})

test('re-run: no duplicates, adds tags, never removes one, never touches note, favorite, archive or trash', () => {
  const { db } = makeDb()
  const parsed = ig.parseExport(EXPORT)
  ig.applyImport(db, parsed, { collections: ['ai tools'], unfiled: false })
  const a = rows(db).find((x) => x.external_id === 'AAA111')
  const b = rows(db).find((x) => x.external_id === 'BBB222')
  const mine = addTag(db, 'keeper')
  db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(a.id, mine)
  db.prepare("UPDATE bookmarks SET note = 'my note', favorited = 1, archived_at = '2026-05-01', title = 'My title' WHERE id = ?").run(a.id)
  db.prepare("UPDATE bookmarks SET deleted_at = '2026-05-02' WHERE id = ?").run(b.id)

  const second = { collections: ['ai tools', 'café'], unfiled: false }
  assert.deepEqual(ig.planImport(db, parsed, second).counts, { add: 0, tag: 1, unchanged: 0, trashed: 1 })
  ig.applyImport(db, parsed, second)

  assert.equal(rows(db).length, 2, 'nothing added twice')
  const a2 = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(a.id)
  assert.equal(a2.note, 'my note')
  assert.equal(a2.favorited, 1)
  assert.equal(a2.archived_at, '2026-05-01')
  assert.equal(a2.title, 'My title', 'a filled field is not overwritten')
  assert.deepEqual(tagsOf(db, a.id), ['ai tools', 'café', 'keeper'])
  assert.equal(db.prepare('SELECT deleted_at FROM bookmarks WHERE id = ?').get(b.id).deleted_at, '2026-05-02', 'trashed stays trashed')

  assert.deepEqual(ig.planImport(db, parsed, second).counts, { add: 0, tag: 0, unchanged: 1, trashed: 1 }, 'third run is a no-op')
})

test('a save already in the library under a /reel/ link is matched, not duplicated, and its blanks filled', () => {
  const { db } = makeDb({ version: 1 })
  const id = addSave(db, { url: 'https://www.instagram.com/reel/AAA111/?igsh=xyz', title: '' })
  migrateSchema(db)
  assert.equal(db.prepare('SELECT external_id FROM bookmarks WHERE id = ?').get(id).external_id, 'AAA111', 'v3 backfills the post id')

  const parsed = ig.parseExport(EXPORT)
  assert.deepEqual(ig.planImport(db, parsed, { collections: ['ai tools'] }).counts, { add: 1, tag: 1, unchanged: 0, trashed: 0 })
  ig.applyImport(db, parsed, { collections: ['ai tools'] })
  const r = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id)
  assert.equal(r.title, 'alenn.design · Compact profile card 🔥', 'empty title filled')
  assert.equal(r.url, 'https://www.instagram.com/reel/AAA111/?igsh=xyz', 'url left as saved')
  assert.equal(rows(db).length, 2)
})

test('imported captions and tags are searchable', () => {
  const { db } = makeDb()
  ig.applyImport(db, ig.parseExport(EXPORT), { collections: ['ai tools', 'u10 soccer'] })
  const fts = (q) => db.prepare('SELECT b.external_id FROM bookmarks_fts f JOIN bookmarks b ON b.rowid = f.rowid WHERE bookmarks_fts MATCH ? ORDER BY b.external_id').all(q).map((r) => r.external_id)
  assert.deepEqual(fts('pricing'), ['BBB222'])
  assert.deepEqual(fts('soccer'), ['CCC333', 'EEE555'], 'tag text is indexed')
})

test('reads the export from a zip, an unzipped folder, or saved_posts.json', async () => {
  const dir = tempDir()
  const saved = join(dir, 'instagram-me-2026', 'your_instagram_activity', 'saved')
  mkdirSync(saved, { recursive: true })
  writeFileSync(join(saved, 'saved_posts.json'), JSON.stringify(EXPORT.posts))
  writeFileSync(join(saved, 'saved_collections.json'), JSON.stringify(EXPORT.collections))
  const zip = join(dir, 'export.zip')
  execFileSync('zip', ['-qr', zip, 'instagram-me-2026'], { cwd: dir })

  for (const p of [zip, join(dir, 'instagram-me-2026'), join(saved, 'saved_posts.json')]) {
    const parsed = ig.parseExport(await ig.readExport(p))
    assert.equal(parsed.saves.size, 5, p)
    assert.equal(parsed.collections.length, 4, p)
  }
  await assert.rejects(ig.readExport(tempDir()), /No saved_posts\.json/)
})

test('CSV parser handles quotes, commas and newlines inside fields', () => {
  const rows = ig.parseCsv('id,on_screen\r\nX1,"A card, with ""quotes""\nand a newline"\nX2,plain\n')
  assert.deepEqual(rows, [
    { id: 'X1', on_screen: 'A card, with "quotes"\nand a newline' },
    { id: 'X2', on_screen: 'plain' }
  ])
})

// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

function pilotFolder() {
  const dir = tempDir()
  const csv = [
    'id,layout_type,on_screen,visual_style,good_for,confidence',
    'AAA111,profile/card,"A compact person card: photo, name, bio.",dark; grotesk,compact profile layout; tag chips,high',
    'ZZZ999,dashboard,Not in the library,flat,metrics,medium'
  ].join('\n')
  writeFileSync(join(dir, 'pilot_results.csv'), csv)
  mkdirSync(join(dir, 'media', 'AAA111'), { recursive: true })
  for (const n of ['frame_01.png', 'frame_02.png', 'frame_10.png']) writeFileSync(join(dir, 'media', 'AAA111', n), PNG)
  writeFileSync(join(dir, 'fetch_frames.py'), 'raise SystemExit("must never run")')
  return dir
}

test('pilot: descriptions and frames land on the matching save; re-run changes nothing', async () => {
  const { db, dir } = makeDb()
  ig.applyImport(db, ig.parseExport(EXPORT), { collections: ['ai tools'] })
  const pilot = await ig.readPilot(pilotFolder())
  assert.deepEqual(pilot[0].frames.map((f) => f.split('/').pop()), ['frame_01.png', 'frame_02.png', 'frame_10.png'], 'numeric frame order')

  const imagesDir = join(dir, 'images')
  const r1 = await ig.applyPilot(db, pilot, { imagesDir })
  assert.deepEqual(r1, { described: 1, framesAdded: 3, notInLibrary: ['ZZZ999'], alreadyDescribed: 0, trashed: 0 })

  const a = db.prepare("SELECT * FROM bookmarks WHERE external_id = 'AAA111'").get()
  assert.equal(a.ai_description, 'A compact person card: photo, name, bio.')
  assert.equal(a.layout_type, 'profile/card')
  assert.equal(a.ai_confidence, 'high')
  assert.equal(a.ai_model, 'saves-pilot')
  assert.equal(a.image_path, 'ig_AAA111_01.png', 'frame 1 is the card image')
  assert.equal(a.image_w, 1)
  const frames = db.prepare('SELECT * FROM bookmark_images WHERE bookmark_id = ? ORDER BY position').all(a.id)
  assert.deepEqual(frames.map((f) => [f.position, f.image_path, f.label]), [
    [1, 'ig_AAA111_01.png', 'frame_01'],
    [2, 'ig_AAA111_02.png', 'frame_02'],
    [3, 'ig_AAA111_03.png', 'frame_10']
  ])
  assert.ok(existsSync(join(imagesDir, 'ig_AAA111_03.png')))

  const fts = (q) => db.prepare('SELECT b.external_id FROM bookmarks_fts f JOIN bookmarks b ON b.rowid = f.rowid WHERE bookmarks_fts MATCH ?').all(q).map((r) => r.external_id)
  assert.deepEqual(fts('"tag chips"'), ['AAA111'], 'good_for is searchable')
  assert.deepEqual(fts('grotesk'), ['AAA111'], 'visual_style is searchable')

  const r2 = await ig.applyPilot(db, pilot, { imagesDir })
  assert.deepEqual(r2, { described: 0, framesAdded: 0, notInLibrary: ['ZZZ999'], alreadyDescribed: 1, trashed: 0 })
  assert.equal(db.prepare('SELECT count(*) n FROM bookmark_images').get().n, 3)
})

test('pilot: a missing column is a readable error', async () => {
  const dir = tempDir()
  writeFileSync(join(dir, 'pilot_results.csv'), 'id,on_screen\nAAA111,x\n')
  await assert.rejects(ig.readPilot(dir), /missing: layout_type/)
})

test('MCP: get_save returns every frame and the vision fields; search finds them', async () => {
  const { db, path, dir } = makeDb()
  ig.applyImport(db, ig.parseExport(EXPORT), { collections: ['ai tools'] })
  await ig.applyPilot(db, await ig.readPilot(pilotFolder()), { imagesDir: join(dir, 'images') })
  const id = db.prepare("SELECT id FROM bookmarks WHERE external_id = 'AAA111'").get().id
  db.close()

  const lib = new Library(path)
  const s = lib.get(id)
  assert.equal(s.layout_type, 'profile/card')
  assert.equal(s.good_for, 'compact profile layout; tag chips')
  assert.equal(s.ai_confidence, 'high')
  assert.equal(s.instagram_post_id, 'AAA111')
  assert.equal(s.images.length, 3)
  assert.ok(s.images.every((im) => im.exists && im.path.startsWith(join(dir, 'images'))))
  const hits = lib.search('profile layout')
  assert.equal(hits[0].id, id)
  assert.equal(hits[0].layout_type, 'profile/card')
  assert.equal(hits[0].image_count, 3)
  lib.close()
})
