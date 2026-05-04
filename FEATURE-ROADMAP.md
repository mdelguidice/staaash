# Stash — Feature Roadmap

## Part 1: Missing Table Stakes

These are features every serious bookmark manager has. Without them, Stash feels like a prototype.

### Search
- **Full-text search of page content** — Currently search only checks title, summary, and domain. It should search the actual page text. Cache the extracted HTML content at save time and index it.
- **Search-as-you-type with highlighted results** — Show which field matched and highlight the matching text in results.

### Browser Extension
- **Chrome/Firefox/Safari extension** — One-click save from any page with keyboard shortcut (Cmd+Shift+S or similar). Should auto-extract metadata without needing the server. This is the #1 acquisition vector for any bookmark tool.
- **Right-click context menu** — "Save to Stash" in the browser context menu.

### Data Portability
- **Import from Pocket, Raindrop, Instapaper, browser bookmarks (HTML)** — Users switching from dead services (Pocket shut down July 2025, Omnivore November 2024) need frictionless migration.
- **Export to HTML, JSON, CSV, Markdown** — Full fidelity: tags, timestamps, read status, notes all preserved.
- **Backup/restore** — Periodic automatic backup of all data. Currently everything lives in localStorage which is fragile.

### Mobile
- **Responsive design or native app** — The current UI is desktop-only. At minimum, a responsive layout. Ideally a PWA with share sheet integration so users can save from mobile browsers.

### Keyboard Shortcuts
- **Full keyboard navigation** — J/K to move between cards, Enter to open, S to star, A to archive, D to delete, / to focus search. Readwise Reader's keyboard-first UX is the gold standard.

### Bulk Operations
- **Multi-select** — Shift+click or checkbox mode to select multiple cards.
- **Bulk tag, archive, delete, move** — Apply actions to selections. Currently everything is one-at-a-time.

### ~~Collections / Folders~~ — REMOVED
Intentionally excluded. Stash's philosophy is "everything visible, nothing buried." Folders create the illusion of organization but hide content. Tags + search + unread/archived already handle organization without burying anything.

### Dead Link Detection
- **Periodic link health check** — Scan saved URLs and flag 404s. Alert the user. Offer to show the cached version if available.

### Duplicate Detection
- **URL-based dedup** — Already partially implemented (normalized URL check on save). Extend to catch near-duplicates (same article at different URLs, tracking parameter variations).

---

## Part 2: Features That Elevate

These are the features that move Stash from "another bookmark manager" to something genuinely differentiated. Ordered by impact.

### 1. Page Caching / Permanent Archive
Save a full snapshot of every bookmarked page at save time. When the original goes down (and it will — link rot is endemic), the user still has the content. Only Raindrop Pro ($28/yr) and Pinboard Archival ($39/yr) offer this. Making it free or included would be a significant differentiator.

**Implementation:** On save, extract and store the page's readable content (like Readability/Mozilla's parser). Store as HTML in the cache directory alongside images. Serve from `/api/archive/:id`.

### 2. AI Auto-Tagging and Smart Organization
When a link is saved, use an LLM to:
- Suggest 2-3 tags based on the page content
- Categorize it (article, tool, video, product, reference, inspiration)
- Generate a one-line summary if the OG description is missing or generic

**Why this wins:** mymind does AI-only organization (no manual control). Raindrop does AI-suggested tags but they're often wrong. The sweet spot is AI suggestions that the user can accept, modify, or dismiss — AI as a drafting partner, not a dictator.

### 3. Context Capture — "Why Did I Save This?"
No bookmark manager captures intent. When saving, optionally capture:
- What the user was searching for when they found this link
- What project/tab group it was part of
- A quick voice memo or text note ("save this for the redesign")
- The referring page (where were they when they clicked this link)

This turns a bookmark from a dead URL into a rich context object. When you revisit it 6 months later, you know exactly why you saved it.

### 4. Smart Resurfacing — "You Might Want to Revisit This"
Based on what the user is currently reading/working on, surface relevant past saves. Two modes:

- **Active:** When saving a new link, show "You saved 3 similar links" with matches based on content similarity, not just tags.
- **Passive:** A daily/weekly digest email or in-app notification: "You saved these 5 links about design systems 3 months ago and never opened them."

Readwise's Daily Review does random spaced repetition. This is smarter — it's contextual, not random.

### 5. Reader Mode with Highlighting
Extract and render article content in a clean, distraction-free reading view directly in Stash. Highlights persist and are searchable. No need to leave the app to read.

**Key details:**
- Use Mozilla's Readability library for article extraction
- Store highlights as annotations linked to the saved content
- Make highlights searchable (find all highlights about "typography")
- Export highlights to Markdown/Obsidian

### 6. RSS / Newsletter Ingestion
Give each user a unique email address (e.g., `mike@stash.inbox`). Newsletters sent there auto-save as links with the email content extracted. RSS feeds can be monitored and new items auto-saved.

**Why this matters:** Readwise Reader's newsletter ingestion is one of its most loved features. It consolidates reading into one place. Omnivore had this too before it died.

### 7. Collaborative Collections
Shared collections where multiple people can save, tag, and annotate links together. Use cases:
- Design team curating inspiration
- Research team collecting sources
- Couple planning a trip

Raindrop has basic collaboration. Are.na is built around it. Neither is great for async team workflows with comments and annotations.

### 8. Content-Aware Semantic Search
Search by meaning, not keywords. "That article about making animations feel natural" should find the "Easing Blueprint" bookmark even though those exact words aren't in the title.

**Implementation:** Generate embeddings for each saved item's content at save time. Store in a local vector index. On search, embed the query and find nearest neighbors. Can be done locally with a small model or via API.

### 9. Smart Collections (Saved Searches)
Dynamic collections that auto-populate based on rules:
- "All items tagged 'design' saved in the last 30 days"
- "All unread items from instagram.com"
- "Items with no tags"

Anybox does this well. It's a power-user feature that makes organization feel automatic.

### 10. Screenshot / Visual Preview Fallback
When OG images are missing, take an automated screenshot of the page. The current PageSpeed API fallback is slow and unreliable. A headless browser (Playwright) running locally would be faster and more reliable.

### 11. Tab Session Management
Save all open browser tabs as a named session. Restore them later. This bridges the gap between "I have 47 tabs open" and "I should save these somewhere." Toby does this but nothing else.

**Integration point:** Each tab in a saved session becomes a Stash link. The session itself becomes a collection/tag.

### 12. Reading Stats and Insights
- How many links saved per week/month
- Read vs unread ratio
- Most-saved domains
- Tags breakdown
- Average time to read a saved link
- "You've archived 47 links this month" — positive reinforcement

### 13. Content Change Tracking
Monitor saved pages for changes and notify the user. Useful for:
- Product pages (price drops)
- Documentation (API changes)
- Articles (corrections/updates)
- Job listings (new postings)

Almost no bookmark manager does this. It turns passive bookmarking into active monitoring.

### 14. Local-First Architecture
Move from localStorage to IndexedDB or SQLite (via WASM). Add optional cloud sync. User data never leaves their device unless they opt into sync.

**Why this matters:** Pocket and Omnivore both died and deleted user data. Trust in cloud-only bookmark services is at an all-time low. Local-first with optional sync is the most trust-building architecture choice.

### 15. Public Sharing and Collections
Let users create public collections with a shareable URL. "Mike's Design Inspiration" as a living, updating page. Useful for:
- Content creators sharing resources
- Teams sharing reference material
- Building an audience around curation

---

## Part 3: Competitive Positioning

### What's Dead (Opportunity)
- **Pocket** (shut down July 2025) — millions of displaced users
- **Omnivore** (shut down November 2024) — beloved open-source tool, users still grieving

### Who to Study
- **Raindrop.io** — market leader, but premium-gated features and clunky AI
- **Readwise Reader** — best feature set, but $120/year and performance issues
- **mymind** — best AI integration, but no manual control and no collaboration
- **Pinboard** — beloved by power users, but abandoned by its developer

### Stash's Potential Wedge
The market gap is: **a local-first, beautifully designed bookmark manager with AI-assisted organization that doesn't require a subscription to be useful.** No tool currently occupies this position.

- Raindrop requires Pro ($28/yr) for its best features
- Readwise Reader costs $120/yr
- mymind costs $84/yr
- Pinboard is functionally abandoned
- Pocket is dead
- Omnivore is dead

A free/one-time-purchase tool with local-first data, smart AI features, and a design quality bar that matches the best consumer apps would have no direct competitor.
