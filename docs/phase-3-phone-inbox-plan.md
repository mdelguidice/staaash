# Phase 3 plan: phone inbox and sync

Status: approved 2026-11-25 (Android web app, 2-minute window) and built. Waiting on Mike's test on his Mac and phone.

Goal: save a link, a screenshot, or both from the phone. It lands in staaash on the Mac the next time the app syncs, even if the Mac was asleep when it was saved.

## How it fits together

```
Phone (share sheet) ──POST, phone token──▶ Worker ──▶ D1 (items) + R2 (images)
Mac app ──GET unsynced, desktop token──▶ Worker ──▶ download images ──▶ staaash.db
Mac app ──POST mark synced──▶ Worker
```

Already decided: Cloudflare Worker + D1 + R2 on Mike's account. Images stay in R2 after sync. There are two tokens: the phone's can only create items, and the desktop's can read items and mark them synced.

## Phone client

Mike's phone is Android. Recommended: a **web app served by the Worker itself**, installed to the home screen from Chrome. It registers as a share target, so "staaash" appears in the Android share sheet.

- It accepts a link, an image, or several images from Chrome, Instagram, Photos or the screenshot preview. Android apps often share a link as plain text, Instagram included, so the app pulls the first URL out of the shared text.
- A small sheet opens with a thumbnail or the link, an optional note, and Save. It closes on "Saved".
- **Offline:** a save made with no signal is kept on the phone and sent when the connection returns (Chrome's background sync). If that isn't available, it's sent the next time the app opens. The sheet says "Queued" so Mike knows.
- It needs no Play Store, Android Studio or sideloaded APK. Mike pastes the phone token once, on the app's own settings screen.
- Updating it means redeploying the Worker. The phone picks up the new version the next time the app opens.

Weakest point: share targets only work once the app is installed from Chrome (or Samsung Internet), not from a bookmark. Firefox on Android can't do it. A native Android app is the fallback if this falls short. It would cost a Kotlin project and sideloading, and it isn't needed for phase 3.

iOS: the same web app installs on an iPhone but can't appear in the iOS share sheet. If Mike moves to iPhone, an iOS Shortcut posting to the same `POST /items` is about a day's work (estimate).

## Worker (`worker/`, new)

TypeScript, wrangler, tested locally with `@cloudflare/vitest-pool-workers`. Nothing in `desktop/` imports it.

| Route | Token | Does |
|---|---|---|
| `POST /items` | phone | multipart: `url?`, `note?`, `image*`, `saved_at`. Needs at least a URL or an image. Images ≤ 20 MB each, max 10. |
| `GET /app/*` | none | The phone web app: page, manifest, service worker, icons. No data, no secrets. |
| `GET /items?since=…` | desktop | Unsynced items, oldest first, with image keys and sizes. |
| `GET /images/:key` | desktop | Streams one image from R2. |
| `POST /items/:id/synced` | desktop | Marks an item synced. Doesn't delete it. |

- D1 table `items`: `id`, `saved_at`, `url`, `note`, `image_keys` (JSON), `merged_into`, `synced_at`.
- Tokens are Worker secrets (`PHONE_TOKEN`, `DESKTOP_TOKEN`), compared in constant time. A wrong token gets a 401 with no detail.
- **Merge window (screenshot + link):** if a POST arrives within **2 minutes** of an unsynced item, and one has only a link and the other only images, they become one item. This covers "share the screenshot, then share the link" in either order. Anything else stays separate.

## Desktop

**Schema v4: the table rebuild.** `url` and `normalized_url` become nullable. New columns: `inbox_id` (the Worker's item id, which keeps sync idempotent) and `kind` (`link` | `image`). A rebuild is needed because SQLite can't drop `NOT NULL` in place.

- Backup first (`VACUUM INTO`), as in v2 and v3.
- Copy every row with its `rowid`. The search index is keyed on rowid, so it's rebuilt afterwards and checked against the row count.
- Foreign keys are off during the swap and checked (`PRAGMA foreign_key_check`) before commit. Tags and frames keep pointing at the same ids.

**Sync.**
- Runs at launch, every 5 minutes while the app is open, and from File › Sync Phone Inbox.
- For each item:
  1. Download its images into the image cache.
  2. Write the save.
  3. Mark the item synced.
- A crash between steps 2 and 3 can't double-save, because `inbox_id` is checked first.
- A link from the phone goes through the existing add path: preview, Instagram post-id match and duplicate check. It gets `source = 'phone'` and keeps the phone's saved time.
  - If the link is already in the library, the phone's images and note are added to that save, not to a second copy.
- An image-only save gets `kind = 'image'` and no URL. Its title is the note's first line, or "Screenshot · 25 Nov". Frame 1 is the card image, and the rest go to `bookmark_images`.

**Settings.** Worker URL and desktop token, plus a "Test connection" button. The token is stored the same way the Anthropic key is today.

**Paste-link button.** In the drawer of an image-only save. It fills in the URL, runs the preview and duplicate check, and switches `kind` to `link`. If the link already exists as another save, it asks before merging the two.

**Everything that assumes a URL.** About 39 places in `db.js`, `ipc.js` and `mcp/src` read `url` or `domain`. Each gets a null path:
- cards and the drawer show the creator or the note, not a domain
- "open link" hides
- the dead-link check skips the save
- placeholders seed from the item id
- the MCP server returns `url: null`

## Mike sets up (once, about 15 minutes)

1. Install wrangler and log in (`npx wrangler login`).
2. Run `worker/setup.sh`. It creates the D1 database and R2 bucket, sets both tokens as secrets, deploys, and prints the URL and tokens once.
3. Paste the URL and desktop token into staaash Settings.
4. On the phone, open `<worker-url>/app` in Chrome, tap Install, open it once, and paste the phone token.

## Build steps (after approval)

1. Schema v4 rebuild, with tests on a copy of a v3 fixture: row count, ids, tags, frames, search hits and the backup all survive.
2. Null-URL paths across the app and MCP, with tests.
3. Worker + D1 + R2, with local tests: token scopes, validation, the merge window both ways, and sync idempotency.
4. Desktop sync, Settings, and the paste-link button.
5. The phone web app (share target, offline queue) and the setup script.
6. Stop for Mike to test, on the Mac and the phone:
   - a link from Chrome
   - a reel from Instagram
   - a screenshot from the screenshot preview
   - a screenshot then a link
   - a link already in the library
   - Mac asleep while saving, then a sync
   - a save in airplane mode, then back online
   - a wrong token

## Risks

- **The table rebuild touches every row.** Mitigations: the backup, rowid preserved, count checks before commit, and the whole step in one transaction.
- **The phone token sits in the phone web app's storage.** Anyone holding it can only add items, not read them. Rotating it means re-pasting it on the phone.
- **Android share sheets vary by app.** Some send a link as `url`, some as `text` with extra words around it. The test list covers Chrome, Instagram and the screenshot preview.
- **Instagram's share sheet gives a link, not the image.** Those saves get the placeholder until phase 4's frame fetch, the same as imported saves.
- **The Worker free tier is fine for one person** (estimate: well under 1% of the daily request limit). R2 storage grows with screenshots, at about 1 GB per ~2,000 screenshots (estimate).

## As built

- **Schema v4** (`schema.js`): table rebuilt with `url` and `normalized_url` nullable. Adds `kind`. Phone items are recorded in a new `inbox_applied` table rather than a column, because several phone items can land in one save. Orphaned tag/frame links are cleared first so they can't block the upgrade. Backup first, as before.
- **`desktop/src/main/inbox.js`** (no Electron): `applyInboxItem`, `attachLink`, `mergeInto`. Phone Instagram links are stored the way the export import stores them (`/p/{id}/`, `external_id`), so a reel shared from the phone finds the save the import made.
- **`desktop/src/main/sync.js`** (no Electron): download, write, then mark synced. A failed item stays in the inbox for the next run. File › Sync Phone Inbox reports; background runs show a toast only when something arrives.
- **App:** Settings › Phone inbox (address, desktop token, Test connection). Image saves show "From phone" and the note or "Screenshot · 25 Nov"; the drawer has Paste link and hides Open. A new phone link gets the usual preview fetch, but a screenshot sent with it stays the cover.
- **`worker/`:** Worker, D1 migration, R2, the phone app in `public/app/` (share target, offline queue in IndexedDB, background sync), `setup.sh`, README.
- **Retries:** each phone save carries a `client_id`, so a retry of a save that did arrive is stored once.
- **Tests:** `cd mcp && npm test` (48) and `cd worker && npm test` (15). Also checked end to end in a phone-sized Chrome against `wrangler dev`: setup with a wrong and a right token, a shared reel, two screenshots saved offline and sent on reopen, then the Mac sync pulling both into one save.

Found while building:
- The merge window joins **any** link-only and image-only save made within 2 minutes, related or not. Share a reel, then an unrelated screenshot a minute later, and they become one save. Paste link fixes the other direction, but nothing splits a wrong merge yet. If this bites, shrink the window (`LIMITS.mergeSeconds` in `worker/src/index.ts`) or ask in the save sheet.
- HEIC photos are accepted but Chromium can't show them, so the card would be blank. Android screenshots are PNG or JPEG, so this only matters for camera photos.
- R2 must be turned on in the Cloudflare dashboard once (it asks for a card even on the free tier). `setup.sh` says so if bucket creation fails.

## Mike's test

1. On the Mac, pull, then run `cd ~/staaash/mcp && npm test` and expect 48 passing.
2. Start the app with `cd ~/staaash/desktop && npm run dev`. It backs up the library (`staaash.db.bak-pre-v4-…`) and upgrades it to v4. Check that your saves, tags and search look unchanged.
3. Run `cd ~/staaash/worker && ./setup.sh` and copy the address and both tokens.
4. In staaash › Settings › Phone inbox, paste the address and desktop token, click Test connection (expect "Connected. 0 items waiting."), then Save.
5. On the phone, open `<address>/app` in Chrome, tap ⋮ › Install app, open staaash, and paste the phone token.
6. Try each of these, then choose File › Sync Phone Inbox on the Mac:
   - a link from Chrome
   - a reel from Instagram, including one already in the library: it should not duplicate
   - a screenshot from the screenshot preview
   - a screenshot, then its link within 2 minutes: one save
   - a save in airplane mode: the app says "Queued". Turn airplane mode off and open the app: it sends.
7. On an image-only save, click Paste link with a link on the clipboard. Try once with a new link and once with one already saved; the second should offer Merge.
8. Ask Claude Code about a phone screenshot. It should show `kind: image` and `url: null`.
