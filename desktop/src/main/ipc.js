// Typed IPC channels between renderer and main.
// The renderer never touches the filesystem — everything goes through here.
// Channel names are the single source of truth shared with the preload script.
import { ipcMain, shell, dialog, clipboard, app } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import * as db from './db.js'
import { extractMeta, cacheImage, checkLink, cleanText, fetchFavicon } from './extract.js'
import { imageSize } from './imageSize.js'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { askStaaash, suggestCollection } from './ai.js'

/**
 * Everything a card needs to know about its preview before the image loads:
 * intrinsic size, where it came from, and where to hold it if it has to crop.
 *
 * focal_y is stored rather than derived at render time so a smarter focal
 * detector can overwrite a single row later without the renderer changing. Until
 * one exists the value is a function of preview_source:
 *
 *   screenshot -> 0    a page screenshot's subject is its header and hero; the
 *                      bottom of a tall screenshot is footer.
 *   og:image   -> 0.5  an og:image is composed to be seen whole, so its subject
 *                      is centred and cropping from either edge is symmetric.
 *   unknown    -> 0.5  centre is the safer wrong answer: it loses half as much
 *                      from the top as top-anchoring loses from the bottom.
 */
export async function previewFacts(image_path, preview_source) {
  if (!image_path) return { preview_source: preview_source ?? null }
  const size = await imageSize(join(db.imagesDir(), image_path))
  return {
    preview_source: preview_source ?? null,
    focal_y: preview_source === 'screenshot' ? 0 : 0.5,
    ...(size ? { image_w: size.w, image_h: size.h } : {})
  }
}

/**
 * Recover a pre-existing row's preview_source from its cache filename.
 *
 * extract.js names cache files by hash, and the two branches hash different
 * things — so the filename itself is the evidence, and it survives even when
 * image_url does not:
 *
 *   og:image   -> sha256(image_url)
 *   screenshot -> sha256(url + ':screenshot')
 *
 * Returns null where neither matches, which is not a failure to handle better:
 * migrate.js nulls an image_url that pointed at the old server's own cache
 * (/api/cached/<hash>), and once that is gone the file's origin is genuinely
 * unrecorded. Measured on a real 293-row library: 236 recover as 'og', 0 as
 * 'screenshot', 7 unrecoverable. Guessing 'screenshot' from a null image_url
 * would have mislabelled all 7 — they are Instagram og:images, and they are also
 * every tall card in the library, so the guess would top-anchor exactly the
 * portrait photos that should stay centred.
 */
export function recoverPreviewSource(b) {
  if (!b.image_path) return null
  const stem = b.image_path.replace(/\.[^.]+$/, '')
  const sha16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16)
  if (b.image_url && stem === sha16(b.image_url)) return 'og'
  if (b.url && stem === sha16(b.url + ':screenshot')) return 'screenshot'
  return null
}

// Smart URL input: auto-prepend https://
export function smartUrl(input) {
  const s = String(input || '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return 'https://' + s
  return null
}

export async function addBookmark({ url, title, note, source, tags }, notify) {
  const finalUrl = smartUrl(url)
  if (!finalUrl) throw new Error('Not a valid URL')
  const dupe = db.findDuplicate(finalUrl)
  if (dupe) return { ...dupe, duplicate: true }

  const domain = (() => {
    try {
      return new URL(finalUrl).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })()

  const item = db.insertBookmark({
    url: finalUrl,
    title: title || domain,
    domain,
    source: source || 'app',
    note: note || null,
    tags: tags || []
  })

  // Enrich in the background; push the update to the renderer when done.
  extractMeta(finalUrl)
    .then(async (meta) => {
      const favicon_path = await fetchFavicon(meta.domain ?? domain).catch(() => null)
      const updated = db.updateBookmark(item.id, {
        title: meta.title ?? item.title,
        summary: meta.summary,
        image_url: meta.image_url,
        image_path: meta.image_path,
        favicon_path,
        domain: meta.domain ?? domain,
        content: meta.content ?? null,
        // Measured here, at save time, so the card has its shape before it first
        // renders. The sweep exists for rows that predate this, not for this one.
        ...(await previewFacts(meta.image_path, meta.preview_source))
      })
      notify?.('bookmarks:updated', updated)
      // Fire-and-forget AI collection suggestion (no-ops without an API key)
      try {
        const collectionId = await suggestCollection(updated)
        if (collectionId) {
          const withCollection = db.updateBookmark(item.id, { collection_id: collectionId })
          notify?.('bookmarks:updated', withCollection)
          notify?.('collections:changed')
        }
      } catch {
        /* suggestion is best-effort */
      }
    })
    .catch(() => {})

  notify?.('bookmarks:added', item)
  return item
}

export function registerIpc(getWindow) {
  const notify = (channel, payload) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
  }

  const handle = (channel, fn) => ipcMain.handle(channel, (_e, ...args) => fn(...args))

  // ── Bookmarks ──
  handle('bookmarks:list', () => db.listBookmarks())
  handle('bookmarks:get', (id) => db.getBookmark(id))
  handle('bookmarks:add', (fields) => addBookmark(fields, notify))
  handle('bookmarks:update', (id, patch) => {
    const updated = db.updateBookmark(id, patch)
    notify('bookmarks:updated', updated)
    return updated
  })
  handle('bookmarks:delete-permanent', (id) => {
    db.deleteBookmarkPermanently(id)
    return { ok: true }
  })
  handle('bookmarks:bulk-update', (ids, patch) => {
    const out = ids.map((id) => db.updateBookmark(id, patch))
    notify('bookmarks:changed')
    return out
  })
  handle('bookmarks:bulk-tag', (ids, tagIds) => {
    db.addTagsToBookmarks(ids, tagIds)
    notify('bookmarks:changed')
    return { ok: true }
  })
  handle('bookmarks:search', (query) => db.searchBookmarks(query))
  handle('bookmarks:check-duplicate', (url) => db.findDuplicate(smartUrl(url) || url))

  // ── Metadata / health ──
  handle('meta:extract', (url) => extractMeta(url))
  handle('meta:refetch', async (id) => {
    const b = db.getBookmark(id)
    if (!b) return null
    const meta = await extractMeta(b.url)
    const updated = db.updateBookmark(id, {
      title: meta.title ?? b.title,
      summary: meta.summary ?? b.summary,
      image_url: meta.image_url ?? b.image_url,
      image_path: meta.image_path ?? b.image_path,
      content: meta.content ?? b.content
    })
    notify('bookmarks:updated', updated)
    return updated
  })
  handle('meta:check-link', async (id) => {
    const b = db.getBookmark(id)
    if (!b) return null
    const result = await checkLink(b.url)
    const updated = db.updateBookmark(id, {
      last_checked: new Date().toISOString(),
      is_dead: !result.ok
    })
    return { ...result, bookmark: updated }
  })

  // ── Tags ──
  handle('tags:list', () => db.listTags())
  handle('tags:create', (name) => db.createTag(name))
  handle('tags:rename', (id, name) => {
    db.renameTag(id, name)
    return { ok: true }
  })
  handle('tags:delete', (id) => {
    db.deleteTag(id)
    return { ok: true }
  })

  // ── Collections ──
  handle('collections:list', () => db.listCollections())
  handle('collections:create', (name, color) => db.createCollection(name, color))
  handle('collections:rename', (id, name) => {
    db.renameCollection(id, name)
    return { ok: true }
  })
  handle('collections:delete', (id) => {
    db.deleteCollection(id)
    return { ok: true }
  })

  // ── Ask Staaash ──
  handle('ask:question', (question) => askStaaash(question))
  handle('ask:has-key', () => !!db.getSetting('anthropic_api_key'))

  // ── Settings ──
  handle('settings:get', (key) => db.getSetting(key))
  handle('settings:set', (key, value) => {
    db.setSetting(key, value)
    return { ok: true }
  })

  // ── System ──
  handle('system:open-external', (url) => shell.openExternal(url))
  handle('system:clipboard-url', () => {
    const text = clipboard.readText().trim()
    return smartUrl(text) && /^https?:\/\//i.test(text) ? text : null
  })

  // ── Import / export ──
  handle('data:export-json', async () => {
    const win = getWindow()
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      defaultPath: `staaash-export-${new Date().toISOString().slice(0, 10)}.json`
    })
    if (canceled || !filePath) return { ok: false }
    await writeFile(filePath, JSON.stringify(db.exportAll(), null, 2))
    return { ok: true, path: filePath }
  })
  handle('data:export-html', async () => {
    const win = getWindow()
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      defaultPath: `staaash-bookmarks-${new Date().toISOString().slice(0, 10)}.html`
    })
    if (canceled || !filePath) return { ok: false }
    const items = db.listBookmarks().filter((b) => !b.deleted_at)
    const rows = items
      .map((b) => {
        const ts = Math.floor(new Date(b.created_at).getTime() / 1000)
        return `<DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${ts}">${escapeHtml(b.title || b.url)}</A>`
      })
      .join('\n')
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${rows}\n</DL><p>`
    await writeFile(filePath, html)
    return { ok: true, path: filePath }
  })
  handle('data:import', async () => {
    const win = getWindow()
    const { filePaths, canceled } = await dialog.showOpenDialog(win, {
      filters: [{ name: 'Bookmarks', extensions: ['html', 'json'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths.length) return { ok: false, imported: 0 }
    const raw = await readFile(filePaths[0], 'utf-8')
    let imported = 0
    if (filePaths[0].endsWith('.json')) {
      const data = JSON.parse(raw)
      const items = data.bookmarks || data.links || []
      for (const l of items) {
        if (!l.url || db.findDuplicate(l.url)) continue
        db.insertBookmark({ ...l, id: undefined, tags: [] })
        imported++
      }
    } else {
      const re = /<A[^>]*HREF="([^"]+)"[^>]*(?:ADD_DATE="(\d+)")?[^>]*>([^<]*)<\/A>/gi
      let m
      while ((m = re.exec(raw))) {
        const [, url, addDate, title] = m
        if (!/^https?:\/\//i.test(url) || db.findDuplicate(url)) continue
        db.insertBookmark({
          url,
          title: cleanText(title) || url,
          domain: (() => {
            try {
              return new URL(url).hostname.replace(/^www\./, '')
            } catch {
              return ''
            }
          })(),
          created_at: addDate ? new Date(Number(addDate) * 1000).toISOString() : undefined,
          source: 'import'
        })
        imported++
      }
    }
    notify('bookmarks:changed')
    return { ok: true, imported }
  })

  // ── Preview-size backfill ──
  // Cards take their image's shape, and the masonry needs every size before it
  // can place anything — so sizes live on the record. Measuring them here, in
  // one pass over the cached files, is what stops an upgraded library from
  // reflowing card by card as the user scrolls into it. Reads headers only.
  // Backfill for rows that predate the save-time measurement. Idempotent: it
  // selects only rows still missing something, writes only what it derived, and
  // is safe to run on every launch — a converged library selects nothing.
  handle('images:size-sweep', async () => {
    const targets = db
      .listBookmarks()
      .filter(
        (b) =>
          !b.deleted_at &&
          b.image_path &&
          (!(b.image_w > 0 && b.image_h > 0) || b.preview_source == null)
      )
    let measured = 0
    let sourced = 0
    for (const b of targets) {
      const patch = {}
      if (!(b.image_w > 0 && b.image_h > 0)) {
        const size = await imageSize(join(db.imagesDir(), b.image_path))
        if (size) {
          patch.image_w = size.w
          patch.image_h = size.h
          measured++
        }
      }
      if (b.preview_source == null) {
        // 'unknown' rather than leaving it null: null means "not examined yet",
        // so a row whose origin is genuinely unrecoverable would be re-examined
        // on every launch forever. Stamping it makes the sweep converge, and the
        // information really is gone — migrate.js destroyed the image_url these
        // rows would have been identified by. Treated as centre-focal, same as
        // 'og', which is what they in fact are.
        const source = recoverPreviewSource(b) ?? 'unknown'
        patch.preview_source = source
        patch.focal_y = source === 'screenshot' ? 0 : 0.5
        sourced++
      }
      if (Object.keys(patch).length) db.updateBookmark(b.id, patch)
    }
    // One notification for the whole pass, not one per card — the layout should
    // settle once rather than shuffle as each measurement lands.
    if (measured || sourced) notify('bookmarks:changed')
    return { ok: true, scanned: targets.length, measured, sourced }
  })

  // ── Dead-link background sweep (links unchecked in 7+ days) ──
  handle('health:sweep', async () => {
    const all = db.listBookmarks().filter((b) => !b.deleted_at && !b.archived_at)
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000
    const stale = all.filter((b) => !b.last_checked || new Date(b.last_checked).getTime() < cutoff)
    let checked = 0
    for (const b of stale.slice(0, 25)) {
      const result = await checkLink(b.url)
      db.updateBookmark(b.id, { last_checked: new Date().toISOString(), is_dead: !result.ok })
      checked++
    }
    if (checked) notify('bookmarks:changed')
    return { checked, remaining: Math.max(0, stale.length - checked) }
  })

  // Recapture missing thumbnails + favicons across the library.
  // Re-runs extraction for bookmarks with no local preview and fetches
  // favicons for any domain that lacks one. Progress streams to the renderer.
  let rescanRunning = false
  handle('media:rescan', async () => {
    if (rescanRunning) return { ok: false, reason: 'already-running' }
    rescanRunning = true
    try {
      const targets = db
        .listBookmarks()
        .filter((b) => !b.deleted_at && (!b.image_path || !b.favicon_path))
      let done = 0
      const queue = [...targets]
      const worker = async () => {
        while (queue.length) {
          const b = queue.shift()
          try {
            const patch = {}
            if (!b.favicon_path && b.domain) {
              const f = await fetchFavicon(b.domain)
              if (f) patch.favicon_path = f
            }
            if (!b.image_path) {
              if (b.image_url) {
                const p = await cacheImage(b.image_url)
                if (p) patch.image_path = p
              }
              if (!patch.image_path) {
                const meta = await extractMeta(b.url)
                if (meta.image_path) patch.image_path = meta.image_path
                if (meta.image_url && !b.image_url) patch.image_url = meta.image_url
                if (!b.summary && meta.summary) patch.summary = meta.summary
                if (!b.content && meta.content) patch.content = meta.content
              }
            }
            if (Object.keys(patch).length) {
              const updated = db.updateBookmark(b.id, patch)
              notify('bookmarks:updated', updated)
            }
          } catch {
            /* keep sweeping */
          }
          done++
          notify('media:rescan-progress', { done, total: targets.length })
        }
      }
      await Promise.all(Array.from({ length: Math.min(6, targets.length) }, worker))
      return { ok: true, scanned: targets.length }
    } finally {
      rescanRunning = false
    }
  })

  // Lazily cache a remote image that migration couldn't resolve locally
  handle('images:ensure', async (id) => {
    const b = db.getBookmark(id)
    if (!b || b.image_path || !b.image_url) return b
    const image_path = await cacheImage(b.image_url)
    if (!image_path) return b
    // Reached only via b.image_url, so this file is an og:image by construction.
    const updated = db.updateBookmark(id, {
      image_path,
      ...(await previewFacts(image_path, 'og'))
    })
    notify('bookmarks:updated', updated)
    return updated
  })

  return { notify }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
