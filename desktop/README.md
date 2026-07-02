# staaash — desktop

Local-first bookmarking as a native macOS app. Electron + React 18 + Vite
(electron-vite), SQLite via better-sqlite3, everything stored in
`~/Library/Application Support/staaash/` (`staaash.db` + `images/`).

## Commands

```sh
npm install         # postinstall fetches the better-sqlite3 Electron prebuild
npm run dev         # electron-vite dev with HMR
npm run build       # bundle main/preload/renderer to out/
npm run dist        # build + package .app and DMG into dist/
node scripts/build-icon.mjs   # regenerate build/icon.icns from the locked mark
```

## Architecture

- `src/main/` — Electron main process
  - `db.js` — SQLite schema (bookmarks, tags, collections, settings, FTS5), queries, URL normalization
  - `migrate.js` — one-time import from the old web app (`~/staaash/.cache/data.json` + images); guarded by the `migrated_v1` setting
  - `extract.js` — OG/meta extraction, readable-text capture, image disk cache, PageSpeed screenshot fallback, link health check (ported from `server.js`)
  - `ipc.js` — every typed channel the renderer can call
  - `httpServer.js` — `POST /api/add` on port 3847 for the browser extension
  - `ai.js` — Ask Staaash Q&A + collection suggestion (Claude API, `claude-opus-4-8`); no-ops without a key
- `src/preload/index.js` — contextBridge; whitelisted invoke + event channels only
- `src/renderer/` — React app (gallery masonry, list view, drawer, Ask bar, capture palette, settings, shortcuts overlay)

Preview images are served over the `staaash-img://` protocol from the local
cache. Remote-only previews are backfilled into the cache lazily as cards mount.

## Pinned versions (don't bump casually)

- `electron ~42.1.0` — ABI 146, the newest ABI with an official better-sqlite3
  prebuilt binary. Electron 43 (ABI 148) has none yet, which forces a node-gyp
  source build. Check https://github.com/WiseLibs/better-sqlite3/releases
  before bumping.
- `vite ^7` + `@vitejs/plugin-react ^5` — electron-vite 5 peers on vite 7.

## Capture paths

- `⌥⌘S` global shortcut → quick-capture palette, pre-filled from clipboard
- Drag a URL onto the window (drop overlay) or a link file onto the Dock icon
- Browser extension keeps `POST http://localhost:3847/api/add`.
  **Stop the old `node server.js` first** — if it still holds port 3847 the
  desktop app logs `extension server not started` and the extension keeps
  saving into `.cache/data.json` instead of the app.

## Verification hooks

`STAAASH_SCREENSHOT=/path.png` captures the window after load and quits
(`STAAASH_SCREENSHOT_DELAY` ms, `STAAASH_SCREENSHOT_QUIT=0` to stay open).
`STAAASH_TEST_JS='...'` runs JS in the page before capture.

## Design (locked)

Volt palette, `src/renderer/src/styles.css` is the token source. The volt
accent budget is exactly 4 elements: active nav pill, + New button,
stored-locally dot, active tag — never add a fifth. Instrument Sans/Serif are
bundled via @fontsource (no network fonts). Meaningful motion 280ms on
`cubic-bezier(0.22,1,0.36,1)`, micro 140ms.
