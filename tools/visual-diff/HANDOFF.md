# Handoff — staaash visual diff harness

Context for an agent picking this up cold. Nothing here has been committed yet.

## What this is

A harness that compares Figma frames against the real running staaash Electron
app, pixel for pixel, and reports a delta percentage plus a side-by-side image.

- **Repo:** `/Users/mike/staaash` (branch `design-tweaks`, local only, never pushed)
- **App:** `desktop/` — Electron 42 + React 18 + Vite, SQLite via better-sqlite3
- **Figma:** file `yPHeCTtyigj5XqiReFv8NW`, node `5181-38` ("Everything" screen)
- **Frame size:** 1440×792, verified against the node — export is 2880×1584 @2x

**Hard constraint honoured throughout: no app code was changed.**
`git status --porcelain desktop/` is empty. Everything lives in `tools/visual-diff/`
plus a config at the repo root.

## Current results

| Measure | Value |
|---|---|
| Whole-screen delta | **2.24%** (102,112 / 4,561,920 px) |
| sidebar region | 3.44% |
| topbar region | 1.81% |
| ask-bar region | 1.73% |
| gallery region | 2.05% |
| `--calibrate` | **clean, 16/16 consecutive** |
| Detection floor — geometry | 0.1px (124 px change); noise floor is zero |
| Detection floor — flat colour | **27 of 255** — a hard cliff, nothing below |

Trajectory: 44.48% (real library, no fixture) → 2.24% (seeded fixture, correct
viewport, reproducible). The early numbers were also captured at the **wrong viewport** — see
"getContentSize lies" below.

## File inventory

```
visual-diff.config.mjs              # editable frame→route mapping (repo root)
tools/visual-diff/
  index.mjs                         # CLI: diff / --calibrate / --mutate / --rects / --frame
  lib.mjs                           # launch, size, steps, capture, compare
  seed-fixture.mjs                  # Node orchestrator for fixture seeding
  seed-app/main.mjs                 # Electron-side seeder (+ image patch mode)
  electron-shim/main.mjs            # redirects appData so fixtures work
  fixtures/figma-mock/fixture.mjs   # declarative content spec
  fixtures/figma-mock/home/         # generated fixture (gitignore candidate)
  README.md                         # full usage docs
visual-diff/                        # outputs + figma/ reference cache
```

Deps (self-contained, own `node_modules`): `playwright-core`, `pixelmatch`, `sharp`.

## How to run

```bash
cd desktop && npm run build          # harness launches out/main/index.js
node tools/visual-diff/seed-fixture.mjs
node tools/visual-diff/index.mjs
node tools/visual-diff/index.mjs --calibrate
node tools/visual-diff/index.mjs --rects
node tools/visual-diff/index.mjs --mutate=.sb:padding-left:21px   # sensitivity
node tools/visual-diff/index.mjs --calibrate --frame=1439x792     # other viewport
```

## Non-obvious things — do not re-derive these the hard way

Each was found empirically this session, usually after a failure.

1. **macOS `appData` ignores `$HOME`.** Electron derives it from
   `NSHomeDirectory()`. Setting `HOME` alone does *not* move the database, so
   `electron-shim/` patches `app.getPath('appData')` before importing the real
   main (which computes `userData = appData/staaash` at module scope, then opens
   the DB later in `whenReady`). `HOME` still matters separately: the legacy
   migration reads `process.env.HOME` (`src/main/migrate.js:17`), so redirecting
   it is what makes migration a no-op inside a fixture.

2. **`getContentSize()` lies.** It echoes back whatever you just requested even
   when the resize has not landed. Poll the renderer's `innerWidth`/`innerHeight`
   instead — that is what drives layout. This masked a bug where every capture
   was taken at 1512×940 and then squashed to 2880×1584.

3. **The window opens maximized.** The app opens at 1520×940, wider than a 14"
   MacBook work area (1512×949), so macOS zooms it — and `setContentSize` is
   silently ignored while maximized. Call `unmaximize()` first, then let the
   animation finish (~450ms) *before* sizing; re-applying mid-animation fights
   it and never converges.

4. **System `sqlite3` on macOS has no FTS5.** The schema needs it, so the CLI
   cannot seed. And `better-sqlite3` in `desktop/` is built for Electron's ABI
   (146), not Node's — so it cannot be required from plain Node either. Seeding
   therefore runs *inside* Electron and imports the app's real `src/main/db.js`,
   which also guarantees zero schema drift.

5. **`listBookmarks()` has no sort tiebreaker** (`db.js:158`,
   `ORDER BY created_at DESC`). Rows sharing a timestamp reorder between
   launches. The seeder offsets each card by a minute. *This is a latent app
   bug too* — bookmarks saved in the same second can reorder.

6. **Hover comes from the physical mouse.** The window opens under wherever the
   cursor happens to be, and cards reveal a veil/heart/check on `:hover`. The
   capture injects `pointer-events: none` so the hit test matches nothing.
   Injected *after* route steps so clicks still work.

7. **Lazy images never resolve.** Awaiting all `document.images` hangs forever —
   off-screen cards use `loading="lazy"` and never load. Only await in-viewport
   images, and bound it with a timeout.

8. **`electron.launch` needs the Node inspector socket.** Claude Code's sandbox
   blocks binding it (`Starting inspector on 127.0.0.1:0 failed`). All harness
   runs need `dangerouslyDisableSandbox: true`. The headless seeder deliberately
   uses a plain `spawn` instead, because it exits immediately and would trip
   Playwright's debugger handshake.

9. **`node_modules/electron/path.txt` names the `.app` bundle**, not the inner
   binary (leftover from a manual unpack). `electronBinary()` descends into
   `Contents/MacOS/Electron`.

10. **Never pass a redirected `HOME` to the app.** macOS resolves the login
    keychain through the home directory, so Chromium's OSCrypt (initialised by
    every Electron app, `safeStorage` or not) fails to find one and pops a
    modal: *"A keychain cannot be found to store 'staaash Key.'"* That dialog
    steals focus at a nondeterministic moment and was the root cause of the
    long-standing calibration residual. `app.env.HOME` is a naming convention
    only; `resolveAppEnv()` strips it. The fixture is selected purely by the
    shim's appData patch.

11. **Do not bump Electron.** Pinned `~42.1.0` = ABI 146, the newest with
    `better-sqlite3` prebuilds. 43 (ABI 148) has none and source builds are
    blocked. npm needs `NPM_CONFIG_CACHE="$TMPDIR/npm-cache"` in this sandbox.

## Fixture design

Selected by `app.env.HOME` in the config. The real library at
`~/Library/Application Support/staaash/` is never opened.

Content in `fixtures/figma-mock/fixture.mjs`, every value read off the Figma
export rather than invented: everything 235, unread 189, favorite 4, archived 3,
trash 0; five named collections (+2 overflow so the "More" row appears); zero
tags; eight visible cards.

Two-pass seeding:
1. Electron seeds the DB via the app's own `db.js`, then **verifies counts
   against the app's own view predicates** and fails loudly on mismatch.
2. The app is launched, every `.card-media` box measured, and those exact
   rectangles cropped out of the reference PNG. Card artwork therefore matches
   by construction, so the gallery compares *layout and chrome* rather than
   unrelated pictures. Bottom-edge cards are cropped to the visible part and
   padded below the fold to preserve aspect ratio.

Bookmark ids are brute-force searched so the app's `cardAspect()` hash lands on
each card's required aspect bucket — that reproduces the mock's proportions
without touching app code.

## Known issues / unresolved

- **RESOLVED — `--calibrate` is now clean, 16/16.** The residual was the macOS
  keychain dialog the harness itself caused by redirecting `HOME` (see
  non-obvious item 10). It stole window focus at a varying moment and persisted
  until dismissed, which explains every symptom: bistable rather than noisy,
  immune to longer waits, identical within a process but divergent across
  processes. Fixed by not passing `HOME`.

  Recorded negative result, do not retry: fractional column width was the
  leading hypothesis and is wrong. Ten calibrations at each of four widths
  (re-seeding per width) gave 14/20 clean at integral colW vs 13/20 fractional.

- **Fixture timestamps are relative to seed time.** `"2 days ago"` labels drift
  once the fixture ages past a boundary. Re-seed. No staleness warning is
  implemented (a `fixture_seeded_at` setting *is* written and could drive one).

- **`FIGMA_TOKEN` REST path is unverified.** Implemented but never exercised —
  no token was available and `api.figma.com` is outside the sandbox allowlist.
  The cached reference was exported through the Figma MCP server instead.

## Real divergences the harness surfaced (app/design bugs, not harness bugs)

1. **Collections list.** Design shows 5 collections + "••• More";
   `COLLECTIONS_VISIBLE = 6` (`Sidebar.jsx:24`), so "More" only appears at 7+
   and a sixth row shows. Design was drawn against a threshold of 5.
2. **Status pill count.** Design reads `235 saved`; app reads `238`, because
   `savedCount` counts archived (`App.jsx:158`) while "Everything" excludes them.
3. **Unstable bookmark sort** — see non-obvious item 5.

None were fixed (no app changes allowed).

## Suggested next steps

**Highest value first:**

1. **Decide on the two divergences above** — are they design bugs or code bugs?
   That is a product call, not something to guess. Fixing #1 is a one-line
   constant; #2 is a one-line predicate.
2. **Map more screens.** Only `everything` is mapped, because that is the only
   frame provided. Each new screen needs its Figma node id and a route recipe
   (`waitFor`/`click`/`clickText`/`key`/`eval`/`wait`). The config has a
   commented template. Candidates: settings overlay, drawer open, list layout,
   empty/trash states.
3. **Calibration is clean, so `--calibrate` is usable as a CI gate** — it already
   exits non-zero and names the offending elements. Any non-zero result is now a
   real regression rather than noise.
4. **Gitignore `visual-diff/` outputs and `fixtures/*/home/`** — currently
   untracked and would otherwise commit ~3MB of binaries per run. Deliberately
   not done, since touching `.gitignore` was not asked for.
5. **Wire `--calibrate` into CI** if desired — it already exits non-zero on
   failure and prints the offending elements.

**Lower priority:** a masking feature (exclude the gallery entirely for a single
headline number); favicon crops in the fixture (currently the colored-initial
fallback renders, ~0.05% of pixels); a fixture staleness warning.

## Things deliberately not done

- No app code changed, no commits made, no `.gitignore` edits.
- Light theme untuned and never diffed (dark only).
- Two cards at the mock's bottom edge are clipped and unreadable; their titles
  and domains in the fixture are explicit placeholders, flagged in `fixture.mjs`.
- No masking/exclusion regions — `regions` scoring covers the same need.
