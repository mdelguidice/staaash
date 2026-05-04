# Stash — What We're Building and Why

## The Problem

The bookmark manager market is in chaos. Pocket shut down in July 2025. Omnivore shut down in November 2024. Millions of users lost their saved content overnight and had nowhere good to go.

The tools that remain are either expensive, bloated, poorly designed, or functionally abandoned:

- **Raindrop** — best-in-class UX, but gates its best features behind a $28/yr subscription
- **Readwise Reader** — best feature set, but $120/yr and has performance problems
- **mymind** — beautiful AI-first design, but no manual control and $84/yr
- **Pinboard** — beloved by power users, developer has checked out

Nobody is building a local-first, beautifully designed bookmark manager that's free or one-time-purchase and doesn't require trusting a cloud service with your data. That's the gap.

---

## What Stash Is

Stash is a personal URL bookmarking tool. You save links. You find them again. You actually use them.

The philosophy is **everything visible, nothing buried.** No folders. No nested hierarchies. Tags, search, and read/archive status handle organization without hiding content from you.

**Core stack:** Single `index.html` (vanilla HTML/CSS/JS) + `server.js` (Node, port 3847). No build tools. No frameworks. No dependencies you don't control.

**Data:** Server is the source of truth (`.cache/data.json`). localStorage is a fast render cache. All browsers share the same data via the local server.

---

## What's Built

- Card grid + list view with masonry layout
- Full-text search (title, summary, domain, content)
- Tags with AND-logic multi-select, color-coded by hash
- Library views: All, Favorites, Unread, Archived, Trash
- Detail drawer with notes, metadata, and actions
- Keyboard shortcuts (J/K/Enter/O/S/A/D/N/1/2/?)
- Bulk select, bulk tag, bulk archive/delete
- Dead link detection (background, checks links not verified in 7+ days)
- Duplicate detection (normalized URL dedup)
- Import (HTML bookmarks, JSON) + Export
- Backup/restore API
- Server-side metadata extraction (OG tags, content, images)
- Image proxy with disk cache
- Collapsible sidebar sections (Tags, Sources)

---

## What We're Building Next

### Near-term (active backlog)

- **Notes polish** — note indicator icon on cards, inline editing on card, cancel button in drawer, fix AI enhance bug
- **Tag polish** — dot colors in nav, tag editor layout, color variety, [+] add-tag on card
- **AI search** — natural language search bar (chat-style, bottom of screen), proactive resurfacing of old saves
- **Animation timing** — current transitions feel too quick/broken
- **Collections** — temporary project-scoped link groups, distinct from tags, with static HTML export for sharing (spec in `COLLECTIONS_SPEC.md`)

### Medium-term (differentiation)

- **Browser extension** — one-click save from any page (Cmd+Shift+S). This is the #1 acquisition driver for any bookmark tool.
- **Page archiving** — full content snapshot at save time. When the original 404s, the user still has it.
- **Semantic search** — search by meaning, not keywords. Embeddings-based, can run locally.
- **Smart resurfacing** — surface related past saves when adding a new link, and in a digest view
- **Reader mode** — extract and render article content in-app, with persistent highlights
- **Mobile / PWA** — responsive layout + share sheet so users can save from their phone

### Long-term (platform)

- RSS/newsletter ingestion (unique inbox email per user)
- Collaborative collections (shared link boards for teams)
- Content change monitoring (price drops, doc updates, job listings)
- Public sharing (shareable read-only collection pages)
- Reading stats and insights

---

## Design Principles

1. **Nothing buried.** Folders hide content. Tags + search surface it.
2. **Local-first.** Data lives on your machine. Cloud sync is opt-in, not required.
3. **Fast by default.** Render from localStorage instantly, sync from server in the background.
4. **Design quality matters.** Bookmark managers are often ugly. Stash shouldn't be.
5. **AI as drafting partner.** Suggestions you can accept, modify, or dismiss — not a system that decides for you.

---

## Competitive Position

The market gap is clear: **local-first, beautifully designed, free or one-time-purchase, with AI-assisted organization.**

No current tool occupies this position. The closest competitors either charge $80–120/yr, require cloud accounts, have dated design, or are dead. Stash can own this space.

The timing is right. Two major services died in the past 12 months. Users are actively looking.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Entire frontend (HTML + CSS + JS) |
| `server.js` | Node HTTP server — API, metadata extraction, image proxy |
| `.cache/data.json` | All user data (links, tags, collections) |
| `.cache/images/` | Proxied and cached card images |
| `.cache/backups/` | Periodic data backups |
| `FEATURE-ROADMAP.md` | Full feature roadmap with competitive analysis |
| `COLLECTIONS_SPEC.md` | Product spec for Collections feature |
| `OVERVIEW.md` | This file |
