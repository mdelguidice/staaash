// One-time migration from the original web app's store
// (/Users/mike/staaash/.cache/data.json + .cache/images/) into SQLite.
// Runs on first launch only; guarded by the `migrated_v1` setting.
import { readFile, readdir, copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import {
  openDb,
  getSetting,
  setSetting,
  insertBookmark,
  createTag,
  imagesDir,
  listBookmarks
} from './db.js'

const LEGACY_DIR = join(process.env.HOME || '', 'staaash')
const LEGACY_DATA = join(LEGACY_DIR, '.cache', 'data.json')
const LEGACY_IMAGES = join(LEGACY_DIR, '.cache', 'images')

export async function runMigrationIfNeeded() {
  openDb()
  if (getSetting('migrated_v1')) return { migrated: false, reason: 'already migrated' }

  let raw
  try {
    raw = await readFile(LEGACY_DATA, 'utf-8')
  } catch {
    setSetting('migrated_v1', new Date().toISOString())
    return { migrated: false, reason: 'no legacy data found' }
  }

  const data = JSON.parse(raw)
  const links = Array.isArray(data.links) ? data.links : []
  const legacyTags = Array.isArray(data.tags) ? data.tags : []

  // 1. Copy the image cache wholesale — hashes are preserved so lookups keep working.
  let imagesCopied = 0
  try {
    await mkdir(imagesDir(), { recursive: true })
    const files = await readdir(LEGACY_IMAGES)
    for (const f of files) {
      try {
        await copyFile(join(LEGACY_IMAGES, f), join(imagesDir(), f))
        imagesCopied++
      } catch {
        /* skip unreadable file */
      }
    }
  } catch {
    /* no legacy images dir */
  }

  const cachedFiles = new Set()
  try {
    for (const f of await readdir(imagesDir())) cachedFiles.add(f)
  } catch {
    /* empty */
  }

  const findCachedSync = (hash) => {
    for (const ext of ['.jpg', '.png', '.gif', '.webp', '.jpeg']) {
      if (cachedFiles.has(hash + ext)) return hash + ext
    }
    return null
  }

  // 2. Tags — keep legacy IDs so link.tags references survive.
  const tagIdMap = new Map()
  for (const t of legacyTags) {
    if (!t || !t.name) continue
    const created = createTag(t.name)
    tagIdMap.set(t.id, created.id)
  }

  // 3. Links. Resolve each image_url to a local cache file where possible:
  //    - "/api/cached/<hash>"  → the hash directly
  //    - remote URL            → sha256(url)[0:16], the old image-proxy cache key
  let count = 0
  for (const l of links) {
    if (!l || !l.url) continue
    let image_path = null
    if (l.image_url) {
      const cachedMatch = String(l.image_url).match(/^\/api\/cached\/([a-f0-9]{16})$/)
      const hash = cachedMatch
        ? cachedMatch[1]
        : createHash('sha256').update(l.image_url).digest('hex').slice(0, 16)
      image_path = findCachedSync(hash)
    }

    // link.tags entries are {id, name} objects in the legacy store (sometimes bare ids)
    const tags = (Array.isArray(l.tags) ? l.tags : [])
      .map((t) => {
        if (typeof t === 'string') return tagIdMap.get(t) || null
        if (t && typeof t === 'object') {
          return tagIdMap.get(t.id) || (t.name ? createTag(t.name).id : null)
        }
        return null
      })
      .filter(Boolean)

    insertBookmark({
      id: l.id,
      url: l.url,
      title: l.title ?? null,
      domain: l.domain ?? null,
      summary: l.summary ?? null,
      image_url: l.image_url && !String(l.image_url).startsWith('/api/') ? l.image_url : null,
      image_path,
      created_at: l.created_at ?? new Date().toISOString(),
      read_at: l.read_at ?? null,           // preserved as-is
      archived_at: l.archived_at ?? null,   // preserved as-is — archiving stays manual
      deleted_at: l.deleted_at ?? null,
      favorited: !!l.favorited,
      source: l.source ?? 'import',
      hn_url: l.hn_url ?? null,
      note: l.note ?? null,
      content: l.content ?? null,
      last_checked: l.last_checked ?? null,
      is_dead: !!l.is_dead,
      tags
    })
    count++
  }

  setSetting('migrated_v1', new Date().toISOString())
  return { migrated: true, bookmarks: count, tags: tagIdMap.size, imagesCopied, total: listBookmarks().length }
}
