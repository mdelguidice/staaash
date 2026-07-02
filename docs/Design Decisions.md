# Stash — Design Decisions

A record of the choices baked into the current prototype (`Stash v2.html`) and *why* we made them. Organized from product framing down to interaction and visual detail.

---

## 1. Product framing

### "A bookmark app for the curious"
We positioned Stash as a tool for people who collect *things worth returning to* (essays, references, inspiration), not a generic read-later or link-dumping ground. This shaped almost every other decision below: the gallery-first layout, the tag/collection vocabulary, the seed content, and the "feels curated from the first save" empty state.

### One library, many lenses
Rather than nesting bookmarks in folders, we landed on a single flat library that you slice with **collections** + **tags** + **smart filters** (Unread, Saved today, Everything). This avoids the "where did I put it?" problem that breaks every folder-based bookmark tool, and matches how curious readers actually re-find things ("the typography one from last month").

### Save friction → near-zero
The save modal is one input — paste a URL, we do the rest (auto-tag, auto-collection, thumbnail). The empty state literally promises this: *"Paste a link. We'll do the rest."* This is the central product bet, so it gets the most prominent affordance (`+ New`, `⌘N`, and the empty-state CTA).

---

## 2. Information architecture

### Sidebar = navigation, not settings
Left rail holds the only persistent nav: smart filters at top, smart collections below, tags below that. Settings/tweaks live elsewhere so the sidebar stays a *library map* and not a control panel.

### Collapsible sidebar with persistence
The collapse state is stored in `localStorage` (`stash_sb_collapsed`) so the user's preference survives reloads. Decision: prioritize stable layout muscle memory over fresh-session defaults.

### Smart collections over user folders (for now)
Six seeded collections — *Craft & Detail, Typography, Motion, Inspiration, Systems, Reading List* — model the kinds of things curious people actually save. They're *suggestions* the AI assigns to, not user-managed folders. Trade-off accepted: less control, but no cold-start "set up your folders" tax.

### AskBar as a third nav surface
A natural-language search bar floats persistently at the bottom. It's the answer to "I know I saved a thing about color in dark mode" without needing perfect tag recall. It filters the gallery in place rather than navigating to a results page so the user keeps spatial context.

---

## 3. Layout & view modes

### Gallery (masonry) as the default
Bookmarks are visual objects, so the default is a masonry grid that respects each item's natural aspect ratio. This makes the library feel like a moodboard rather than a spreadsheet — important for the "curious collector" persona.

### List view as the alt
A dense list view ships alongside for scanning by title/site/time. We didn't try to make one view do both jobs.

### Density tweak (compact / regular / comfy)
Different libraries want different densities (16 cards vs. 1,600). Default is `comfy` for a relaxed first impression; users with dense libraries can drop to `compact`.

### Configurable min column width
`minColW` (220–420 px) is exposed as a tweak because the *right* card size depends on screen, content type, and taste — and we don't know yours.

---

## 4. The card

### Image-forward
Each card leads with a thumbnail (OG image or placeholder), then title, site, optional tag chips. The thumbnail is the recognition surface — most people re-find by *visual memory* before they re-find by text.

### Per-item color + accent
Every seed bookmark has a `color` (background/tint) and `accent` (favicon/highlight) baked in. This produces visual variety across the grid without us hand-styling each card, and lets the favicon mark feel like a tiny brand chip rather than a generic letter tile.

### Optional tag chips
`showTags` is a tweak (default on). On dense libraries chips become noise; we let users turn them off rather than picking one default for everyone.

### Pointer tilt (off by default in dense modes)
Cards tilt subtly toward the cursor — a *grammar of interaction* nod (anticipation → response). It's a tweak so people who find motion distracting can disable it, and we add a `no-tilt` body class so the CSS can fully short-circuit the transform.

---

## 5. Save flow

### Modal, not a page
Saving is a transient action, not a destination. Modal keeps the user's place in the gallery.

### Auto-tag on paste
`suggestTagsFor()` runs a regex pass on the URL/title and surfaces 0–4 likely tags. The user can confirm or edit. This sells the "we do the rest" promise without pretending to be magic — the suggestions are visible and editable.

### Toast + just-saved highlight
On save: toast confirmation ("Saved · {title}") plus a transient highlight on the new card. Two confirmations because the new card may scroll-in off-screen; the toast covers that case.

---

## 6. Detail pane

### Side pane, not full-page
Opening a bookmark slides a detail pane in over the gallery rather than navigating away. Preserves the library's spatial context and makes "open three things in a row" cheap.

### Related items at the bottom
Pulled by tag overlap from the same library. Encourages re-discovery within your own stash — the central reason the product exists.

### Esc to close, click outside to close
Standard overlay etiquette. Esc also closes the save modal, command palette, and direction doc — single key, predictable behavior.

---

## 7. AskBar (natural-language search)

### Floats at the bottom, always available
It's the "I'm looking for..." surface and it should be one keystroke away from anywhere. Bottom placement keeps it clear of the topbar, sidebar, and the user's primary content flow.

### Filters in place
Asking a question filters the current gallery rather than swapping to a separate results UI. Keeps the answer in the same spatial frame as the rest of the library.

### Visible "interpretation" line
The bar echoes back what it understood (`Looking for "color", "dark"`). The model is crude on purpose — visibility is how we keep the user's trust when it's wrong.

### Score-ranked, recency-aware
`nlSearch()` boosts tag matches (×4), title matches (×3), body matches (×1), and adds a small recency bump when the query mentions "last week" / "recent" / etc. Simple, legible, easy to reason about.

---

## 8. Command palette (⌘K)

### Power-user fast lane
Same library, different access modality. ⌘K to jump to any item by name; ⌘N to save. Standard shortcuts so muscle memory from other apps transfers.

---

## 9. Visual system

### Dark-first, with a real light mode
Most curious-collector tools (Are.na, Raindrop, etc.) live dark; we matched that and stored the preference (`stash_theme`) so it survives reloads. Light mode is a first-class branch, not an afterthought.

### Layered blur stack as ambient background
Seven `.blur-layer` divs + a tint overlay create a soft, depth-of-field backdrop. It's decorative ambience that gives the gallery somewhere to sit without competing with cards. Aria-hidden because it carries no information.

### Single accent color, configurable
One `--accent` CSS var drives focus rings, active states, and the AskBar orb. Default `#7AA2FF` (cool indigo-blue). Exposed as a tweak so users can retune it; everything else (greys, surfaces) stays neutral.

### Type: Inter + JetBrains Mono
Inter for UI (familiar, neutral, large x-height — good at small sizes); JetBrains Mono for the eyebrow/meta tags that want to feel slightly system-y. Two-family ceiling kept.

---

## 10. Resurface strip (off by default)

A "From your stash · this week" rail that pulls 3–4 items from a month+ ago, framed as *"You saved 4 things last month worth a re-read."*

Off by default because it's an opinionated surface — not everyone wants their tool to nudge them. Available as a tweak for people who want their stash to talk back.

---

## 11. Persistence & migration

- Bookmarks: `stash_bookmarks_v2`
- v1 → v2 migration on load: overlay seed metadata (image, color, accent) onto stored items so older stashes pick up new visual fields without losing user-added entries.
- Theme, sidebar collapse: separate `localStorage` keys.

Decision: keep persistence keys versioned (`_v2`) so future schema changes can migrate cleanly instead of nuking user data.

---

## 12. Tweaks panel

### Tweaks ≠ settings
The tweaks panel is for *exploring the design*, not for shipped product preferences. It exposes accent, density, min column width, tag chips, resurface strip, and pointer tilt — the levers we wanted to leave open for the user/reviewer to retune. Settings that survive across users (theme, sidebar collapse) live outside it.

### Defaults wrapped in EDITMODE markers
Defaults block uses `/*EDITMODE-BEGIN*/.../*EDITMODE-END*/` so direct-manipulation edits in the host can be persisted to the file as JSON.

---

## 13. What we deliberately did *not* do

- **No folders.** Tags + smart collections cover the navigation jobs.
- **No social/sharing surfaces.** Stash is for one person re-finding their own things.
- **No hand-drawn illustrations or stylized SVG art.** Imagery comes from real OG thumbnails or neutral placeholders; no AI-illustration filler.
- **No emoji as iconography.** Single-letter favicon marks instead — feels more like a real product.
- **No gradient hero, no marketing landing.** The app opens straight into your library.
- **No onboarding flow.** Empty state + first-save is the onboarding.

---

## 14. Open questions / next decisions

- Should smart collections be user-editable, or stay opinionated?
- AskBar: graduate to real semantic search, or keep the legible regex-based ranker?
- Resurface strip: on by default if we can prove it's useful?
- Mobile: gallery survives, but the detail pane and AskBar both need rethinks at < 720 px.
- Multi-select + bulk actions (move, retag, delete) — not yet built.
