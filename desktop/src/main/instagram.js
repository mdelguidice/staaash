// Instagram saves import: the account export (saved_posts.json and
// saved_collections.json) and the saves-pilot description CSV.
//
// No Electron imports: the MCP tests run this against the app's own schema.
// Every function that writes takes the better-sqlite3 handle it writes to.
//
// Rules the import keeps (docs/phase-2-instagram-import-plan.md):
//   - Matches on the Instagram post id, so /p/, /reel/ and /tv/ links to one
//     post are one save, and re-running adds nothing twice.
//   - Only saves in the collections Mike checks come in. Each checked
//     collection becomes a tag.
//   - It fills empty fields only. It adds tags and never removes one. It never
//     touches note, favorite, archive or trash. A trashed save stays trashed.
import { execFile } from 'node:child_process'
import { readFile, readdir, stat, copyFile, mkdir } from 'node:fs/promises'
import { join, dirname, basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { instagramPostId } from './schema.js'
import { placeholderFor } from './placeholder.js'
import { imageSize } from './imageSize.js'

const run = promisify(execFile)

export const IMPORT_SOURCE = 'instagram-export'
export const UNFILED = '__unfiled__'

// ── Reading the export ──

/**
 * Instagram writes UTF-8 text as if each byte were a Latin-1 character, so an
 * emoji arrives as "\u00f0\u009f…". Text that doesn't decode is left as it was.
 */
export function fixMojibake(s) {
  if (typeof s !== 'string' || !s) return s ?? ''
  // eslint-disable-next-line no-control-regex
  if (!/[\u0080-\u00ff]/.test(s) || /[^\u0000-\u00ff]/.test(s)) return s
  const out = Buffer.from(s, 'latin1').toString('utf8')
  const bad = (out.match(/\ufffd/g) || []).length
  if (!bad) return out
  // A few captions carry one broken byte sequence among many good ones. Keep
  // the decode when it repaired far more than it broke, and drop the broken
  // spots; otherwise this wasn't mojibake, so leave it alone.
  const repaired = s.length - out.length
  return repaired > bad * 3 ? out.replace(/\ufffd/g, '') : s
}

/**
 * Accepts the export .zip, its unzipped folder (or any folder inside it), or
 * saved_posts.json itself. Returns the two parsed JSON files; collections is
 * [] when the account has none.
 */
export async function readExport(path) {
  const info = await stat(path)
  if (info.isFile() && extname(path).toLowerCase() === '.zip') return readZip(path)
  if (info.isFile()) {
    const posts = JSON.parse(await readFile(path, 'utf-8'))
    const collections = await readJsonIfExists(join(dirname(path), 'saved_collections.json'))
    return { posts, collections: collections ?? [] }
  }
  const dir = await findSavedDir(path, 4)
  if (!dir) throw new Error('No saved_posts.json in that folder. Pick the Instagram export .zip or its unzipped folder.')
  const posts = JSON.parse(await readFile(join(dir, 'saved_posts.json'), 'utf-8'))
  const collections = await readJsonIfExists(join(dir, 'saved_collections.json'))
  return { posts, collections: collections ?? [] }
}

async function readJsonIfExists(p) {
  try {
    return JSON.parse(await readFile(p, 'utf-8'))
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

async function findSavedDir(dir, depth) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  if (entries.some((e) => e.isFile() && e.name === 'saved_posts.json')) return dir
  if (depth <= 0) return null
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'media') continue
    const hit = await findSavedDir(join(dir, e.name), depth - 1)
    if (hit) return hit
  }
  return null
}

// The system unzip handles zip64 and every compression method Instagram uses,
// and it ships with macOS. Only the two small JSON entries are extracted.
async function readZip(zipPath) {
  const { stdout } = await run('unzip', ['-Z1', zipPath], { maxBuffer: 64 * 1024 * 1024 })
  const names = stdout.split('\n').map((l) => l.trim()).filter(Boolean)
  const find = (file) => names.find((n) => n === file || n.endsWith('/' + file))
  const postsEntry = find('saved_posts.json')
  if (!postsEntry) throw new Error('This zip has no saved_posts.json. Is it the Instagram export, in JSON format?')
  const extract = async (entry) =>
    JSON.parse((await run('unzip', ['-p', zipPath, entry], { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' })).stdout)
  const posts = await extract(postsEntry)
  const colEntry = find('saved_collections.json')
  const collections = colEntry ? await extract(colEntry) : []
  return { posts, collections }
}

// ── Parsing ──

const labelled = (lvs, label) => (Array.isArray(lvs) ? lvs.find((l) => l && l.label === label) : undefined)

// Owner block: { title: 'Owner', dict: [{ dict: [{label:'Username', value}] }] }
function ownerUsername(lvs) {
  const owner = Array.isArray(lvs) ? lvs.find((l) => l && l.title === 'Owner') : null
  for (const d of owner?.dict ?? []) {
    const u = labelled(d?.dict, 'Username')
    if (u?.value) return fixMojibake(u.value)
  }
  return null
}

function saveFrom(lvs, timestamp) {
  const url = labelled(lvs, 'URL')
  const id = instagramPostId(url?.value || url?.href)
  if (!id) return null
  return {
    id,
    created_at: Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : null,
    creator: ownerUsername(lvs),
    caption: fixMojibake(labelled(lvs, 'Caption')?.value || '').trim()
  }
}

/** Collection names that differ only in case or spacing are one tag. */
export function tagNameFor(collectionName) {
  return fixMojibake(collectionName).trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * {
 *   saves:       Map<postId, {id, created_at, creator, caption}>,
 *   collections: [{ key, name, ids: Set<postId> }]  sorted by size, largest first,
 *   unfiled:     Set<postId>  saves in no collection,
 *   undated:     number       collection members missing from saved_posts.json
 * }
 * A save in saved_posts.json twice keeps its earliest date.
 */
export function parseExport({ posts, collections }) {
  const saves = new Map()
  const postList = Array.isArray(posts) ? posts : posts?.saved_saved_media ?? []
  for (const item of postList) {
    const s = saveFrom(item?.label_values, item?.timestamp)
    if (!s) continue
    const prev = saves.get(s.id)
    if (!prev || (s.created_at && (!prev.created_at || s.created_at < prev.created_at))) {
      saves.set(s.id, { ...s, caption: s.caption || prev?.caption || '', creator: s.creator || prev?.creator || null })
    }
  }

  const byKey = new Map()
  let undated = 0
  for (const c of Array.isArray(collections) ? collections : []) {
    const name = labelled(c?.label_values, 'Name')?.value
    if (!name || !tagNameFor(name)) continue
    const key = tagNameFor(name)
    const entry = byKey.get(key) ?? { key, name: key, ids: new Set() }
    byKey.set(key, entry)
    const media = c.label_values.find((l) => l && Array.isArray(l.dict) && l.title === 'Media')
    for (const m of media?.dict ?? []) {
      // A member has no saved date of its own. One that saved_posts.json lacks
      // gets the collection's timestamp: the closest date the export offers.
      const s = saveFrom(m?.dict, c.timestamp)
      if (!s) continue
      entry.ids.add(s.id)
      if (!saves.has(s.id)) {
        saves.set(s.id, s)
        undated++
      }
    }
  }

  const filed = new Set()
  for (const c of byKey.values()) for (const id of c.ids) filed.add(id)
  const unfiled = new Set([...saves.keys()].filter((id) => !filed.has(id)))
  const list = [...byKey.values()].sort((a, b) => b.ids.size - a.ids.size || a.key.localeCompare(b.key))
  return { saves, collections: list, unfiled, undated }
}

// ── Building a save ──

const ONLY_TAGS = /^(?:[#@][\p{L}\p{N}_.]+[\s,]*)+$/u

/** "creator · first line of the caption", skipping lines that are only hashtags. */
export function titleFor(save, max = 90) {
  const line = save.caption
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !ONLY_TAGS.test(l))
  let text = line || ''
  if (text.length > max) text = text.slice(0, max - 1).trimEnd() + '…'
  if (save.creator && text) return `${save.creator} · ${text}`
  return save.creator || text || 'Instagram post'
}

export function canonicalUrl(postId) {
  return `https://www.instagram.com/p/${postId}/`
}

// ── Plan and apply ──

function selection(parsed, picks) {
  const keys = new Set(picks?.collections ?? [])
  const chosen = new Map() // postId -> Set(tag names)
  for (const c of parsed.collections) {
    if (!keys.has(c.key)) continue
    for (const id of c.ids) {
      if (!chosen.has(id)) chosen.set(id, new Set())
      chosen.get(id).add(c.key)
    }
  }
  if (picks?.unfiled) for (const id of parsed.unfiled) if (!chosen.has(id)) chosen.set(id, new Set())
  return chosen
}

function existingByPostId(db) {
  const map = new Map()
  const rows = db.prepare("SELECT id, url, external_id, deleted_at FROM bookmarks WHERE platform = 'instagram' OR external_id IS NOT NULL").all()
  for (const r of rows) {
    const pid = r.external_id || instagramPostId(r.url)
    if (!pid) continue
    // Prefer a live row if the same post is in the library twice.
    const prev = map.get(pid)
    if (!prev || (prev.deleted_at && !r.deleted_at)) map.set(pid, r)
  }
  return map
}

function tagIdsByName(db) {
  const m = new Map()
  for (const t of db.prepare('SELECT id, name FROM tags').all()) m.set(t.name.toLowerCase(), t.id)
  return m
}

/**
 * What an import with these picks would do, without writing anything.
 * picks: { collections: [key…], unfiled: boolean }
 */
export function planImport(db, parsed, picks) {
  const chosen = selection(parsed, picks)
  const existing = existingByPostId(db)
  const tagIds = tagIdsByName(db)
  const hasTag = db.prepare('SELECT 1 FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?')

  const plan = { selected: chosen.size, add: [], tag: [], unchanged: 0, trashed: 0 }
  for (const [pid, tags] of chosen) {
    const row = existing.get(pid)
    if (!row) {
      plan.add.push(pid)
      continue
    }
    if (row.deleted_at) {
      plan.trashed++
      continue
    }
    const missing = [...tags].filter((t) => !tagIds.has(t) || !hasTag.get(row.id, tagIds.get(t)))
    if (missing.length) plan.tag.push(pid)
    else plan.unchanged++
  }
  return { ...plan, counts: { add: plan.add.length, tag: plan.tag.length, unchanged: plan.unchanged, trashed: plan.trashed } }
}

/** Runs the import in one transaction. Returns the same counts planImport promised. */
export function applyImport(db, parsed, picks) {
  const chosen = selection(parsed, picks)
  const plan = planImport(db, parsed, picks)

  const insert = db.prepare(`INSERT INTO bookmarks (id, url, normalized_url, platform, external_id, title, domain, summary,
      created_at, source, favorited, is_dead, ph_comp, ph_hue_a, ph_hue_b, ph_hue_c, ph_aspect)
    VALUES (@id, @url, @normalized_url, 'instagram', @external_id, @title, 'instagram.com', @summary,
      @created_at, @source, 0, 0, @ph_comp, @ph_hue_a, @ph_hue_b, @ph_hue_c, @ph_aspect)`)
  const fill = db.prepare(`UPDATE bookmarks SET
      external_id = coalesce(external_id, @external_id),
      title = CASE WHEN title IS NULL OR trim(title) = '' THEN @title ELSE title END,
      summary = CASE WHEN summary IS NULL OR trim(summary) = '' THEN @summary ELSE summary END
    WHERE id = @id`)
  const findTag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
  const newTag = db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)')
  const link = db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)')
  const now = new Date().toISOString()

  const tagId = (name) => {
    const hit = findTag.get(name)
    if (hit) return hit.id
    const id = randomUUID()
    newTag.run(id, name)
    return id
  }

  db.transaction(() => {
    const existing = existingByPostId(db)
    for (const [pid, tags] of chosen) {
      const s = parsed.saves.get(pid)
      let row = existing.get(pid)
      if (row?.deleted_at) continue
      const fields = { external_id: pid, title: titleFor(s), summary: s.caption || null }
      if (!row) {
        const id = randomUUID()
        const url = canonicalUrl(pid)
        // Seeded by creator, so one person's saves share a look and a library
        // of Instagram saves isn't one repeated gradient.
        const p = placeholderFor(`instagram.com/${s.creator || pid}`)
        insert.run({
          id,
          url,
          normalized_url: url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
          ...fields,
          created_at: s.created_at || now,
          source: IMPORT_SOURCE,
          ph_comp: p.comp,
          ph_hue_a: p.hueA,
          ph_hue_b: p.hueB,
          ph_hue_c: p.hueC,
          ph_aspect: p.aspect
        })
        row = { id }
      } else {
        fill.run({ id: row.id, ...fields })
      }
      for (const t of tags) link.run(row.id, tagId(t))
    }
  })()
  return plan.counts
}

// ── Saves-pilot descriptions ──

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ''))
  if (!header) return []
  const keys = header.map((h) => h.trim().replace(/^\ufeff/, ''))
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

const PILOT_REQUIRED = ['id', 'layout_type', 'on_screen', 'visual_style', 'good_for', 'confidence']

/**
 * Reads a saves-pilot folder: pilot_results.csv plus media/<id>/frame_NN.jpg.
 * Nothing in the folder is executed.
 */
export async function readPilot(folder) {
  const csvPath = join(folder, 'pilot_results.csv')
  const rows = parseCsv(await readFile(csvPath, 'utf-8'))
  const missing = PILOT_REQUIRED.filter((k) => rows.length && !(k in rows[0]))
  if (!rows.length || missing.length) {
    throw new Error(`pilot_results.csv needs the columns ${PILOT_REQUIRED.join(', ')}` + (missing.length ? ` (missing: ${missing.join(', ')})` : ''))
  }
  const out = []
  for (const r of rows) {
    if (!/^[A-Za-z0-9_-]+$/.test(r.id)) continue
    const dir = join(folder, 'media', r.id)
    const files = (await readdir(dir).catch(() => []))
      .filter((f) => /^frame_\d+\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    out.push({ ...r, frames: files.map((f) => join(dir, f)) })
  }
  return out
}

/**
 * Writes pilot descriptions and frames onto saves already in the library.
 * Fills empty fields only; frames are added once per save. Saves not in the
 * library are counted, not created: the export import is what creates saves,
 * with their real saved dates.
 * modelLabel goes in ai_model so a later vision pass can tell these apart.
 */
export async function applyPilot(db, pilotRows, { imagesDir, modelLabel = 'saves-pilot' }) {
  const existing = existingByPostId(db)
  const result = { described: 0, framesAdded: 0, notInLibrary: [], alreadyDescribed: 0, trashed: 0 }
  const now = new Date().toISOString()
  await mkdir(imagesDir, { recursive: true })

  const setAi = db.prepare(`UPDATE bookmarks SET
      ai_description = @ai_description, layout_type = @layout_type, visual_style = @visual_style,
      good_for = @good_for, ai_confidence = @ai_confidence, ai_model = @ai_model, ai_enriched_at = @at
    WHERE id = @id AND (ai_description IS NULL OR trim(ai_description) = '')`)
  const hasFrames = db.prepare('SELECT count(*) AS n FROM bookmark_images WHERE bookmark_id = ?')
  const addFrame = db.prepare(
    'INSERT OR IGNORE INTO bookmark_images (bookmark_id, position, image_path, image_w, image_h, label) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const setCover = db.prepare(`UPDATE bookmarks SET image_path = @image_path, image_w = @w, image_h = @h,
      preview_source = 'og', focal_y = 0.5 WHERE id = @id AND image_path IS NULL`)

  for (const r of pilotRows) {
    const row = existing.get(r.id)
    if (!row) {
      result.notInLibrary.push(r.id)
      continue
    }
    if (row.deleted_at) {
      result.trashed++
      continue
    }
    const changed = setAi.run({
      id: row.id,
      ai_description: r.on_screen || null,
      layout_type: r.layout_type || null,
      visual_style: r.visual_style || null,
      good_for: r.good_for || null,
      ai_confidence: r.confidence || null,
      ai_model: modelLabel,
      at: now
    }).changes
    if (changed) result.described++
    else result.alreadyDescribed++

    if (hasFrames.get(row.id).n > 0 || !r.frames.length) continue
    // Copy first, then write rows in one transaction, so a failed copy leaves
    // no half-listed save.
    const copied = []
    for (const [i, src] of r.frames.entries()) {
      const name = `ig_${r.id}_${String(i + 1).padStart(2, '0')}${extname(src).toLowerCase()}`
      await copyFile(src, join(imagesDir, name))
      const size = await imageSize(join(imagesDir, name))
      copied.push({ name, size, label: basename(src, extname(src)) })
    }
    db.transaction(() => {
      copied.forEach((c, i) => addFrame.run(row.id, i + 1, c.name, c.size?.w ?? null, c.size?.h ?? null, c.label))
      setCover.run({ id: row.id, image_path: copied[0].name, w: copied[0].size?.w ?? null, h: copied[0].size?.h ?? null })
    })()
    result.framesAdded += copied.length
  }
  return result
}
