# Phase 3 plan: phone inbox and sync

Status: draft 2026-11-25. Waiting on Mike's approval and two answers (see "Open questions").

Goal: save a link, a screenshot, or both from the phone. It lands in staaash on the Mac the next time the app syncs, even if the Mac was asleep when it was saved.

## How it fits together

```
Phone (share sheet) ──POST, phone token──▶ Worker ──▶ D1 (items) + R2 (images)
Mac app ──GET unsynced, desktop token──▶ Worker ──▶ download images ──▶ staaash.db
Mac app ──POST mark synced──▶ Worker
```

Already decided: Cloudflare Worker + D1 + R2 on Mike's account. Images stay in R2 after sync. There are two tokens: the phone's can only create items, and the desktop's can read items and mark them synced.

## Phone client

Recommended: an **iOS Shortcut** in the share sheet ("Save to staaash").

- It accepts a link, an image, or several images from Safari, Instagram, Photos or the screenshot preview, plus an optional note.
- It sends them in one request to the Worker with the phone token.
- It shows "Saved" or the error.
- It needs no App Store, no Xcode and no $99/yr developer account. I write it as a step list plus a signed `.shortcut` file. Mike adds the token once.

Weakest point: with no signal, the save fails and isn't queued. Mike has to retry it. A native app with a share extension would queue offline, but it needs Xcode, signing, and re-installing every 7 days without a paid account. Not worth it for phase 3.

## Worker (`worker/`, new)

TypeScript, wrangler, tested locally with `@cloudflare/vitest-pool-workers`. Nothing in `desktop/` imports it.

| Route | Token | Does |
|---|---|---|
| `POST /items` | phone | multipart: `url?`, `note?`, `image*`, `saved_at`. Needs at least a URL or an image. Images ≤ 20 MB each, max 10. |
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
4. Install the Shortcut on the iPhone and paste the phone token into it.

## Build steps (after approval)

1. Schema v4 rebuild, with tests on a copy of a v3 fixture: row count, ids, tags, frames, search hits and the backup all survive.
2. Null-URL paths across the app and MCP, with tests.
3. Worker + D1 + R2, with local tests: token scopes, validation, the merge window both ways, and sync idempotency.
4. Desktop sync, Settings, and the paste-link button.
5. The Shortcut and the setup script.
6. Stop for Mike to test, on the Mac and the phone:
   - a link
   - a screenshot
   - a screenshot then a link
   - a link already in the library
   - Mac asleep while saving, then a sync
   - a wrong token

## Risks

- **The table rebuild touches every row.** Mitigations: the backup, rowid preserved, count checks before commit, and the whole step in one transaction.
- **The phone token sits in a Shortcut.** Anyone holding it can only add items, not read them. Rotating it means re-pasting it in the Shortcut.
- **Instagram's share sheet gives a link, not the image.** Those saves get the placeholder until phase 4's frame fetch, the same as imported saves.
- **The Worker free tier is fine for one person** (estimate: well under 1% of the daily request limit). R2 storage grows with screenshots, at about 1 GB per ~2,000 screenshots (estimate).

## Open questions

1. iOS Shortcut as the phone client (recommended), or a native app?
2. Is a 2-minute merge window right?
