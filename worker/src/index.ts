// staaash phone inbox (docs/phase-3-phone-inbox-plan.md).
//
// The phone posts links and screenshots here; the Mac app pulls them down and
// marks them synced. Rows and images are kept after sync.
//
// Two tokens, two powers:
//   PHONE_TOKEN    can only create items (POST /items) and check itself.
//   DESKTOP_TOKEN  can read items and images and mark items synced.
// Neither can do the other's job, so a token lifted from the phone can add
// junk to the inbox but can't read anything in it.

export interface Env {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS?: Fetcher
  PHONE_TOKEN: string
  DESKTOP_TOKEN: string
}

export const LIMITS = {
  imagesPerItem: 10,
  imageBytes: 15 * 1024 * 1024,
  noteChars: 4000,
  urlChars: 4000,
  // A screenshot and a link saved within this many seconds of each other,
  // one with only images and one with only a link, become one item.
  mergeSeconds: 120,
  pageSize: 50
}

const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif'
}

type StoredImage = { key: string; type: string; size: number }
type ItemRow = {
  id: string
  saved_at: string
  received_at: string
  url: string | null
  note: string | null
  images: string
  synced_at: string | null
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
const fail = (status: number, error: string) => json({ error }, status)

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return await route(req, env)
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message)
      console.error(e)
      return fail(500, 'Something went wrong in the inbox.')
    }
  }
} satisfies ExportedHandler<Env>

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const m = req.method

  if (path === '/' && m === 'GET') return Response.redirect(new URL('/app/', url).toString(), 302)
  if (path === '/health' && m === 'GET') return json({ ok: true, app: 'staaash-inbox' })

  // The phone app's share target posts here. When its service worker is
  // running it catches the post first and queues it on the phone; this is the
  // fallback for the very first share, before the service worker exists.
  if (path === '/app/share' && m === 'POST') return Response.redirect(new URL('/app/?share=lost', url).toString(), 303)

  if (path === '/phone/check' && m === 'GET') {
    await requireToken(req, env.PHONE_TOKEN)
    return json({ ok: true, can: 'create' })
  }
  if (path === '/items' && m === 'POST') {
    await requireToken(req, env.PHONE_TOKEN)
    return createItem(req, env)
  }
  if (path === '/items' && m === 'GET') {
    await requireToken(req, env.DESKTOP_TOKEN)
    return listUnsynced(url, env)
  }
  const synced = path.match(/^\/items\/([\w-]+)\/synced$/)
  if (synced && m === 'POST') {
    await requireToken(req, env.DESKTOP_TOKEN)
    return markSynced(synced[1], env)
  }
  if (path.startsWith('/images/') && m === 'GET') {
    await requireToken(req, env.DESKTOP_TOKEN)
    return getImage(decodeURIComponent(path.slice('/images/'.length)), env)
  }
  return fail(404, 'Not found')
}

// ── Auth ──

async function digest(s: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
}

/** Constant-time: both sides hashed to the same length, then compared. */
async function requireToken(req: Request, expected: string | undefined) {
  const header = req.headers.get('authorization') || ''
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  // A missing secret must never match a missing header.
  if (!expected || expected.length < 16 || !given) throw new HttpError(401, 'Unauthorized')
  const [a, b] = await Promise.all([digest(given), digest(expected)])
  if (!crypto.subtle.timingSafeEqual(a, b)) throw new HttpError(401, 'Unauthorized')
}

// ── Create ──

function firstUrl(text: string | null): string | null {
  if (!text) return null
  const m = text.match(/https?:\/\/[^\s<>"']+/i)
  return m ? m[0].replace(/[),.;!?]+$/, '') : null
}

function cleanTime(raw: string | File | null, now: string): string {
  if (typeof raw !== 'string') return now
  const t = Date.parse(raw)
  // A phone clock can be off; anything implausible falls back to now.
  if (Number.isNaN(t) || t > Date.now() + 24 * 3600e3 || t < Date.parse('2020-01-01')) return now
  return new Date(t).toISOString()
}

async function createItem(req: Request, env: Env): Promise<Response> {
  const type = req.headers.get('content-type') || ''
  if (!type.startsWith('multipart/form-data')) throw new HttpError(415, 'Send the save as multipart/form-data.')
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    throw new HttpError(400, 'Couldn’t read that save.')
  }

  const clientId = String(form.get('client_id') || '').trim()
  if (!/^[\w-]{8,64}$/.test(clientId)) throw new HttpError(400, 'Missing client_id.')
  const seen = await env.DB.prepare('SELECT item_id FROM received WHERE client_id = ?').bind(clientId).first<{ item_id: string }>()
  if (seen) return json({ ok: true, id: seen.item_id, repeat: true })

  const now = new Date().toISOString()
  // Android apps put a shared link in `url`, in `text` with words around it,
  // or (some) in `title`. Take the first link found in any of them.
  const rawUrl = ['url', 'text', 'title'].map((k) => firstUrl(String(form.get(k) ?? ''))).find(Boolean) ?? null
  if (rawUrl && rawUrl.length > LIMITS.urlChars) throw new HttpError(413, 'That link is too long.')
  // Words shared alongside a link (Instagram's "Check out this reel…") are
  // noise; a note is only what Mike typed.
  const note = String(form.get('note') ?? '').trim().slice(0, LIMITS.noteChars) || null

  const files = form.getAll('image').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f)
  if (files.length > LIMITS.imagesPerItem) throw new HttpError(413, `At most ${LIMITS.imagesPerItem} images per save.`)
  for (const f of files) {
    if (!IMAGE_TYPES[f.type]) throw new HttpError(415, `${f.name || 'A file'} isn’t an image staaash can keep.`)
    if (f.size > LIMITS.imageBytes) throw new HttpError(413, `${f.name || 'An image'} is over 15 MB.`)
    if (f.size === 0) throw new HttpError(400, `${f.name || 'An image'} is empty.`)
  }
  if (!rawUrl && !files.length) throw new HttpError(400, 'Nothing to save: no link and no image.')

  const savedAt = cleanTime(form.get('saved_at'), now)
  const target = await mergeTarget(env, savedAt, !!rawUrl, files.length > 0)
  const id = target?.id ?? crypto.randomUUID()

  const startAt = target ? (JSON.parse(target.images) as StoredImage[]).length : 0
  const stored: StoredImage[] = []
  for (const [i, f] of files.entries()) {
    const key = `items/${id}/${String(startAt + i + 1).padStart(2, '0')}-${crypto.randomUUID().slice(0, 8)}.${IMAGE_TYPES[f.type]}`
    await env.IMAGES.put(key, f.stream(), { httpMetadata: { contentType: f.type } })
    stored.push({ key, type: f.type, size: f.size })
  }

  if (target) {
    const images = [...(JSON.parse(target.images) as StoredImage[]), ...stored]
    const mergedNote = [target.note, note].filter(Boolean).join('\n\n') || null
    const r = await env.DB.prepare('UPDATE items SET url = coalesce(url, ?), note = ?, images = ? WHERE id = ? AND synced_at IS NULL')
      .bind(rawUrl, mergedNote, JSON.stringify(images), target.id)
      .run()
    // The desktop synced the target in the moment between finding it and
    // updating it: save this one on its own instead.
    if (r.meta.changes) {
      await env.DB.prepare('INSERT INTO received (client_id, item_id) VALUES (?, ?)').bind(clientId, target.id).run()
      return json({ ok: true, id: target.id, merged: true })
    }
  }

  const newId = target ? crypto.randomUUID() : id
  await env.DB.batch([
    env.DB.prepare('INSERT INTO items (id, saved_at, received_at, url, note, images) VALUES (?, ?, ?, ?, ?, ?)').bind(
      newId,
      savedAt,
      now,
      rawUrl,
      note,
      JSON.stringify(stored)
    ),
    env.DB.prepare('INSERT INTO received (client_id, item_id) VALUES (?, ?)').bind(clientId, newId)
  ])
  return json({ ok: true, id: newId, merged: false }, 201)
}

/**
 * The unsynced item this save completes, if any: saved within the window,
 * and one side has only a link while the other has only images. The closest
 * in time wins. A synced item is never changed.
 */
async function mergeTarget(env: Env, savedAt: string, hasUrl: boolean, hasImages: boolean): Promise<ItemRow | null> {
  if (hasUrl === hasImages) return null // both or neither: nothing to complete
  const t = Date.parse(savedAt)
  const lo = new Date(t - LIMITS.mergeSeconds * 1000).toISOString()
  const hi = new Date(t + LIMITS.mergeSeconds * 1000).toISOString()
  const want = hasUrl ? "url IS NULL AND images <> '[]'" : "url IS NOT NULL AND images = '[]'"
  const { results } = await env.DB.prepare(
    `SELECT * FROM items WHERE synced_at IS NULL AND saved_at BETWEEN ? AND ? AND ${want}`
  )
    .bind(lo, hi)
    .all<ItemRow>()
  if (!results.length) return null
  return results.sort((a, b) => Math.abs(Date.parse(a.saved_at) - t) - Math.abs(Date.parse(b.saved_at) - t))[0]
}

// ── Desktop ──

async function listUnsynced(url: URL, env: Env): Promise<Response> {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? LIMITS.pageSize) || 0, 0), 200)
  const { results } = await env.DB.prepare(
    'SELECT * FROM items WHERE synced_at IS NULL ORDER BY received_at, id LIMIT ?'
  )
    .bind(limit)
    .all<ItemRow>()
  const pending = await env.DB.prepare('SELECT count(*) AS n FROM items WHERE synced_at IS NULL').first<{ n: number }>()
  return json({
    items: results.map((r) => ({
      id: r.id,
      saved_at: r.saved_at,
      url: r.url,
      note: r.note,
      images: JSON.parse(r.images) as StoredImage[]
    })),
    pending: pending?.n ?? 0
  })
}

async function markSynced(id: string, env: Env): Promise<Response> {
  const r = await env.DB.prepare('UPDATE items SET synced_at = coalesce(synced_at, ?) WHERE id = ?')
    .bind(new Date().toISOString(), id)
    .run()
  if (!r.meta.changes) throw new HttpError(404, 'No such item.')
  return json({ ok: true })
}

async function getImage(key: string, env: Env): Promise<Response> {
  if (!/^items\/[\w-]+\/[\w.-]+$/.test(key)) throw new HttpError(404, 'Not found')
  const obj = await env.IMAGES.get(key)
  if (!obj) throw new HttpError(404, 'Not found')
  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'content-length': String(obj.size),
      'cache-control': 'private, max-age=0'
    }
  })
}
