// Pull the phone inbox down from the Worker (docs/phase-3-phone-inbox-plan.md).
//
// No Electron imports: the MCP tests run this against a fake Worker. The
// caller passes the database handle, the image cache folder and fetch.
//
// Order per item, so a crash anywhere can't lose or double a save:
//   1. download its images into the cache (fixed names: a retry overwrites)
//   2. write the save (inbox_applied records the item in the same transaction)
//   3. tell the Worker it's synced
// A crash after 2 means the next sync sees it in inbox_applied, skips the
// write and just marks it synced.
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { applyInboxItem } from './inbox.js'
import { imageSize } from './imageSize.js'

const EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif'
}
const MAX_PAGES = 20 // 20 × 50 items a run; anything beyond waits for the next run

export class InboxError extends Error {
  constructor(message, { status = 0, auth = false } = {}) {
    super(message)
    this.status = status
    this.auth = auth
  }
}

function base(inboxUrl) {
  const u = String(inboxUrl || '').trim().replace(/\/+$/, '')
  if (!/^https:\/\/[^\s/]+/i.test(u)) throw new InboxError('The inbox address should start with https://')
  return u
}

async function call(fetchFn, url, token, init = {}) {
  let res
  try {
    res = await fetchFn(url, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${token}` } })
  } catch (e) {
    throw new InboxError(`Couldn’t reach the inbox (${e.cause?.code || e.message}).`)
  }
  if (res.status === 401) throw new InboxError('The inbox didn’t accept the desktop token.', { status: 401, auth: true })
  if (!res.ok) throw new InboxError(`The inbox answered ${res.status}.`, { status: res.status })
  return res
}

/** Settings › Test connection. Returns how many items are waiting. */
export async function testInbox({ inboxUrl, token, fetch: fetchFn = globalThis.fetch }) {
  if (!token) throw new InboxError('Add the desktop token first.')
  const res = await call(fetchFn, `${base(inboxUrl)}/items?limit=0`, token)
  const body = await res.json()
  return { ok: true, pending: body.pending ?? 0 }
}

/**
 * One sync run. Returns counts plus the ids of new link saves that still need
 * their page read (the caller enriches them; that needs the network and
 * Electron, so it doesn't happen here).
 */
export async function syncInbox({ db, imagesDir, inboxUrl, token, fetch: fetchFn = globalThis.fetch }) {
  const root = base(inboxUrl)
  if (!token) throw new InboxError('Add the desktop token first.')
  await mkdir(imagesDir, { recursive: true })
  const out = { created: 0, addedTo: 0, alreadyHere: 0, failed: [], needsPreview: [], changed: [], pending: 0 }
  const tried = new Set()

  for (let page = 0; page < MAX_PAGES; page++) {
    const body = await (await call(fetchFn, `${root}/items?limit=50`, token)).json()
    const fresh = body.items.filter((i) => !tried.has(i.id))
    if (!fresh.length) break

    for (const item of fresh) {
      tried.add(item.id)
      try {
        const frames = []
        for (const [i, img] of (item.images || []).entries()) {
          const res = await call(fetchFn, `${root}/images/${img.key.split('/').map(encodeURIComponent).join('/')}`, token)
          const name = `phone_${item.id}_${String(i + 1).padStart(2, '0')}.${EXT[img.type] || 'img'}`
          const path = join(imagesDir, name)
          await writeFile(path, Buffer.from(await res.arrayBuffer()))
          const size = await imageSize(path).catch(() => null)
          frames.push({ name, w: size?.w ?? null, h: size?.h ?? null })
        }
        const r = applyInboxItem(db, item, frames)
        if (r.status === 'created') out.created++
        else if (r.status === 'added-to') out.addedTo++
        else out.alreadyHere++
        if (r.id) out.changed.push(r.id)
        if (r.needsPreview) out.needsPreview.push(r.id)
        await call(fetchFn, `${root}/items/${encodeURIComponent(item.id)}/synced`, token, { method: 'POST' })
      } catch (e) {
        if (e instanceof InboxError && e.auth) throw e
        // Left unsynced on the Worker, so the next run tries it again.
        out.failed.push({ id: item.id, error: e.message })
      }
    }
    if (body.items.length < 50) break
  }
  out.pending = (await (await call(fetchFn, `${root}/items?limit=0`, token)).json()).pending ?? 0
  return out
}
