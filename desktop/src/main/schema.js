// Schema and migrations for staaash.db.
//
// Kept free of any Electron import on purpose: the MCP server's tests (mcp/)
// build their fixture databases with this exact code, so the schema Claude
// Code reads is the schema the app writes, not a hand-copied imitation of it.
import { join } from 'node:path'

export const SCHEMA_VERSION = 4

/**
 * Bring a database up to SCHEMA_VERSION.
 *
 * opts.backupDir — where to write a snapshot before a migration that rewrites
 * existing data. Omit it and no backup is taken (tests, fresh databases).
 * opts.to — stop at this version. Tests only, to build an older library.
 * Returns { from, to, backup } so the caller can log what happened.
 */
export function migrateSchema(db, opts = {}) {
  const target = opts.to ?? SCHEMA_VERSION
  migrateV1(db)
  const from = getVersion(db)
  if (from >= target) return { from, to: from, backup: null }

  // One snapshot before any step that rewrites existing data. VACUUM INTO
  // writes a consistent single-file copy (WAL included) and cannot run inside
  // a transaction, so it goes here, ahead of the steps.
  let backup = null
  const hasRows = db.prepare('SELECT count(*) AS n FROM bookmarks').get().n > 0
  if (opts.backupDir && hasRows) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    backup = join(opts.backupDir, `staaash.db.bak-pre-v${target}-${stamp}`)
    db.prepare('VACUUM INTO ?').run(backup)
  }

  if (from < 2 && target >= 2) migrateV2(db)
  if (from < 3 && target >= 3) migrateV3(db)
  if (from < 4 && target >= 4) migrateV4(db)
  return { from, to: target, backup }
}

// v1: everything that existed before versioning. Idempotent, runs every launch.
// Exported so tests can build a database exactly as an un-upgraded app left it.
export function migrateV1(db) {
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

// ── v2: search over everything a save says about itself ──
//
// v1's full-text index covered title, domain, note and page content only. A
// save's tags, its OG summary and (from phase 4) the AI description and the text
// read out of its image were all invisible to search. v2 adds the columns and
// rebuilds the index over all of them.
//
// platform    where the thing lives: 'instagram' | 'web'. Distinct from
//             `source`, which is how it got here ('app', 'extension', 'import',
//             later 'phone'). An Instagram reel saved from the phone is
//             platform=instagram, source=phone.
// tags_text   the item's tag names, space-separated. Derived, never written by
//             app code: triggers on bookmark_tags and tags keep it current, so
//             every path that touches tags (bulk tag, rename, delete, cascade)
//             stays correct without each one remembering to.
// ai_*        written once by the phase-4 vision pass. ai_model records which
//             model wrote it so a weak batch can be redone selectively.
const V2_COLUMNS = [
  ['platform', 'TEXT'],
  ['tags_text', 'TEXT'],
  ['ai_description', 'TEXT'],
  ['ai_text', 'TEXT'],
  ['ai_enriched_at', 'TEXT'],
  ['ai_model', 'TEXT']
]

const V2_FTS_COLUMNS = [
  'title', 'domain', 'summary', 'note', 'content', 'tags_text', 'ai_description', 'ai_text'
]

// v3: what a vision pass says about the layout. external_id is the source
// platform's own id for the item (Instagram's post id), the import match key.
// ai_confidence is the describer's own high / medium / low; medium labels were
// the ones Mike disagreed with in the pilot, so the app can flag them.
const V3_COLUMNS = [
  ['external_id', 'TEXT'],
  ['layout_type', 'TEXT'],
  ['visual_style', 'TEXT'],
  ['good_for', 'TEXT'],
  ['ai_confidence', 'TEXT']
]

// Order matters: bm25() weights in consumers are positional against this list.
// New columns go on the end so existing weight lists stay aligned.
export const FTS_COLUMNS = [...V2_FTS_COLUMNS, 'layout_type', 'visual_style', 'good_for']

// Instagram post id from any of its URL forms. /p/, /reel/ and /tv/ share one
// id space, so the same post saved two ways matches.
export function instagramPostId(url) {
  if (typeof url !== 'string') return null
  const m = url.match(/^https?:\/\/(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/(?:[A-Za-z0-9_.]+\/)?(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/i)
  return m ? m[1] : null
}

export function platformFor(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') return 'instagram'
    return 'web'
  } catch {
    return null
  }
}

function getVersion(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get()
  return row ? Number(row.value) || 1 : 1
}

const tagsTextFor = (idExpr) => `(SELECT group_concat(t.name, ' ') FROM bookmark_tags bt
      JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = ${idExpr})`

// tags_text upkeep. FK cascades fire these too (tag deleted -> its
// bookmark_tags rows deleted -> each bookmark's tags_text recomputed).
const TAGS_TEXT_TRIGGERS = ['bookmark_tags_ai', 'bookmark_tags_ad', 'tags_au_name']
function createTagsTextTriggers(db) {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS bookmark_tags_ai AFTER INSERT ON bookmark_tags BEGIN
      UPDATE bookmarks SET tags_text = ${tagsTextFor('new.bookmark_id')} WHERE id = new.bookmark_id;
    END;
    CREATE TRIGGER IF NOT EXISTS bookmark_tags_ad AFTER DELETE ON bookmark_tags BEGIN
      UPDATE bookmarks SET tags_text = ${tagsTextFor('old.bookmark_id')} WHERE id = old.bookmark_id;
    END;
    CREATE TRIGGER IF NOT EXISTS tags_au_name AFTER UPDATE OF name ON tags BEGIN
      UPDATE bookmarks SET tags_text = ${tagsTextFor('bookmarks.id')}
      WHERE id IN (SELECT bookmark_id FROM bookmark_tags WHERE tag_id = new.id);
    END;
  `)
}

function migrateV2(db) {
  db.transaction(() => {
    const existing = new Set(db.prepare('PRAGMA table_info(bookmarks)').all().map((c) => c.name))
    for (const [name, type] of V2_COLUMNS) {
      if (!existing.has(name)) db.exec(`ALTER TABLE bookmarks ADD COLUMN ${name} ${type}`)
    }

    // Backfill the derived columns before the index is rebuilt over them.
    const setPlatform = db.prepare('UPDATE bookmarks SET platform = ? WHERE id = ?')
    for (const r of db.prepare('SELECT id, url FROM bookmarks WHERE platform IS NULL').all()) {
      setPlatform.run(platformFor(r.url), r.id)
    }
    db.exec(`UPDATE bookmarks SET tags_text = ${tagsTextFor('bookmarks.id')}`)

    // Rebuild the index with the wider column set. Trigger names are kept so
    // v1's CREATE ... IF NOT EXISTS stays a no-op on later launches.
    rebuildFts(db, V2_FTS_COLUMNS)

    createTagsTextTriggers(db)

    setVersion(db, 2)
  })()
}

function setVersion(db, v) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(String(v))
}

function rebuildFts(db, columns) {
  const fts = columns.join(', ')
  const newVals = columns.map((c) => `new.${c}`).join(', ')
  const oldVals = columns.map((c) => `old.${c}`).join(', ')
  db.exec(`
    DROP TRIGGER IF EXISTS bookmarks_ai;
    DROP TRIGGER IF EXISTS bookmarks_ad;
    DROP TRIGGER IF EXISTS bookmarks_au;
    DROP TABLE IF EXISTS bookmarks_fts;

    CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
      ${fts},
      content='bookmarks', content_rowid='rowid',
      tokenize='porter unicode61'
    );

    CREATE TRIGGER bookmarks_ai AFTER INSERT ON bookmarks BEGIN
      INSERT INTO bookmarks_fts(rowid, ${fts}) VALUES (new.rowid, ${newVals});
    END;
    CREATE TRIGGER bookmarks_ad AFTER DELETE ON bookmarks BEGIN
      INSERT INTO bookmarks_fts(bookmarks_fts, rowid, ${fts}) VALUES ('delete', old.rowid, ${oldVals});
    END;
    CREATE TRIGGER bookmarks_au AFTER UPDATE ON bookmarks BEGIN
      INSERT INTO bookmarks_fts(bookmarks_fts, rowid, ${fts}) VALUES ('delete', old.rowid, ${oldVals});
      INSERT INTO bookmarks_fts(rowid, ${fts}) VALUES (new.rowid, ${newVals});
    END;

    INSERT INTO bookmarks_fts(bookmarks_fts) VALUES ('rebuild');
  `)
}

// ── v3: Instagram import and vision fields ──
//
// bookmark_images holds every frame of a multi-image save in order. The card
// keeps using bookmarks.image_path (frame 1); this table is for the drawer and
// for Claude Code, which gets all of them through the MCP server.
function migrateV3(db) {
  db.transaction(() => {
    const existing = new Set(db.prepare('PRAGMA table_info(bookmarks)').all().map((c) => c.name))
    for (const [name, type] of V3_COLUMNS) {
      if (!existing.has(name)) db.exec(`ALTER TABLE bookmarks ADD COLUMN ${name} ${type}`)
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_external ON bookmarks(external_id);
      CREATE TABLE IF NOT EXISTS bookmark_images (
        bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        image_w INTEGER,
        image_h INTEGER,
        label TEXT,
        PRIMARY KEY (bookmark_id, position)
      );
    `)

    // Instagram saves already in the library get their post id, so a later
    // import matches them instead of adding a second copy.
    const setExt = db.prepare('UPDATE bookmarks SET external_id = ? WHERE id = ?')
    for (const r of db.prepare("SELECT id, url FROM bookmarks WHERE platform = 'instagram' AND external_id IS NULL").all()) {
      const pid = instagramPostId(r.url)
      if (pid) setExt.run(pid, r.id)
    }

    rebuildFts(db, FTS_COLUMNS)
    setVersion(db, 3)
  })()
}

// ── v4: URL becomes optional ──
//
// A screenshot saved from the phone has no link. SQLite can't drop NOT NULL in
// place, so the table is rebuilt (sqlite.org/lang_altertable.html, "other
// changes"): new table, copy, drop, rename. Things that make it safe:
//
// - rowid is copied explicitly. The search index is external-content keyed on
//   rowid, so a renumbered table would point every hit at the wrong save.
// - The new table is built from the old one's own column list, types, defaults
//   and foreign keys, so nothing an older migration added is lost or reordered.
// - Triggers that mention bookmarks (search index, tags_text) are dropped first:
//   a RENAME re-parses every trigger in the schema and fails on one that names
//   a table that doesn't exist at that moment. All are recreated after.
// - Foreign keys are off for the swap (bookmark_tags and bookmark_images point
//   at bookmarks; dropping it with them on would cascade-delete every tag and
//   frame) and foreign_key_check must come back empty before commit.
//
// New columns:
// inbox_id  the phone inbox's id for the item. Sync skips anything already here,
//           so a crash between "saved" and "marked synced" can't duplicate it.
// kind      'link' | 'image'. An image save has no URL until one is pasted in.
const NULLABLE_IN_V4 = new Set(['url', 'normalized_url'])

function migrateV4(db) {
  const fkWasOn = db.pragma('foreign_keys', { simple: true }) === 1
  db.pragma('foreign_keys = OFF') // a no-op inside a transaction, so set it here
  try {
    db.transaction(() => {
      const cols = db.prepare('PRAGMA table_info(bookmarks)').all()
      const fks = new Map(db.prepare('PRAGMA foreign_key_list(bookmarks)').all().map((f) => [f.from, f]))
      const indexes = db
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'bookmarks' AND sql IS NOT NULL")
        .all()
        .map((r) => r.sql)
      const before = db.prepare('SELECT count(*) AS n FROM bookmarks').get().n

      const defs = cols.map((c) => {
        let d = `${c.name} ${c.type}`
        if (c.pk) d += ' PRIMARY KEY'
        if (c.notnull && !NULLABLE_IN_V4.has(c.name)) d += ' NOT NULL'
        if (c.dflt_value != null) d += ` DEFAULT ${c.dflt_value}`
        const fk = fks.get(c.name)
        if (fk) d += ` REFERENCES ${fk.table}(${fk.to}) ON DELETE ${fk.on_delete}`
        return d
      })
      const names = new Set(cols.map((c) => c.name))
      if (!names.has('inbox_id')) defs.push('inbox_id TEXT')
      if (!names.has('kind')) defs.push("kind TEXT NOT NULL DEFAULT 'link'")
      const copy = ['rowid', ...cols.map((c) => c.name)].join(', ')

      for (const t of ['bookmarks_ai', 'bookmarks_ad', 'bookmarks_au', ...TAGS_TEXT_TRIGGERS]) {
        db.exec(`DROP TRIGGER IF EXISTS ${t}`)
      }
      db.exec('DROP TABLE IF EXISTS bookmarks_fts')
      db.exec(`CREATE TABLE bookmarks_v4 (\n  ${defs.join(',\n  ')}\n)`)
      db.exec(`INSERT INTO bookmarks_v4 (${copy}) SELECT ${copy} FROM bookmarks`)
      db.exec('DROP TABLE bookmarks')
      db.exec('ALTER TABLE bookmarks_v4 RENAME TO bookmarks')
      for (const sql of indexes) db.exec(sql)
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_bookmarks_normalized ON bookmarks(normalized_url);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_external ON bookmarks(external_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_inbox ON bookmarks(inbox_id) WHERE inbox_id IS NOT NULL;
      `)
      db.exec("UPDATE bookmarks SET kind = 'image' WHERE url IS NULL")

      // Links to nothing would fail the check below and stop the app from
      // opening. Clear them the way the cascades would have, had foreign keys
      // been on when they were made.
      db.exec(`
        DELETE FROM bookmark_tags WHERE bookmark_id NOT IN (SELECT id FROM bookmarks)
          OR tag_id NOT IN (SELECT id FROM tags);
        DELETE FROM bookmark_images WHERE bookmark_id NOT IN (SELECT id FROM bookmarks);
        UPDATE bookmarks SET collection_id = NULL
          WHERE collection_id IS NOT NULL AND collection_id NOT IN (SELECT id FROM collections);
      `)

      createTagsTextTriggers(db)
      rebuildFts(db, FTS_COLUMNS)

      const after = db.prepare('SELECT count(*) AS n FROM bookmarks').get().n
      if (after !== before) throw new Error(`v4 rebuild: ${before} rows before, ${after} after`)
      const broken = db.prepare('PRAGMA foreign_key_check').all()
      if (broken.length) throw new Error(`v4 rebuild: ${broken.length} broken references, first in ${broken[0].table}`)
      setVersion(db, 4)
    })()
  } finally {
    if (fkWasOn) db.pragma('foreign_keys = ON')
  }
}
