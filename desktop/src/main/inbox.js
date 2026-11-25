// Phone inbox: writing items synced from the Worker into the library, and the
// drawer's paste-link button (docs/phase-3-phone-inbox-plan.md).
//
// No Electron imports and no network: the MCP tests run this against the app's
// own schema. Every function takes the better-sqlite3 handle it writes to.
// Downloading images and fetching link previews happen in sync.js / ipc.js.
//
// Rules:
//   - Each inbox item is applied once (inbox_applied), even if it is deleted
//     here afterwards. Re-syncing never brings back a save Mike trashed.
//   - A link already in the library isn't saved twice. The phone's images and
//     note are added to the existing save. Instagram links match on post id,
//     so a reel shared from the phone finds the save the export import made.
//   - Nothing here overwrites a note, a title Mike typed, tags or a cover image.
import { randomUUID } from 'node:crypto'
import { instagramPostId, normalizeUrl, platformFor } from './schema.js'
import { canonicalUrl } from './instagram.js'

export const PHONE_SOURCE = 'phone'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Screenshot · 25 Nov", or the note's first line when there is one. */
export function imageTitle(note, savedAt) {
  const first = (note || '').split('\n').map((l) => l.trim()).find(Boolean)
  if (first) return first.length > 90 ? first.slice(0, 89).trimEnd() + '…' : first
  const d = new Date(savedAt)
  if (Number.isNaN(d.getTime())) return 'Screenshot'
  return `Screenshot · ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** The first http(s) URL in text that an Android app shared, or null. */
export function firstUrl(text) {
  if (typeof text !== 'string') return null
  const m = text.match(/https?:\/\/[^\s<>"']+/i)
  if (!m) return null
  return m[0].replace(/[),.;!?]+$/, '')
}

/** Every column a URL decides, in one place, so paste-link and sync agree. */
export function linkFields(rawUrl) {
  const pid = instagramPostId(rawUrl)
  const url = pid ? canonicalUrl(pid) : rawUrl
  let domain = null
  try {
    domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    /* left null */
  }
  return {
    url,
    normalized_url: normalizeUrl(url),
    platform: platformFor(url),
    external_id: pid,
    domain,
    kind: 'link'
  }
}

/** A live save with this link (by Instagram post id, else by normalized URL), or null. */
export function findExisting(db, rawUrl, { exceptId = null } = {}) {
  const f = linkFields(rawUrl)
  const rows = f.external_id
    ? db.prepare("SELECT * FROM bookmarks WHERE deleted_at IS NULL AND (external_id = ? OR normalized_url = ?)").all(f.external_id, f.normalized_url)
    : db.prepare('SELECT * FROM bookmarks WHERE deleted_at IS NULL AND normalized_url = ?').all(f.normalized_url)
  return rows.find((r) => r.id !== exceptId) ?? null
}

function frameCount(db, id) {
  return db.prepare('SELECT coalesce(max(position), 0) AS n FROM bookmark_images WHERE bookmark_id = ?').get(id).n
}

/**
 * Append frames to a save. The first frame becomes the cover only if the save
 * has none. A save with a cover but no frame rows gets its cover listed as
 * frame 1 first, so the order Claude Code sees matches the card.
 */
function addFrames(db, id, frames) {
  if (!frames.length) return
  const row = db.prepare('SELECT image_path, image_w, image_h FROM bookmarks WHERE id = ?').get(id)
  const ins = db.prepare(
    'INSERT INTO bookmark_images (bookmark_id, position, image_path, image_w, image_h, label) VALUES (?, ?, ?, ?, ?, ?)'
  )
  let pos = frameCount(db, id)
  if (pos === 0 && row.image_path) ins.run(id, ++pos, row.image_path, row.image_w, row.image_h, null)
  for (const f of frames) ins.run(id, ++pos, f.name, f.w ?? null, f.h ?? null, f.label ?? null)
  if (!row.image_path) {
    db.prepare(`UPDATE bookmarks SET image_path = ?, image_w = ?, image_h = ?, preview_source = 'screenshot', focal_y = 0
      WHERE id = ?`).run(frames[0].name, frames[0].w ?? null, frames[0].h ?? null, id)
  }
}

function appendNote(db, id, note) {
  const n = (note || '').trim()
  if (!n) return
  const cur = db.prepare('SELECT note FROM bookmarks WHERE id = ?').get(id).note
  if (cur && cur.includes(n)) return
  db.prepare('UPDATE bookmarks SET note = ? WHERE id = ?').run(cur ? `${cur}\n\n${n}` : n, id)
}

/**
 * Write one synced inbox item. `frames` are images already downloaded into the
 * image cache: [{ name, w, h }]. Returns { status, id, needsPreview }:
 *   'applied-before'  this item was written on an earlier sync; nothing changed
 *   'created'         a new save
 *   'added-to'        merged into a save that was already here
 * needsPreview is true for a new link save, which the caller enriches the way
 * any new link is (title, summary, favicon, and a preview if it has no image).
 */
export function applyInboxItem(db, item, frames = []) {
  const url = item.url ? firstUrl(item.url) ?? item.url : null
  if (!url && !frames.length) throw new Error(`inbox item ${item.id} has neither a link nor an image`)
  const now = new Date().toISOString()

  return db.transaction(() => {
    if (db.prepare('SELECT 1 FROM inbox_applied WHERE inbox_id = ?').get(item.id)) {
      return { status: 'applied-before', id: null, needsPreview: false }
    }
    const done = (status, id, needsPreview = false) => {
      db.prepare('INSERT INTO inbox_applied (inbox_id, bookmark_id, applied_at) VALUES (?, ?, ?)').run(item.id, id, now)
      return { status, id, needsPreview }
    }

    const existing = url ? findExisting(db, url) : null
    if (existing) {
      addFrames(db, existing.id, frames)
      appendNote(db, existing.id, item.note)
      return done('added-to', existing.id)
    }

    const id = randomUUID()
    const savedAt = item.saved_at || now
    const link = url ? linkFields(url) : null
    db.prepare(`INSERT INTO bookmarks (id, url, normalized_url, platform, external_id, domain, kind, title, note,
        created_at, source, favorited, is_dead)
      VALUES (@id, @url, @normalized_url, @platform, @external_id, @domain, @kind, @title, @note,
        @created_at, @source, 0, 0)`).run({
      id,
      url: link?.url ?? null,
      normalized_url: link?.normalized_url ?? null,
      platform: link?.platform ?? null,
      external_id: link?.external_id ?? null,
      domain: link?.domain ?? null,
      kind: link ? 'link' : 'image',
      title: link ? link.domain : imageTitle(item.note, savedAt),
      note: (item.note || '').trim() || null,
      created_at: savedAt,
      source: PHONE_SOURCE
    })
    addFrames(db, id, frames)
    return done('created', id, !!link)
  })()
}

/**
 * The drawer's paste-link button, on a save with no URL.
 *   { status: 'attached', id }            the link is now this save's
 *   { status: 'duplicate', existing }     another save has it; ask before merging
 */
export function attachLink(db, id, rawUrl) {
  const url = firstUrl(rawUrl) ?? rawUrl
  const f = linkFields(url)
  if (!f.normalized_url || !/^https?:\/\//i.test(f.url)) throw new Error('That doesn’t look like a link.')
  const existing = findExisting(db, url, { exceptId: id })
  if (existing) return { status: 'duplicate', existing }
  db.prepare(`UPDATE bookmarks SET url = @url, normalized_url = @normalized_url, platform = @platform,
      external_id = coalesce(external_id, @external_id), domain = @domain, kind = 'link' WHERE id = @id`).run({ id, ...f })
  return { status: 'attached', id }
}

/**
 * Fold an image save into a link save that already exists: its frames, note
 * and tags move over, then it is deleted. The target keeps its own cover,
 * title, date and everything else.
 */
export function mergeInto(db, fromId, toId) {
  if (fromId === toId) throw new Error('Can’t merge a save into itself')
  db.transaction(() => {
    const from = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(fromId)
    if (!from) throw new Error('That save no longer exists')
    let frames = db
      .prepare('SELECT image_path AS name, image_w AS w, image_h AS h, label FROM bookmark_images WHERE bookmark_id = ? ORDER BY position')
      .all(fromId)
    if (!frames.length && from.image_path) frames = [{ name: from.image_path, w: from.image_w, h: from.image_h }]
    addFrames(db, toId, frames)
    appendNote(db, toId, from.note)
    db.prepare(`INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
      SELECT ?, tag_id FROM bookmark_tags WHERE bookmark_id = ?`).run(toId, fromId)
    db.prepare('UPDATE inbox_applied SET bookmark_id = ? WHERE bookmark_id = ?').run(toId, fromId)
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(fromId)
  })()
  return { status: 'merged', id: toId }
}
