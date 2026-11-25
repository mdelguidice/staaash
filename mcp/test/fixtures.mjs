// Test databases built with the app's own schema code (desktop/src/main/schema.js),
// so these tests exercise the schema the app really writes.
import Database from 'better-sqlite3'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'

const HERE = dirname(fileURLToPath(import.meta.url))
const schema = await import(pathToFileURL(join(HERE, '../../desktop/src/main/schema.js')).href)
export const { migrateSchema, migrateV1, platformFor } = schema

export function tempDir() {
  return mkdtempSync(join(tmpdir(), 'staaash-test-'))
}

/** A database file as the app leaves it. version 1 = an app that predates this change. */
export function makeDb({ version = schema.SCHEMA_VERSION, dir = tempDir() } = {}) {
  const path = join(dir, 'staaash.db')
  mkdirSync(join(dir, 'images'), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  if (version === 1) migrateV1(db)
  else migrateSchema(db, { to: version })
  return { db, path, dir }
}

export function addTag(db, name) {
  const id = randomUUID()
  db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(id, name)
  return id
}

/** Mirrors the columns insertBookmark() writes that these tests care about. */
export function addSave(db, f) {
  const id = f.id ?? randomUUID()
  const cols = new Set(db.prepare('PRAGMA table_info(bookmarks)').all().map((c) => c.name))
  // url: null is an image-only save (v4+); leaving url out means a made-up link.
  const url = 'url' in f ? f.url : 'https://example.com/' + id
  const row = {
    id,
    url,
    normalized_url: url ? url.replace(/^https?:\/\//, '') : null,
    title: f.title ?? null,
    domain: 'domain' in f ? f.domain : url ? new URL(url).hostname.replace(/^www\./, '') : null,
    summary: f.summary ?? null,
    note: f.note ?? null,
    content: f.content ?? null,
    image_path: f.image_path ?? null,
    image_w: f.image_w ?? null,
    image_h: f.image_h ?? null,
    source: f.source ?? 'app',
    created_at: f.created_at ?? new Date().toISOString(),
    archived_at: f.archived_at ?? null,
    deleted_at: f.deleted_at ?? null,
    ...(cols.has('platform') ? { platform: 'platform' in f ? f.platform : url ? platformFor(url) : null } : {}),
    ...(cols.has('kind') ? { kind: f.kind ?? (url ? 'link' : 'image'), inbox_id: f.inbox_id ?? null } : {}),
    ...(cols.has('ai_description') ? { ai_description: f.ai_description ?? null, ai_text: f.ai_text ?? null } : {})
  }
  const keys = Object.keys(row)
  db.prepare(`INSERT INTO bookmarks (${keys.join(', ')}) VALUES (${keys.map((k) => '@' + k).join(', ')})`).run(row)
  const ins = db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)')
  for (const t of f.tags ?? []) ins.run(id, t)
  return id
}

export function writeImage(dir, name) {
  writeFileSync(join(dir, 'images', name), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
}

export const SECRET = 'sk-ant-test-SECRET-should-never-leak'
