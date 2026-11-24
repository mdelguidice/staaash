# Phase 2 plan: Instagram import

Status: draft, awaiting Mike's approval. No code until approved.

Decided 2026-11-24: Instagram collections become tags. The import brings in only the collections Mike picks.

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
| collection name | tag (lowercased; case-only duplicates merged, so `Basketball` and `basketball` become one tag) |
| — | `source = 'instagram-export'`, `platform = 'instagram'` |

## Choosing collections

- The import opens a checklist of collections with save counts, all unchecked. "Not in any collection" (312 saves) is its own row.
- Only saves in a checked collection come in. A save in two collections comes in once, with a tag for each checked collection it's in.
- The dry run shows the totals before anything is written: new saves, saves that get a new tag, and skipped saves.
- The checklist remembers last run's picks. Re-running with another collection checked adds those saves and tags without duplicates.
- Slash names stay whole (`soccer/drills`). Search still finds them under "soccer" because the index splits on the slash.

## Re-running

Matches on post ID and fills empty fields only. It adds tags for checked collections and never removes a tag. It never touches `note`, favorites, archive or delete state. A save Mike deleted in staaash stays deleted.

## Pilot fields (only if the pilot passed)

Pilot status (saves-pilot.zip, 2026-11-23): fetch passed, 20/20 with no Instagram warnings. Mike's two checks are not recorded anywhere in the zip: layout_type agreement ≥16/20, and a physician-card pick beating the caption picks in his judgment. These fields stay out until he does both.

- `on_screen` → `ai_description`.
- `layout_type`, `visual_style`, `good_for`, `confidence` → new columns, added to the search index.
- Frame 1 → card image. Other frames → new per-save image list. The MCP server returns all of them.
- These arrive from a pilot-format CSV plus frame folder, through the same File menu import. The downloader stays outside staaash.

## Build steps (after approval)

1. Schema v3: new pilot columns, a `bookmark_images` table, and the search index rebuilt to include them. Backup first, same as v2.
2. Parser for the export folder or zip: decode text, dedupe on post ID, union in collection-only saves, build the collection → saves map.
3. File › Import Instagram saves…: collection checklist, then a dry-run count (new / new tag / skipped), then write.
4. Pilot importer for CSV + frames.
5. Tests: encoding fix, ID matching across URL forms, only checked collections import, case-duplicate collections merge into one tag, re-run adds tags but never removes one or touches notes, saved dates kept.
6. Stop for Mike to test on his Mac: run it on the real export, then re-run it and confirm nothing changes.

## Risks

- `url NOT NULL` is fine here: every save has a URL. Phase 3 still owns the rebuild.
- Cards have no image until frames exist. They get the gradient placeholder. The first import is smaller now: about 240 for the design-type collections (estimate).
- If Mike removes an imported tag and later re-imports that same collection, the tag comes back. Fix only if it bites: remember removed import tags.
- Searching 1,000+ caption hashtags may crowd ranking. Mitigation: index the caption in `summary`, which already ranks below `title`.
