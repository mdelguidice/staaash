# Stash Collections — Product Spec

> Status: Specced, not yet built  
> Last updated: April 2, 2026

---

## Overview

Collections are temporary, project-scoped groupings of links in Stash. They are distinct from tags — tags are taxonomic labels, collections are purposive workspaces (e.g. "rebrand research", "competitor analysis"). Links are referenced by a collection, never modified by it. When a project is done, the collection is completed and the links remain in the library untouched.

Sharing is supported via one-click static HTML export — no accounts, no real-time sync, no backend changes required.

---

## Product Decisions Still Open

1. **Right-click context menu** — The spec assumes a right-click context menu as the primary way to add a link to a collection. Stash doesn't currently have one. Alternatives: add to card hover actions (alongside heart button), or only via the detail panel.

2. **Drag to reorder within a collection** — Adds meaningful complexity. Worth it, or is creation order fine for v1?

3. **Completed collections in sidebar** — Should completed collections be visible in the sidebar (in a collapsed sub-section), or tucked away somewhere else (like how Archived works in Library)?

4. **Export options popover** — Spec includes checkboxes for what to include in the export. Could simplify to always include everything and skip the popover.

---

## 1. Data Model

### New top-level array: `allCollections`

Stored alongside `allLinks` and `allTags` in `.cache/data.json`.

```json
{
  "id": "col_1711900000000",
  "title": "Rebrand Research",
  "description": "Visual references and competitor audits for Q3 rebrand",
  "status": "active",
  "createdAt": 1711900000000,
  "completedAt": null,
  "linkIds": ["link_abc", "link_def", "link_xyz"],
  "exportedAt": null
}
```

**Field notes:**
- `id`: `col_` + `Date.now()` at creation time
- `status`: `"active"` | `"complete"` — no other states
- `linkIds`: ordered array of link IDs; order is user-controlled. Links are never modified.
- `completedAt`: null until completed; set to timestamp when status changes to `"complete"`
- `exportedAt`: updated each time an export is generated; null if never exported

No changes to the existing link or tag schema.

---

## 2. UI — Sidebar Placement

Add a **Collections** section to the sidebar, positioned between Tags and Sources:

```
Library          ← existing
Tags             ← existing
Collections      ← new
Sources          ← existing
```

Follows the same collapsible section pattern as Tags (chevron toggle, `+` button on the right).

Each active collection sidebar item shows:
- Collection title (truncated with ellipsis)
- Faint pill badge with link count — same style as the unread count badge
- No icon, or a minimal stack/layers icon

Completed collections appear under a **"Completed"** sub-header within the Collections section, collapsed by default, with muted text.

### Creating a collection

Click `+` next to the Collections header → inline creation row in the sidebar:
- Text input for title (required, placeholder: "Collection name")
- Optional input for description (placeholder: "Notes or goal — optional")
- Confirm via Enter or ✓ button; cancel via Esc or ✕

On confirm: collection created with `status: "active"`, sidebar item becomes selected, collection detail view opens.

### Context menu on a sidebar collection item

- Rename
- Add / Edit description
- Mark as complete (if active)
- Reopen (if complete)
- Export as HTML
- Delete — shows confirmation: "Delete [Title]? The [N] links in this collection stay in your library."

---

## 3. Adding Links to a Collection

### From a card (grid/list view)

Right-click → **"Add to Collection →"** opens a flyout submenu listing active collections. Clicking adds the link. Already-added collections show a checkmark. No toast — checkmark is the only feedback.

If no active collections exist: item reads "Add to Collection" (disabled) with sub-label "No active collections."

### From the detail panel

A **Collections** row in the metadata section, below Tags. Shows pill chips for each collection this link belongs to — same shape as tag chips but distinct color (muted indigo). Each chip:
- Clickable → navigates to that collection
- Has a `×` to remove the link from that collection

A `+` button opens an inline dropdown listing active collections.

### Bulk add

When links are bulk-selected, the bulk action toolbar gains an **"Add to Collection"** button. Opens a popover listing active collections with checkboxes. Submitting adds all selected link IDs, deduplicating existing entries.

---

## 4. Collection Detail View

Clicking a collection in the sidebar loads its detail view in the main content area.

### Header

```
[Icon]  Rebrand Research                    [Complete]  [Export]  [⋯]
        Visual references and competitor audits for Q3 rebrand
        4 links · Created Mar 31 · Active
```

- Title: inline-editable on click
- Description: inline-editable on click; faint "Add a description..." if empty
- Status badge: "Active" (green) / "Complete" (gray)
- **[Complete]** → triggers complete flow (see §5)
- **[Export]** → triggers export flow (see §6)
- **[⋯]** menu: Rename, Edit description, Reopen (if complete), Delete
- For completed collections: [Complete] becomes [Reopen]; [Export] remains

### Card grid

Same masonry/list grid as the rest of the app, filtered to `linkIds`. Respects view toggle and sort controls. Adds one sort option: **Custom order** (the `linkIds` array order) — default sort within a collection.

Cards show a drag handle on hover (left edge) to allow reordering. Reordering updates `linkIds` and persists immediately.

Card right-click context menu includes **"Remove from Collection"** — removes the link ID from `linkIds` only; link stays in the library.

Empty state: "No links yet. Add links from any card's right-click menu."

---

## 5. Complete Flow

1. Click **[Complete]** → small confirmation popover (not a modal): "Mark as complete? The [N] links stay in your library." with [Mark Complete] and [Cancel].
2. On confirm: `status: "complete"`, `completedAt: Date.now()`, persisted via `/api/data`.
3. Collection moves from active list to Completed sub-section in sidebar.
4. Header updates: status badge → "Complete", [Complete] → [Reopen], "Completed [date]" appears in metadata.
5. Completed collections are read-only: drag-to-reorder disabled, "Remove from Collection" removed from card menu. Title/description remain editable.

**Reopen**: sets `status: "active"`, clears `completedAt`, moves back to active list. No confirmation needed.

---

## 6. Export / Share Flow

### Triggering export

Click **[Export]** → small popover:

```
Export "Rebrand Research"
─────────────────────────
[✓] Include link descriptions
[✓] Include tags
[ ] Include your collection notes

[Download HTML]   [Cancel]
```

File auto-named: `rebrand-research-export.html` (slugified title + `-export.html`).

### How the file is generated

Entirely client-side in the browser. No server endpoint needed.

1. Pull the collection record, resolve `linkIds` against `allLinks` (skip dangling IDs silently)
2. Build a self-contained HTML string with all styles inlined
3. Trigger download via temporary `<a>` element with `URL.createObjectURL(blob)`

After download: `exportedAt` updated to `Date.now()` and persisted.

### Static export page structure

Minimal, read-only, no JavaScript:

```
Browser tab title: "Rebrand Research — Stash Export"

Header:
  [Collection title]
  [Description, if included]
  [N] links · Exported [date]

Link list (single-column or 2-col responsive):
  For each link (in custom order):
    [Favicon] [Title]     ← live <a href> to original URL
    [URL, muted]
    [Description, if included]
    [Tag chips, if included — styled, not interactive]
```

No Stash branding. No "back to Stash" links. Renders correctly from `file://` (no server required).

---

## 7. Edge Cases

**Link deleted from library while still in a collection**
- Do not cascade-delete from collections — would be surprising
- In collection detail view, silently skip dangling link IDs when rendering
- Show a notice: "1 link in this collection was removed from your library." with a [Clean up] option that removes dangling IDs from `linkIds`
- Sidebar badge count = `linkIds.length` (unfiltered, fast). Detail view count = resolved links only (accurate).
- On export: dangling IDs silently skipped

**Link in multiple collections**
Fully supported. A link ID can appear in multiple `linkIds` arrays. No limit enforced.

**Empty collection**
Allowed. Can be created, completed, and exported with zero links. Sidebar badge shows `0`.

**Duplicate link ID in `linkIds`**
Prevented at write-time: check for existence before pushing. No deduplication pass needed at read-time.

**Very long collection list**
No pagination needed. Sidebar scrolls. Collections are scoped to temporary projects — the expectation is the list stays manageable.

**Renaming a collection**
Updates `title` only. No side effects. `exportedAt` not cleared (export may have stale title — acceptable).

---

## 8. Explicit Non-Goals

| What | Why not |
|------|---------|
| Nested collections / sub-collections | Contradicts the temporary, flat mental model |
| Automatic link suggestions | Requires content analysis, outside the local architecture |
| Collection templates | Every collection starts empty |
| Search within a collection | Global search is sufficient; collections are rarely large |
| Sync or backup of collections | Lives in `.cache/data.json` like everything else |
| Collection-level permissions or locking | Single-user app |
| Activity log / history | Added complexity, no value in single-user context |
| Sorting collections in sidebar | Creation order is fine for v1 |
| Cover images or visual customization | Collections are functional, not decorative |
| Real-time collaboration | Out of scope — sharing is static export only |
| User accounts / auth | Out of scope for this version |

---

## Technical Notes

- `allCollections` is a new top-level array in `.cache/data.json` — server.js `GET /api/data` and `POST /api/data` need to pass it through alongside `allLinks` and `allTags`
- Collection IDs: `col_` + `Date.now()`
- No changes to link or tag schema
- Export is 100% client-side — no new server endpoints needed for sharing
- Drag-to-reorder within a collection detail view requires a drag handler that updates `linkIds` order and calls `saveToStorage()`
