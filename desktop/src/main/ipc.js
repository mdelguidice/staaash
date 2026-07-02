// Typed IPC channels between renderer and main.
// The renderer never touches the filesystem — everything goes through here.
// Channel names are the single source of truth shared with the preload script.
import { ipcMain, shell, dialog, clipboard, app } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import * as db from './db.js'
import { extractMeta, cacheImage, checkLink, cleanText } from './extract.js'
import { askStaaash, suggestCollection } from './ai.js'

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
      const updated = db.updateBookmark(item.id, {
        title: meta.title ?? item.title,
        summary: meta.summary,
        image_url: meta.image_url,
        image_path: meta.image_path,
        domain: meta.domain ?? domain,
        content: meta.content ?? null
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

  // Lazily cache a remote image that migration couldn't resolve locally
  handle('images:ensure', async (id) => {
    const b = db.getBookmark(id)
    if (!b || b.image_path || !b.image_url) return b
    const image_path = await cacheImage(b.image_url)
    if (!image_path) return b
    const updated = db.updateBookmark(id, { image_path })
    notify('bookmarks:updated', updated)
    return updated
  })

  return { notify }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
