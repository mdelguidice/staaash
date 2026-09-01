# Moving staaash to a new Mac

Everything you care about lives in one folder. The app itself is best rebuilt
on the new machine rather than copied across.

## Where the data is

`src/main/index.js` pins the data directory on launch, dev and packaged alike:

```
~/Library/Application Support/staaash/
├── staaash.db        bookmarks, tags, collections, notes, FTS index, settings
├── staaash.db-wal    WAL mode is on — these two belong with the .db
├── staaash.db-shm
└── images/           cached preview images and favicons
```

That is the complete set. `staaash.db` also holds the `anthropic_api_key`
setting, so Ask Staaash keeps working after the move.

Preview lookups are portable: `image_path` stores a bare filename resolved
against `imagesDir()` at read time, so a different username or home path
changes nothing.

**Export JSON is not a migration path.** `db.exportAll()` returns bookmarks,
tags and collections only — no images, no settings — and re-importing runs
everything back through the add path. Take one as a secondary backup if you
like, but move the folder.

## Steps

### 1. On the old Mac — quit staaash first

WAL checkpoints on a clean quit; a copy taken while the app is running can be
torn.

```sh
ditto ~/Library/Application\ Support/staaash ~/Desktop/staaash-data
```

Optionally also File → Export JSON from the app before quitting, as a belt-and-
suspenders backup.

Push any uncommitted repo work too. `.cache/`, `desktop/out/`, `desktop/dist/`
and `visual-diff/*` are gitignored and will not travel with the clone; only
`visual-diff/figma/` is deliberately kept.

### 2. On the new Mac — build the app

Local builds are arm64-only and ad-hoc signed (see the header comment in
`desktop/electron-builder.js`), so a copied `.app` needs Apple Silicon *and*
picks up a quarantine flag in transit that Gatekeeper will block.

```sh
git clone https://github.com/mdelguidice/staaash.git staaash && cd staaash/desktop
npm install        # postinstall fetches the better-sqlite3 Electron prebuild
npm run dist       # → dist/staaash.dmg + dist/mac-arm64/staaash.app
```

Drag the app to /Applications.

If you do copy a built `.app` across instead of rebuilding, clear the
quarantine attribute:

```sh
xattr -dr com.apple.quarantine /Applications/staaash.app
```

### 3. Restore the data before first launch

```sh
ditto ~/Desktop/staaash-data ~/Library/Application\ Support/staaash
```

Before first launch is cleanest: the copied database already has `migrated_v1`
set, so `migrate.js` will not go looking for legacy web-app data. Launching
first is recoverable — quit and overwrite the folder.

## Gotchas

- **Browser extension.** Reinstall it unpacked from `extension/`. It posts to
  `http://localhost:3847/api/add`. Make sure no stray `node server.js` from the
  old web app is running on the new machine, or the desktop app logs
  `extension server not started` and saves land in `.cache/data.json` instead.
- **Legacy web-app data.** If bookmarks in `~/staaash/.cache/data.json` never
  made it into SQLite, copy that folder over too and let the first launch
  migrate it — deleting the `migrated_v1` settings row first if the database
  you restored already claims migration ran.
- **API key.** It rides along inside `staaash.db` in plaintext. If you choose
  to start from an empty database instead, re-enter it in Settings.

## Verify

Launch and check the bookmark count, and that cards render real previews —
gradient placeholders everywhere means `images/` did not come across.

Or check before launching:

```sh
sqlite3 ~/Library/Application\ Support/staaash/staaash.db \
  "select count(*) from bookmarks where deleted_at is null;"
ls ~/Library/Application\ Support/staaash/images | wc -l
```
