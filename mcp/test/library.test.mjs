// The MCP server's read layer, plus one end-to-end run over stdio.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { Library } from '../dist/library.js'
import { makeDb, addSave, addTag, writeImage, SECRET } from './fixtures.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const days = (n) => new Date(Date.now() - n * 86400_000).toISOString()

function seeded() {
  const fx = makeDb()
  const { db, dir } = fx
  db.prepare("INSERT INTO settings (key, value) VALUES ('anthropic_api_key', ?)").run(SECRET)
  const ui = addTag(db, 'ui')
  const ids = {
    onboarding: addSave(db, {
      title: 'Duolingo signup', note: 'great onboarding screen, progress bar at top', tags: [ui],
      url: 'https://www.instagram.com/p/xyz/', image_path: 'aaaa1111.png', image_w: 1080, image_h: 2400,
      created_at: days(1)
    }),
    aiOnly: addSave(db, { title: 'IMG_2041', ai_description: 'Mobile onboarding flow, step 2 of 4', created_at: days(2) }),
    other: addSave(db, { title: 'Pricing page teardown', url: 'https://stripe.com/pricing', created_at: days(10) }),
    trashed: addSave(db, { title: 'Old onboarding screen', deleted_at: days(0), created_at: days(0) }),
    archived: addSave(db, { title: 'Archived onboarding notes', archived_at: days(3), created_at: days(30) })
  }
  writeImage(dir, 'aaaa1111.png')
  db.close()
  return { ...fx, ids }
}

test('search: the motivating question finds the right save, trash excluded', () => {
  const { path, ids } = seeded()
  const lib = new Library(path)
  const res = lib.search('find the onboarding screen I saved')
  assert.equal(res[0].id, ids.onboarding)
  assert.ok(!res.some((r) => r.id === ids.trashed), 'trashed save hidden')
  assert.ok(res.some((r) => r.id === ids.aiOnly), 'AI description is searched')
  assert.match(res[0].matched, /«onboarding»/)
  assert.ok(res[0].image_path.endsWith(join('images', 'aaaa1111.png')))
})

test('search: prefix, tag, platform and archive filters', () => {
  const { path, ids } = seeded()
  const lib = new Library(path)
  // Prefix match. Title hits outrank note hits, so only membership is asserted here.
  assert.ok(lib.search('onboard').some((r) => r.id === ids.onboarding))
  assert.deepEqual(lib.search('onboarding', { tag: 'UI' }).map((r) => r.id), [ids.onboarding])
  assert.deepEqual(lib.search('onboarding', { platform: 'instagram' }).map((r) => r.id), [ids.onboarding])
  assert.ok(!lib.search('onboarding', { includeArchived: false }).some((r) => r.id === ids.archived))
  assert.deepEqual(lib.search('   '), [])
  assert.deepEqual(lib.search('zzzz-nothing'), [])
})

test('get_save: full record with a real image path; trash refused', () => {
  const { path, ids, dir } = seeded()
  const lib = new Library(path)
  const s = lib.get(ids.onboarding)
  assert.equal(s.platform, 'instagram')
  assert.deepEqual(s.tags, ['ui'])
  assert.deepEqual(s.image, { path: join(dir, 'images', 'aaaa1111.png'), exists: true, width: 1080, height: 2400 })
  assert.match(lib.get(ids.trashed).error, /trash/)
  assert.match(lib.get('nope').error, /No save/)
})

test('list_recent: newest first, day window', () => {
  const { path, ids } = seeded()
  const lib = new Library(path)
  assert.deepEqual(lib.recent({ limit: 2 }).map((r) => r.id), [ids.onboarding, ids.aiOnly])
  assert.deepEqual(lib.recent({ days: 5 }).map((r) => r.id), [ids.onboarding, ids.aiOnly])
})

test('never exposes settings', () => {
  const { path, ids } = seeded()
  const lib = new Library(path)
  const everything = JSON.stringify([
    lib.search('onboarding'), lib.search('anthropic key'), lib.recent({ limit: 100 }),
    ...Object.values(ids).map((id) => lib.get(id))
  ])
  assert.ok(!everything.includes(SECRET))
})

test('works on a library the app has not migrated yet (v1)', () => {
  const { db, path } = makeDb({ version: 1 })
  const id = addSave(db, { title: 'Onboarding patterns', url: 'https://www.instagram.com/p/1/' })
  db.close()
  const lib = new Library(path)
  assert.equal(lib.schemaVersion, 1)
  assert.equal(lib.search('onboarding')[0].id, id)
  assert.equal(lib.recent({ platform: 'instagram' })[0].id, id)
})

test('read-only: opens a closed WAL database and sees the app\'s later writes', () => {
  const { path } = seeded()
  const lib = new Library(path)
  assert.throws(() => lib['db'].prepare('DELETE FROM bookmarks').run(), /readonly/i)
  const app = new Database(path) // the app writing while the server is open
  addSave(app, { title: 'Brand new checkout screen' })
  app.close()
  assert.equal(lib.search('checkout')[0].title, 'Brand new checkout screen')
})

test('missing database gives a readable error', () => {
  assert.throws(() => new Library('/nonexistent/staaash.db'), /Launch the staaash app once/)
})

test('end to end over stdio', async () => {
  const { path, ids } = seeded()
  const client = new Client({ name: 'test', version: '0' })
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [join(HERE, '../dist/index.js')],
    env: { ...process.env, STAAASH_DB: path }
  }))
  try {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort()
    assert.deepEqual(tools, ['get_save', 'list_recent', 'search_saves'])
    const r = await client.callTool({ name: 'search_saves', arguments: { query: 'onboarding screen' } })
    const body = JSON.parse(r.content[0].text)
    assert.equal(body.results[0].id, ids.onboarding)
    const g = await client.callTool({ name: 'get_save', arguments: { id: ids.onboarding } })
    assert.equal(JSON.parse(g.content[0].text).image.exists, true)
  } finally {
    await client.close()
  }
})
