# staaash

Live app is `desktop/` (Electron ~42.1, pinned: don't bump). The visual-diff harness was removed on 2026-11-24 (unreliable, slow, token-heavy); check UI changes in the running app. `mcp/` is a read-only MCP server with its own `node_modules` (Node ABI, not Electron's).

## State

- Capture-library project on branch `claude/sharp-planck-gkoaw5`. Mike wants to stop and test after each phase.
- Phase 1 is pushed: schema v2 (`desktop/src/main/schema.js`) plus the MCP server. On Mike's Mac the migration ran with a backup and `npm test` passed 14/14. Claude Code found a save Mike asked for in his real library. Phase 1 is done.
- In-app search ranks by field and shows best matches first while a query is active. The Ask bar offers "Filter by tag" when the typed words name a tag.
- Decided: the cloud inbox is a Cloudflare Worker + D1 + R2 (Mike has an account), with images kept after sync. It uses two tokens: the phone's can only create items; the desktop's can read and mark synced. Screenshot + link: a merge window plus a paste-link button.
- Vision model: Haiku 5.5, unless a 20-image side-by-side against Sonnet 5.5 shows it falls short. Mike adds a new API key in Settings.
- Phase 3 rebuilds the table so URL is optional. Phase 1 deliberately didn't.

## What is next

- Phase 2: import Mike's Instagram saves. Draft plan: `docs/phase-2-instagram-import-plan.md`. Blocked on: (a) collections as tags vs fields, (b) import all vs chosen collections, (c) Mike's two pilot checks (layout_type ≥16/20, physician-card pick). The pilot zip records the fetch passing (20/20) but not his checks. Never commit saves-pilot or run its fetch_frames.py.
- Then phase 3 (Worker inbox + phone app + sync) and phase 4 (vision pass, using the pilot's description schema).
