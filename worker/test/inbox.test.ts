import { SELF, env } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'

const PHONE = 'phone-token-for-tests-0001'
const DESK = 'desktop-token-for-tests-0002'
const BASE = 'https://inbox.example'

let n = 0
const cid = () => `client-${Date.now()}-${++n}`
const png = (bytes = 64) => new File([new Uint8Array(bytes).fill(7)], 'shot.png', { type: 'image/png' })

function save(fields: Record<string, string | File | File[] | undefined>, token = PHONE) {
  const form = new FormData()
  if (!('client_id' in fields)) form.set('client_id', cid())
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue
    if (Array.isArray(v)) v.forEach((f) => form.append(k, f))
    else form.append(k, v)
  }
  return SELF.fetch(`${BASE}/items`, { method: 'POST', body: form, headers: { authorization: `Bearer ${token}` } })
}
const desk = (path: string, init: RequestInit = {}, token = DESK) =>
  SELF.fetch(`${BASE}${path}`, { ...init, headers: { authorization: `Bearer ${token}` } })
async function unsynced() {
  const r = await desk('/items')
  expect(r.status).toBe(200)
  return (await r.json()) as { items: any[]; pending: number }
}
const at = (s: number) => new Date(Date.parse('2026-11-25T10:00:00Z') + s * 1000).toISOString()

describe('tokens', () => {
  it('the phone token can create but not read', async () => {
    expect((await save({ url: 'https://linear.app/method' })).status).toBe(201)
    expect((await desk('/items', {}, PHONE)).status).toBe(401)
    expect((await SELF.fetch(`${BASE}/phone/check`, { headers: { authorization: `Bearer ${PHONE}` } })).status).toBe(200)
  })
  it('the desktop token can read but not create', async () => {
    expect((await save({ url: 'https://linear.app/method' }, DESK)).status).toBe(401)
    expect((await desk('/items')).status).toBe(200)
  })
  it('no token, a wrong token, or a near miss gets a bare 401', async () => {
    for (const h of <HeadersInit[]>[{}, { authorization: 'Bearer nope' }, { authorization: `Bearer ${DESK}x` }, { authorization: DESK }]) {
      const r = await SELF.fetch(`${BASE}/items`, { headers: h })
      expect(r.status).toBe(401)
      expect(await r.json()).toEqual({ error: 'Unauthorized' })
    }
  })
  it('health and the phone app need no token', async () => {
    expect((await SELF.fetch(`${BASE}/health`)).status).toBe(200)
  })
})

describe('creating', () => {
  it('saves a link, pulling it out of Android share text', async () => {
    const r = await save({ text: 'Check out this reel! https://www.instagram.com/reel/ABC/?igsh=x', saved_at: at(-20_000) })
    expect(r.status).toBe(201)
    const { id } = (await r.json()) as any
    const item = (await unsynced()).items.find((i) => i.id === id)
    expect(item.url).toBe('https://www.instagram.com/reel/ABC/?igsh=x')
    expect(item.note).toBeNull()
    expect(item.saved_at).toBe(at(-20_000))
  })
  it('saves screenshots to R2 with the note', async () => {
    const r = await save({ image: [png(), png(80)], note: 'checkout empty state', saved_at: at(-10_000) })
    const { id } = (await r.json()) as any
    const item = (await unsynced()).items.find((i) => i.id === id)
    expect(item.url).toBeNull()
    expect(item.note).toBe('checkout empty state')
    expect(item.images.map((i: any) => i.size)).toEqual([64, 80])
    const img = await desk(`/images/${item.images[0].key}`)
    expect(img.status).toBe(200)
    expect(img.headers.get('content-type')).toBe('image/png')
    expect((await img.arrayBuffer()).byteLength).toBe(64)
  })
  it('refuses empty saves, non-images, oversize and too many images', async () => {
    expect((await save({ note: 'just words' })).status).toBe(400)
    expect((await save({ image: new File(['x'], 'a.pdf', { type: 'application/pdf' }) })).status).toBe(415)
    expect((await save({ image: Array.from({ length: 11 }, () => png()) })).status).toBe(413)
    const big = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    expect((await save({ image: big })).status).toBe(413)
    const noId = new FormData()
    noId.set('url', 'https://x.dev')
    expect((await SELF.fetch(`${BASE}/items`, { method: 'POST', body: noId, headers: { authorization: `Bearer ${PHONE}` } })).status).toBe(400)
  })
  it('a retried save with the same client_id is stored once', async () => {
    const id = cid()
    const a = (await (await save({ client_id: id, url: 'https://stripe.com/pricing' })).json()) as any
    const b = (await (await save({ client_id: id, url: 'https://stripe.com/pricing' })).json()) as any
    expect(b).toEqual({ ok: true, id: a.id, repeat: true })
    const count = await env.DB.prepare('SELECT count(*) AS n FROM items WHERE url = ?').bind('https://stripe.com/pricing').first<{ n: number }>()
    expect(count?.n).toBe(1)
  })
  it('an implausible phone clock falls back to now', async () => {
    const { id } = (await (await save({ url: 'https://a.dev', saved_at: '1999-01-01T00:00:00Z' })).json()) as any
    const item = (await unsynced()).items.find((i) => i.id === id)
    expect(Date.now() - Date.parse(item.saved_at)).toBeLessThan(60_000)
  })
})

describe('merge window', () => {
  it('screenshot then link within 2 minutes become one item', async () => {
    const shot = (await (await save({ image: png(), note: 'pricing table', saved_at: at(0) })).json()) as any
    const link = (await (await save({ url: 'https://stripe.com/pricing', saved_at: at(90) })).json()) as any
    expect(link).toMatchObject({ id: shot.id, merged: true })
    const item = (await unsynced()).items.find((i) => i.id === shot.id)
    expect(item.url).toBe('https://stripe.com/pricing')
    expect(item.images).toHaveLength(1)
    expect(item.note).toBe('pricing table')
  })
  it('link then screenshot works too, and the notes join', async () => {
    const link = (await (await save({ url: 'https://linear.app/x', note: 'nav', saved_at: at(1000) })).json()) as any
    const shot = (await (await save({ image: [png(), png()], note: 'sidebar', saved_at: at(1050) })).json()) as any
    expect(shot).toMatchObject({ id: link.id, merged: true })
    const item = (await unsynced()).items.find((i) => i.id === link.id)
    expect(item.images.map((i: any) => i.key.split('/')[2].slice(0, 2))).toEqual(['01', '02'])
    expect(item.note).toBe('nav\n\nsidebar')
  })
  it('outside the window, or two of a kind, stay separate', async () => {
    const a = (await (await save({ image: png(), saved_at: at(2000) })).json()) as any
    const late = (await (await save({ url: 'https://a.dev/late', saved_at: at(2000 + 121) })).json()) as any
    expect(late.id).not.toBe(a.id)
    const b = (await (await save({ image: png(), saved_at: at(3000) })).json()) as any
    const c = (await (await save({ image: png(), saved_at: at(3010) })).json()) as any
    expect(c.id).not.toBe(b.id)
    const both = (await (await save({ image: png(), url: 'https://a.dev/both', saved_at: at(3020) })).json()) as any
    expect(both.merged).toBe(false)
  })
  it('a synced item is never merged into', async () => {
    const shot = (await (await save({ image: png(), saved_at: at(4000) })).json()) as any
    expect((await desk(`/items/${shot.id}/synced`, { method: 'POST' })).status).toBe(200)
    const link = (await (await save({ url: 'https://a.dev/after', saved_at: at(4030) })).json()) as any
    expect(link.id).not.toBe(shot.id)
  })
})

describe('sync', () => {
  it('lists unsynced oldest first, and marking synced removes from the list but keeps everything', async () => {
    const { id } = (await (await save({ image: png(), url: 'https://keep.dev', saved_at: at(5000) })).json()) as any
    const before = await unsynced()
    expect(before.items.some((i) => i.id === id)).toBe(true)
    const received = before.items.map((i) => i.id)
    expect(received).toEqual([...received]) // stable order
    const key = before.items.find((i) => i.id === id).images[0].key

    expect((await desk(`/items/${id}/synced`, { method: 'POST' })).status).toBe(200)
    expect((await desk(`/items/${id}/synced`, { method: 'POST' })).status).toBe(200) // idempotent
    expect((await unsynced()).items.some((i) => i.id === id)).toBe(false)
    expect((await desk(`/images/${key}`)).status).toBe(200) // image kept after sync
    expect((await desk('/items/nope/synced', { method: 'POST' })).status).toBe(404)
  })
  it('image keys outside the inbox are refused', async () => {
    expect((await desk('/images/..%2Fsecret')).status).toBe(404)
    expect((await desk('/images/other/thing.png')).status).toBe(404)
  })
})
