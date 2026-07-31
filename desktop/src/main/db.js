// SQLite data layer. Single source of truth lives in
// ~/Library/Application Support/staaash/staaash.db
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

let db = null

export function dataDir() {
  return app.getPath('userData')
}

export function imagesDir() {
  return join(dataDir(), 'images')
}

export function openDb() {
  if (db) return db
  mkdirSync(dataDir(), { recursive: true })
  mkdirSync(imagesDir(), { recursive: true })
  db = new Database(join(dataDir(), 'staaash.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrateSchema(db)
  return db
}

function migrateSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      title TEXT,
      domain TEXT,
      summary TEXT,
      image_url TEXT,
      image_path TEXT,
      created_at TEXT NOT NULL,
      read_at TEXT,
      archived_at TEXT,
      deleted_at TEXT,
      favorited INTEGER NOT NULL DEFAULT 0,
      source TEXT,
      hn_url TEXT,
      note TEXT,
      content TEXT,
      last_checked TEXT,
      is_dead INTEGER NOT NULL DEFAULT 0,
      collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookmarks_normalized ON bookmarks(normalized_url);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS bookmark_tags (
      bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (bookmark_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
      title, domain, note, content,
      content='bookmarks', content_rowid='rowid',
      tokenize='porter unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS bookmarks_ai AFTER INSERT ON bookmarks BEGIN
      INSERT INTO bookmarks_fts(rowid, title, domain, note, content)
      VALUES (new.rowid, new.title, new.domain, new.note, new.content);
    END;
    CREATE TRIGGER IF NOT EXISTS bookmarks_ad AFTER DELETE ON bookmarks BEGIN
      INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, domain, note, content)
      VALUES ('delete', old.rowid, old.title, old.domain, old.note, old.content);
    END;
    CREATE TRIGGER IF NOT EXISTS bookmarks_au AFTER UPDATE ON bookmarks BEGIN
      INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, domain, note, content)
      VALUES ('delete', old.rowid, old.title, old.domain, old.note, old.content);
      INSERT INTO bookmarks_fts(rowid, title, domain, note, content)
      VALUES (new.rowid, new.title, new.domain, new.note, new.content);
    END;
  `)

  // Additive column migrations for databases created before these fields existed
  const cols = db.prepare('PRAGMA table_info(bookmarks)').all().map((c) => c.name)
  if (!cols.includes('favicon_path')) {
    db.exec('ALTER TABLE bookmarks ADD COLUMN favicon_path TEXT')
  }
  // Intrinsic size of the cached preview. The gallery gives each card its
  // image's own shape, and the masonry places every card before any of them
  // paint — so this has to be readable from the record, not from the <img>.
  // Null means "not measured yet"; cardShape falls back until it is.
  if (!cols.includes('image_w')) {
    db.exec('ALTER TABLE bookmarks ADD COLUMN image_w INTEGER')
  }
  if (!cols.includes('image_h')) {
    db.exec('ALTER TABLE bookmarks ADD COLUMN image_h INTEGER')
  }
  // Where the preview came from, and where to hold the image when a card has to
  // crop it. Only cards clamped at the tall end crop at all (see cardShape in
  // lib/format.js), so these matter for a small minority — but which minority is
  // not knowable at render time without them.
  //
  // preview_source: 'og' | 'screenshot' | 'unknown' | null, where null means
  // "not examined yet" and 'unknown' means "examined, unrecoverable". The
  // distinction is what lets the backfill sweep converge instead of re-checking
  // the same rows every launch.
  //
  // Unrecoverable is a real state, not a defensive branch: migrate.js nulls an
  // image_url that was an internal /api/cached/<hash> reference, which destroys
  // the only evidence of where the file came from. 9 rows of 244 in a real
  // library are in it. The cheap heuristic (image_url IS NULL implies
  // screenshot) labels every one of them a screenshot, and every one is an
  // og:image — which is why this is a recorded value rather than an inference.
  //
  // focal_y: 0..1, the vertical point to keep when cropping. Null means "use the
  // default for preview_source".
  if (!cols.includes('preview_source')) {
    db.exec('ALTER TABLE bookmarks ADD COLUMN preview_source TEXT')
  }
  if (!cols.includes('focal_y')) {
    db.exec('ALTER TABLE bookmarks ADD COLUMN focal_y REAL')
  }
  // Gradient placeholder for a bookmark with no preview image. Every value is a
  // pure function of the domain (see main/placeholder.js) so it could in
  // principle be recomputed on demand — it is stored so that changing the
  // generator later cannot reshuffle a library that already exists, and so the
  // renderer needs no hashing on the layout path.
  //
  // ph_comp   which of the ten compositions
  // ph_hue_a/b/c  the three hue stops, degrees. Saturation and lightness are
  //           NOT stored: they come from the house palette in CSS, so the whole
  //           library's register can be retuned without a migration.
  // ph_aspect the card's shape, from the same set the reframing work used
  if (!cols.includes('ph_comp')) db.exec('ALTER TABLE bookmarks ADD COLUMN ph_comp INTEGER')
  if (!cols.includes('ph_hue_a')) db.exec('ALTER TABLE bookmarks ADD COLUMN ph_hue_a REAL')
  if (!cols.includes('ph_hue_b')) db.exec('ALTER TABLE bookmarks ADD COLUMN ph_hue_b REAL')
  if (!cols.includes('ph_hue_c')) db.exec('ALTER TABLE bookmarks ADD COLUMN ph_hue_c REAL')
  if (!cols.includes('ph_aspect')) db.exec('ALTER TABLE bookmarks ADD COLUMN ph_aspect REAL')
}

// ── URL normalization (dedup) ──
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'dclid', 'msclkid', 'twclid', 'igshid',
  'mc_cid', 'mc_eid', 'ref', 'ref_src', 'source', 's', 'cmpid', 'share_id'
])

export function normalizeUrl(raw) {
  try {
    const u = new URL(raw)
    u.hash = ''
    u.hostname = u.hostname.replace(/^www\./, '').toLowerCase()
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key)
    }
    u.searchParams.sort()
    let s = u.toString()
    if (s.endsWith('/')) s = s.slice(0, -1)
    return s.replace(/^https?:\/\//, '')
  } catch {
    return raw
  }
}

// ── Row hydration ──
function hydrate(row) {
  if (!row) return null
  return {
    ...row,
    favorited: !!row.favorited,
    is_dead: !!row.is_dead,
    tags: tagIdsFor(row.id)
  }
}

let tagIdsStmt = null
function tagIdsFor(bookmarkId) {
  if (!tagIdsStmt) tagIdsStmt = db.prepare('SELECT tag_id FROM bookmark_tags WHERE bookmark_id = ?')
  return tagIdsStmt.all(bookmarkId).map((r) => r.tag_id)
}

// ── Bookmarks ──

export function listBookmarks() {
  const rows = db
    .prepare(`SELECT b.*, group_concat(bt.tag_id) AS tag_ids
              FROM bookmarks b
              LEFT JOIN bookmark_tags bt ON bt.bookmark_id = b.id
              GROUP BY b.id
              ORDER BY b.created_at DESC`)
    .all()
  return rows.map((r) => ({
    ...r,
    favorited: !!r.favorited,
    is_dead: !!r.is_dead,
    tags: r.tag_ids ? r.tag_ids.split(',') : [],
    tag_ids: undefined
  }))
}

export function getBookmark(id) {
  return hydrate(db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id))
}

export function findDuplicate(url) {
  const n = normalizeUrl(url)
  return db.prepare('SELECT * FROM bookmarks WHERE normalized_url = ? AND deleted_at IS NULL').get(n) || null
}

export function insertBookmark(fields) {
  const id = fields.id || randomUUID()
  const b = {
    id,
    url: fields.url,
    normalized_url: normalizeUrl(fields.url),
    title: fields.title ?? null,
    domain: fields.domain ?? null,
    summary: fields.summary ?? null,
    image_url: fields.image_url ?? null,
    image_path: fields.image_path ?? null,
    image_w: fields.image_w ?? null,
    image_h: fields.image_h ?? null,
    preview_source: fields.preview_source ?? null,
    focal_y: fields.focal_y ?? null,
    ph_comp: fields.ph_comp ?? null,
    ph_hue_a: fields.ph_hue_a ?? null,
    ph_hue_b: fields.ph_hue_b ?? null,
    ph_hue_c: fields.ph_hue_c ?? null,
    ph_aspect: fields.ph_aspect ?? null,
    favicon_path: fields.favicon_path ?? null,
    created_at: fields.created_at ?? new Date().toISOString(),
    read_at: fields.read_at ?? null,
    archived_at: fields.archived_at ?? null,
    deleted_at: fields.deleted_at ?? null,
    favorited: fields.favorited ? 1 : 0,
    source: fields.source ?? 'app',
    hn_url: fields.hn_url ?? null,
    note: fields.note ?? null,
    content: fields.content ?? null,
    last_checked: fields.last_checked ?? null,
    is_dead: fields.is_dead ? 1 : 0,
    collection_id: fields.collection_id ?? null
  }
  db.prepare(`INSERT INTO bookmarks (id, url, normalized_url, title, domain, summary, image_url, image_path,
      image_w, image_h, preview_source, focal_y,
      ph_comp, ph_hue_a, ph_hue_b, ph_hue_c, ph_aspect,
      favicon_path, created_at, read_at, archived_at, deleted_at, favorited, source, hn_url, note, content,
      last_checked, is_dead, collection_id)
    VALUES (@id, @url, @normalized_url, @title, @domain, @summary, @image_url, @image_path,
      @image_w, @image_h, @preview_source, @focal_y,
      @ph_comp, @ph_hue_a, @ph_hue_b, @ph_hue_c, @ph_aspect,
      @favicon_path, @created_at, @read_at, @archived_at, @deleted_at, @favorited, @source, @hn_url, @note, @content,
      @last_checked, @is_dead, @collection_id)`).run(b)
  if (Array.isArray(fields.tags) && fields.tags.length) setBookmarkTags(id, fields.tags)
  return getBookmark(id)
}

const UPDATABLE = new Set([
  'url', 'title', 'domain', 'summary', 'image_url', 'image_path', 'favicon_path', 'read_at', 'archived_at',
  'deleted_at', 'favorited', 'source', 'hn_url', 'note', 'content', 'last_checked', 'is_dead',
  'collection_id', 'image_w', 'image_h', 'preview_source', 'focal_y',
  'ph_comp', 'ph_hue_a', 'ph_hue_b', 'ph_hue_c', 'ph_aspect'
])

export function updateBookmark(id, patch) {
  const keys = Object.keys(patch).filter((k) => UPDATABLE.has(k))
  if (keys.length) {
    const sets = keys.map((k) => `${k} = @${k}`).join(', ')
    const values = { id }
    for (const k of keys) {
      let v = patch[k]
      if (k === 'favorited' || k === 'is_dead') v = v ? 1 : 0
      values[k] = v
    }
    if (patch.url) {
      values.normalized_url = normalizeUrl(patch.url)
      db.prepare(`UPDATE bookmarks SET ${sets}, normalized_url = @normalized_url WHERE id = @id`).run(values)
    } else {
      db.prepare(`UPDATE bookmarks SET ${sets} WHERE id = @id`).run(values)
    }
  }
  if (Array.isArray(patch.tags)) setBookmarkTags(id, patch.tags)
  return getBookmark(id)
}

export function deleteBookmarkPermanently(id) {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id)
}

export function setBookmarkTags(bookmarkId, tagIds) {
  const del = db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?')
  const ins = db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)')
  const tx = db.transaction(() => {
    del.run(bookmarkId)
    for (const t of tagIds) ins.run(bookmarkId, t)
  })
  tx()
}

export function addTagsToBookmarks(bookmarkIds, tagIds) {
  const ins = db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)')
  const tx = db.transaction(() => {
    for (const b of bookmarkIds) for (const t of tagIds) ins.run(b, t)
  })
  tx()
}

// ── Search (FTS5 with LIKE fallback) ──

export function searchBookmarks(query) {
  const q = query.trim()
  if (!q) return []
  try {
    const match = q
      .split(/\s+/)
      .map((w) => `"${w.replace(/"/g, '""')}"*`)
      .join(' ')
    const rows = db
      .prepare(`SELECT b.*, group_concat(bt.tag_id) AS tag_ids, rank
                FROM bookmarks_fts f
                JOIN bookmarks b ON b.rowid = f.rowid
                LEFT JOIN bookmark_tags bt ON bt.bookmark_id = b.id
                WHERE bookmarks_fts MATCH ?
                GROUP BY b.id
                ORDER BY rank`)
      .all(match)
    return rows.map((r) => ({
      ...r,
      favorited: !!r.favorited,
      is_dead: !!r.is_dead,
      tags: r.tag_ids ? r.tag_ids.split(',') : [],
      tag_ids: undefined
    }))
  } catch {
    const like = `%${q}%`
    return db
      .prepare(`SELECT * FROM bookmarks
                WHERE title LIKE ? OR domain LIKE ? OR note LIKE ? OR content LIKE ?
                ORDER BY created_at DESC LIMIT 200`)
      .all(like, like, like, like)
      .map(hydrate)
  }
}

// ── Tags ──

export function listTags() {
  return db
    .prepare(`SELECT t.*, count(b.id) AS count
              FROM tags t LEFT JOIN bookmark_tags bt ON bt.tag_id = t.id
              LEFT JOIN bookmarks b ON b.id = bt.bookmark_id AND b.deleted_at IS NULL AND b.archived_at IS NULL
              GROUP BY t.id ORDER BY t.name COLLATE NOCASE`)
    .all()
}

export function createTag(name) {
  const existing = db.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(name.trim())
  if (existing) return existing
  const id = randomUUID()
  db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(id, name.trim())
  return { id, name: name.trim() }
}

export function renameTag(id, name) {
  db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name.trim(), id)
}

export function deleteTag(id) {
  db.prepare('DELETE FROM tags WHERE id = ?').run(id)
}

// ── Collections ──

export function listCollections() {
  return db
    .prepare(`SELECT c.*, count(b.id) AS count
              FROM collections c
              LEFT JOIN bookmarks b ON b.collection_id = c.id AND b.deleted_at IS NULL AND b.archived_at IS NULL
              GROUP BY c.id ORDER BY c.position, c.created_at`)
    .all()
}

// Figma collection-dot ramp (rose/coral/tangerine/moss/teal) — new
// collections cycle through it so none is ever colorless.
const COLLECTION_COLORS = ['#f43f5e', '#fb6b4d', '#f59e0b', '#5ba744', '#14b8a6']

export function createCollection(name, color) {
  const id = `col_${Date.now()}_${randomUUID().slice(0, 8)}`
  const max = db.prepare('SELECT coalesce(max(position), 0) AS m FROM collections').get().m
  const finalColor = color ?? COLLECTION_COLORS[max % COLLECTION_COLORS.length]
  db.prepare('INSERT INTO collections (id, name, color, position, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name.trim(), finalColor, max + 1, new Date().toISOString())
  return db.prepare('SELECT * FROM collections WHERE id = ?').get(id)
}

export function renameCollection(id, name) {
  db.prepare('UPDATE collections SET name = ? WHERE id = ?').run(name.trim(), id)
}

export function deleteCollection(id) {
  db.prepare('DELETE FROM collections WHERE id = ?').run(id)
}

// ── Settings ──

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}

// ── Export ──

export function exportAll() {
  return {
    bookmarks: listBookmarks(),
    tags: listTags(),
    collections: listCollections(),
    exported_at: new Date().toISOString()
  }
}
