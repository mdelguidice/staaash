# Phase 2 plan: Instagram import

Status: draft, awaiting Mike's approval. No code until approved.

## What the export gives us (instagram-mdel83-2026-11-21)

- `your_instagram_activity/saved/saved_posts.json`: 1,035 saves, each with a saved-at timestamp, URL, caption and creator username. No images.
- Dates span 2024-01-01 to 2026-11-20 (2024: 94, 2025: 183, 2026: 758). The first save lands on 1 Jan 2024, which looks like an export date-range cut-off, not the true start.
- `saved_collections.json`: 29 collections. 752 saves sit in at least one; 140 sit in two or more; about 310 sit in none. 28 collection members are missing from `saved_posts.json`.
- URL mix: about 80% `/reel/`, 20% `/p/`, 2 `/tv/`. 4 post IDs repeat.
- Every caption is mis-encoded (UTF-8 read as Latin-1, so emoji show as `ð...`). All 1,110 decode cleanly with a Latin-1 → UTF-8 round trip.
- Collection names are messy: `basketball`, `Basketball` ×2, `gaming` / `Gaming`, `Food` / `Food & recipes`, and slash names such as `soccer/drills`.

## Import, field by field

| Export | staaash |
|---|---|
| post ID from URL | match key (`/p/`, `/reel/`, `/tv/` share it); stored URL normalized to `https://www.instagram.com/p/{id}/` |
| timestamp | `created_at` (saved date, not import date) |
| username + caption line 1 | `title` = "creator · caption first line" |
| caption (decoded) | `summary` |
| collection name | see decision 2 |
| — | `source = 'instagram-export'`, `platform = 'instagram'` |

Re-running the import: matches on post ID, fills empty fields only, never touches `note`, tags, favorites, archive or delete state. A save Mike deleted in staaash stays deleted.

## Pilot fields (only if the pilot passed, see decision 3)

- `on_screen` → `ai_description`.
- `layout_type`, `visual_style`, `good_for`, `confidence` → new columns, added to the search index.
- Frame 1 → card image. Other frames → new per-save image list. The MCP server returns all of them.
- These arrive from a pilot-format CSV plus frame folder, through the same File menu import. The downloader stays outside staaash.

## Build steps (after approval)

1. Schema v3: new pilot columns, a `bookmark_images` table, and the search index rebuilt to include them. Backup first, same as v2.
2. Parser for the export folder or zip: decode text, dedupe on post ID, union in collection-only saves.
3. File › Import Instagram saves…: shows a dry-run count (new / updated / skipped) before writing.
4. Pilot importer for CSV + frames.
5. Tests: encoding fix, ID matching across URL forms, re-run leaves notes and tags alone, saved dates kept.
6. Stop for Mike to test on his Mac: run it on the real export, then re-run it and confirm nothing changes.

## Risks

- `url NOT NULL` is fine here: every save has a URL. Phase 3 still owns the rebuild.
- About 1,060 cards with no image until frames exist (estimate). They get the gradient placeholder.
- Searching 1,000+ caption hashtags may crowd ranking. Mitigation: index the caption in `summary`, which already ranks below `title`.
