// Read-only access to the staaash library database.
//
// Rules this module keeps:
//   - The database is opened read-only. The app owns the schema and every write.
//   - The settings table is never read: it holds the Anthropic API key.
//   - Trashed saves (deleted_at set) are invisible.
//   - It works against a database the app has not migrated yet (schema v1): the
//     v2 columns are optional and searched only when present.
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'

export function defaultDbPath(): string {
  if (process.env.STAAASH_DB) return process.env.STAAASH_DB
  const home = homedir()
  // Mirrors Electron's app.getPath('appData') + '/staaash' (see desktop/src/main/index.js).
  if (process.platform === 'darwin') return join(home, 'Library', 'Application Support', 'staaash', 'staaash.db')
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'staaash', 'staaash.db')
  }
  return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'staaash', 'staaash.db')
}

// bm25 weight per FTS column. Higher = a hit there counts for more. Title, note
// and tags are things you wrote or chose; page content is long and noisy.
const WEIGHTS: Record<string, number> = {
  title: 6,
  domain: 1,
  summary: 2,
  note: 5,
  content: 0.5,
  tags_text: 5,
  ai_description: 3,
  ai_text: 1.5,
  layout_type: 3,
  visual_style: 1.5,
  good_for: 3
}

// Dropped only from the any-term fallback, so "the onboarding screen I saved"
// still matches on the words that carry meaning.
const STOPWORDS = new Set(
  ('a an and are as at be by for from has have i in is it its me my of on or that the this to was were ' +
    'what when where which with you your saved save find found thing one ones about').split(' ')
)

type Row = Record<string, unknown> & { id: string }

export interface SearchOptions {
  limit?: number
  tag?: string
  platform?: string
  includeArchived?: boolean
}

export interface RecentOptions {
  limit?: number
  days?: number
  platform?: string
  includeArchived?: boolean
}

export class Library {
  readonly dbPath: string
  readonly imagesDir: string
  private db: Database.Database
  private cols: Set<string>
  private ftsCols: string[]

  constructor(dbPath = defaultDbPath()) {
    if (!existsSync(dbPath)) {
      throw new Error(
        `staaash database not found at ${dbPath}. Launch the staaash app once, or set STAAASH_DB to the right path.`
      )
    }
    this.dbPath = dbPath
    this.imagesDir = join(dirname(dbPath), 'images')
    this.db = new Database(dbPath, { readonly: true, fileMustExist: true })
    this.cols = new Set((this.db.prepare('PRAGMA table_info(bookmarks)').all() as { name: string }[]).map((c) => c.name))
    this.ftsCols = (this.db.prepare('PRAGMA table_info(bookmarks_fts)').all() as { name: string }[]).map((c) => c.name)
  }

  close(): void {
    this.db.close()
  }

  /** v2 = the app has run the migration that indexes tags, summary and AI text. */
  get schemaVersion(): number {
    return this.cols.has('tags_text') && this.ftsCols.includes('tags_text') ? 2 : 1
  }

  search(query: string, opts: SearchOptions = {}) {
    const limit = clamp(opts.limit ?? 10, 1, 50)
    const words = tokenize(query)
    if (!words.length) return []

    const weights = this.ftsCols.map((c) => WEIGHTS[c] ?? 1).join(', ')
    const { where, params } = this.filters(opts)
    const sql = `
      SELECT b.*, bm25(bookmarks_fts, ${weights}) AS score,
             snippet(bookmarks_fts, -1, '«', '»', '…', 14) AS matched
      FROM bookmarks_fts f
      JOIN bookmarks b ON b.rowid = f.rowid
      WHERE bookmarks_fts MATCH @match AND ${where}
      ORDER BY score
      LIMIT @limit`
    const stmt = this.db.prepare(sql)
    const term = (w: string) => `"${w.replace(/"/g, '""')}"*`

    // Pass 1: every word must appear somewhere. Pass 2 (only if pass 1 left
    // room): any meaningful word. Results say which pass found them.
    const out: Row[] = []
    const seen = new Set<string>()
    const run = (match: string, kind: string) => {
      for (const r of stmt.all({ ...params, match, limit }) as Row[]) {
        if (seen.has(r.id) || out.length >= limit) continue
        seen.add(r.id)
        out.push({ ...r, match: kind })
      }
    }
    run(words.map(term).join(' '), 'all terms')
    if (out.length < limit) {
      const meaningful = words.filter((w) => !STOPWORDS.has(w))
      const orWords = meaningful.length ? meaningful : words
      if (orWords.length > 1 || out.length === 0) run(orWords.map(term).join(' OR '), 'some terms')
    }
    return out.map((r) => this.summarize(r))
  }

  get(id: string, maxContentChars = 4000) {
    const r = this.db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Row | undefined
    if (!r) return { error: `No save with id ${id}` }
    if (r.deleted_at) return { error: `Save ${id} is in the trash` }
    const content = typeof r.content === 'string' ? r.content : null
    const collection = r.collection_id
      ? (this.db.prepare('SELECT name FROM collections WHERE id = ?').get(r.collection_id) as { name: string } | undefined)
      : undefined
    return {
      id: r.id,
      title: r.title ?? null,
      url: r.url ?? null,
      kind: r.kind ?? 'link',
      domain: r.domain ?? null,
      platform: r.platform ?? null,
      source: r.source ?? null,
      saved_at: r.created_at,
      read_at: r.read_at ?? null,
      archived_at: r.archived_at ?? null,
      favorited: !!r.favorited,
      link_dead: !!r.is_dead,
      tags: this.tagNames(r.id),
      collection: collection?.name ?? null,
      note: r.note ?? null,
      summary: r.summary ?? null,
      ai_description: r.ai_description ?? null,
      ai_text: r.ai_text ?? null,
      ai_model: r.ai_model ?? null,
      ai_enriched_at: r.ai_enriched_at ?? null,
      layout_type: r.layout_type ?? null,
      visual_style: r.visual_style ?? null,
      good_for: r.good_for ?? null,
      ai_confidence: r.ai_confidence ?? null,
      instagram_post_id: r.platform === 'instagram' ? (r.external_id ?? null) : null,
      image: this.file(r.image_path, { width: r.image_w, height: r.image_h, source: r.preview_source }),
      images: this.images(r.id),
      favicon: this.file(r.favicon_path),
      content: content ? content.slice(0, maxContentChars) : null,
      content_length: content ? content.length : 0
    }
  }

  recent(opts: RecentOptions = {}) {
    const limit = clamp(opts.limit ?? 20, 1, 100)
    const { where, params } = this.filters(opts)
    let since = ''
    if (opts.days && opts.days > 0) {
      since = ' AND b.created_at >= @since'
      params.since = new Date(Date.now() - opts.days * 86400_000).toISOString()
    }
    const rows = this.db
      .prepare(`SELECT b.* FROM bookmarks b WHERE ${where}${since} ORDER BY b.created_at DESC LIMIT @limit`)
      .all({ ...params, limit }) as Row[]
    return rows.map((r) => this.summarize(r))
  }

  // ── internals ──

  private filters(opts: { tag?: string; platform?: string; includeArchived?: boolean }) {
    const clauses = ['b.deleted_at IS NULL']
    const params: Record<string, unknown> = {}
    if (opts.includeArchived === false) clauses.push('b.archived_at IS NULL')
    if (opts.tag) {
      clauses.push(`EXISTS (SELECT 1 FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id
                    WHERE bt.bookmark_id = b.id AND t.name = @tag COLLATE NOCASE)`)
      params.tag = opts.tag.trim()
    }
    if (opts.platform) {
      if (this.cols.has('platform')) {
        clauses.push('b.platform = @platform')
        params.platform = opts.platform
      } else {
        // Pre-v2 database: approximate from the domain.
        clauses.push(opts.platform === 'instagram' ? "b.domain LIKE '%instagram.com'" : "b.domain NOT LIKE '%instagram.com'")
      }
    }
    return { where: clauses.join(' AND '), params }
  }

  private summarize(r: Row) {
    return {
      id: r.id,
      title: r.title ?? null,
      url: r.url ?? null,
      kind: r.kind ?? 'link',
      platform: r.platform ?? null,
      source: r.source ?? null,
      saved_at: r.created_at,
      archived: !!r.archived_at,
      tags: this.tagNames(r.id),
      note: trim(r.note, 300),
      summary: trim(r.summary, 200),
      ai_description: trim(r.ai_description, 300),
      layout_type: r.layout_type ?? null,
      image_path: this.file(r.image_path)?.path ?? null,
      image_count: this.imageCount(r.id),
      ...(r.match ? { match: r.match, matched: r.matched ?? null } : {})
    }
  }

  // Every frame of a multi-image save, in order (schema v3). Frame 1 is also
  // the card image above.
  private images(id: string) {
    if (!this.hasImagesTable) return []
    const rows = this.db
      .prepare('SELECT position, image_path, image_w, image_h, label FROM bookmark_images WHERE bookmark_id = ? ORDER BY position')
      .all(id) as { position: number; image_path: string; image_w: number | null; image_h: number | null; label: string | null }[]
    return rows
      .map((f) => ({ position: f.position, ...this.file(f.image_path, { width: f.image_w, height: f.image_h, label: f.label }) }))
      .filter((f) => 'path' in f)
  }

  private imageCount(id: string): number {
    if (!this.hasImagesTable) return 0
    return (this.db.prepare('SELECT count(*) AS n FROM bookmark_images WHERE bookmark_id = ?').get(id) as { n: number }).n
  }

  private get hasImagesTable(): boolean {
    if (this._hasImages === undefined) {
      this._hasImages = !!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'bookmark_images'").get()
    }
    return this._hasImages
  }
  private _hasImages: boolean | undefined

  private tagNames(id: string): string[] {
    return (
      this.db
        .prepare(
          'SELECT t.name FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = ? ORDER BY t.name COLLATE NOCASE'
        )
        .all(id) as { name: string }[]
    ).map((t) => t.name)
  }

  // Cached files are stored as bare "hash.ext" names; basename() guards against
  // anything else so a bad row can never point outside the images folder.
  private file(name: unknown, extra: Record<string, unknown> = {}) {
    if (typeof name !== 'string' || !name) return null
    const path = join(this.imagesDir, basename(name))
    return { path, exists: existsSync(path), ...stripNulls(extra) }
  }
}

function tokenize(q: string): string[] {
  return (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 12)
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.floor(n)))
}

function trim(v: unknown, n: number): string | null {
  if (typeof v !== 'string' || !v) return null
  return v.length > n ? v.slice(0, n - 1) + '…' : v
}

function stripNulls(o: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined))
}
