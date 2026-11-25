// Phase 3: pulling the phone inbox (desktop/src/main/sync.js) from a fake
// Worker that speaks the same API as worker/src/index.ts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { makeDb, addSave } from './fixtures.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const { syncInbox, testInbox } = await import(pathToFileURL(join(HERE, '../../desktop/src/main/sync.js')).href)

const TOKEN = 'desk-token'
// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

function fakeWorker(items, { failImage = null, failSyncOnce = null } = {}) {
  const synced = new Set()
  let failedSync = false
  const calls = []
  const fetch = async (url, init = {}) => {
    const u = new URL(url)
    calls.push(`${init.method || 'GET'} ${u.pathname}`)
    if (init.headers?.authorization !== `Bearer ${TOKEN}`) return new Response('{"error":"Unauthorized"}', { status: 401 })
    if (u.pathname === '/items' && !init.method) {
      const limit = Number(u.searchParams.get('limit'))
      const open = items.filter((i) => !synced.has(i.id))
      return Response.json({ items: open.slice(0, limit), pending: open.length })
    }
    const s = u.pathname.match(/^\/items\/(.+)\/synced$/)
    if (s) {
      if (failSyncOnce === s[1] && !failedSync) {
        failedSync = true
        throw new Error('network dropped')
      }
      synced.add(decodeURIComponent(s[1]))
      return Response.json({ ok: true })
    }
    if (u.pathname.startsWith('/images/')) {
      if (failImage && u.pathname.includes(failImage)) return new Response('nope', { status: 500 })
      return new Response(PNG, { headers: { 'content-type': 'image/png' } })
    }
    return new Response('{}', { status: 404 })
  }
  return { fetch, synced, calls }
}

const img = (item, n) => ({ key: `items/${item}/0${n}-abc.png`, type: 'image/png', size: PNG.length })
const ITEMS = [
  { id: 'a1', saved_at: '2026-11-25T10:00:00Z', url: null, note: 'empty state', images: [img('a1', 1), img('a1', 2)] },
  { id: 'b2', saved_at: '2026-11-25T10:05:00Z', url: 'https://linear.app/method', note: null, images: [] },
  { id: 'c3', saved_at: '2026-11-25T10:06:00Z', url: 'https://stripe.com/pricing', note: 'tiers', images: [img('c3', 1)] }
]

test('sync writes every item, downloads images, marks each synced', async () => {
  const { db, dir } = makeDb()
  const w = fakeWorker(ITEMS)
  const r = await syncInbox({ db, imagesDir: join(dir, 'images'), inboxUrl: 'https://inbox.example/', token: TOKEN, fetch: w.fetch })
  assert.deepEqual([r.created, r.addedTo, r.failed.length, r.pending], [3, 0, 0, 0])
  assert.equal(r.needsPreview.length, 2, 'the two link saves')
  assert.deepEqual([...w.synced].sort(), ['a1', 'b2', 'c3'])

  const shot = db.prepare("SELECT * FROM bookmarks WHERE kind = 'image'").get()
  assert.equal(shot.image_path, 'phone_a1_01.png')
  assert.equal(shot.image_w, 1)
  assert.ok(existsSync(join(dir, 'images', 'phone_a1_02.png')))
  assert.deepEqual(readFileSync(join(dir, 'images', 'phone_a1_01.png')), PNG)
  const link = db.prepare("SELECT * FROM bookmarks WHERE url = 'https://stripe.com/pricing'").get()
  assert.equal(link.image_path, 'phone_c3_01.png', 'a screenshot shared with a link is its cover')
})

test('a crash between writing and marking synced doesn’t double the save', async () => {
  const { db, dir } = makeDb()
  const w = fakeWorker(ITEMS, { failSyncOnce: 'b2' })
  const first = await syncInbox({ db, imagesDir: join(dir, 'images'), inboxUrl: 'https://inbox.example', token: TOKEN, fetch: w.fetch })
  assert.equal(first.failed.length, 1)
  assert.equal(first.pending, 1)
  const second = await syncInbox({ db, imagesDir: join(dir, 'images'), inboxUrl: 'https://inbox.example', token: TOKEN, fetch: w.fetch })
  assert.deepEqual([second.created, second.alreadyHere, second.pending], [0, 1, 0])
  assert.equal(db.prepare("SELECT count(*) n FROM bookmarks WHERE url = 'https://linear.app/method'").get().n, 1)
})

test('a failed image download leaves that item for next time and carries on', async () => {
  const { db, dir } = makeDb()
  const w = fakeWorker(ITEMS, { failImage: 'a1' })
  const r = await syncInbox({ db, imagesDir: join(dir, 'images'), inboxUrl: 'https://inbox.example', token: TOKEN, fetch: w.fetch })
  assert.deepEqual(r.failed.map((f) => f.id), ['a1'])
  assert.equal(r.created, 2)
  assert.ok(!w.synced.has('a1'))
  assert.equal(db.prepare("SELECT count(*) n FROM bookmarks WHERE kind = 'image'").get().n, 0, 'nothing half-written')
})

test('a link already in the library gets the phone’s screenshot instead of a copy', async () => {
  const { db, dir } = makeDb()
  const id = addSave(db, { url: 'https://stripe.com/pricing', title: 'Pricing' })
  const r = await syncInbox({ db, imagesDir: join(dir, 'images'), inboxUrl: 'https://inbox.example', token: TOKEN, fetch: fakeWorker([ITEMS[2]]).fetch })
  assert.deepEqual([r.created, r.addedTo, r.changed], [0, 1, [id]])
  assert.equal(db.prepare('SELECT image_path FROM bookmarks WHERE id = ?').get(id).image_path, 'phone_c3_01.png')
})

test('a wrong token stops the run with a clear error; test connection reports pending', async () => {
  const { db, dir } = makeDb()
  const w = fakeWorker(ITEMS)
  await assert.rejects(
    syncInbox({ db, imagesDir: join(dir, 'images'), inboxUrl: 'https://inbox.example', token: 'wrong', fetch: w.fetch }),
    /desktop token/
  )
  assert.deepEqual(await testInbox({ inboxUrl: 'https://inbox.example', token: TOKEN, fetch: w.fetch }), { ok: true, pending: 3 })
  await assert.rejects(testInbox({ inboxUrl: 'http://inbox.example', token: TOKEN, fetch: w.fetch }), /https/)
})
