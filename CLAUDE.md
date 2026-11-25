# staaash

Live app is `desktop/` (Electron ~42.1, pinned: don't bump). The visual-diff harness was removed on 2026-11-24 (unreliable, slow, token-heavy); check UI changes in the running app. `mcp/` is a read-only MCP server with its own `node_modules` (Node ABI, not Electron's).

## State

- Capture-library project on branch `claude/sharp-planck-gkoaw5`. Mike wants to stop and test after each phase.
- Phases 1–2 pushed and confirmed on Mike's Mac (phase 2 on 2026-11-25: import, re-run, pilot descriptions, app and Claude Code all fine). Phase 2: schema v3, File › Import Instagram Saves… / Import Pilot Descriptions…, MCP returns every frame; `cd mcp && npm test` 27/27. Details: `docs/phase-2-instagram-import-plan.md` "As built". Collections import as tags; Mike picks which. Pilot passed (17/20); never commit saves-pilot or run its fetch_frames.py.
- In-app search ranks by field and shows best matches first while a query is active. The Ask bar offers "Filter by tag" when the typed words name a tag.
- Decided: the cloud inbox is a Cloudflare Worker + D1 + R2 (Mike has an account), with images kept after sync. It uses two tokens: the phone's can only create items; the desktop's can read and mark synced. Screenshot + link: a merge window plus a paste-link button.
- Vision model: Haiku 5.5, unless a 20-image side-by-side against Sonnet 5.5 shows it falls short. Mike adds a new API key in Settings.
- Phase 3 rebuilt the table (schema v4) so URL is optional; phone items are tracked in `inbox_applied`. `worker/` is the Cloudflare inbox plus the phone web app; its tooling needs npm 11 to install from scratch (npm 10 crashes resolving vitest's peers); `npm ci` with the lockfile is fine.

## What is next

- Phase 3 is built and pushed; Mike tests it next (steps: `docs/phase-3-phone-inbox-plan.md` "Mike's test"). Fix what it turns up before moving on. Tests: `cd mcp && npm test` 48, `cd worker && npm test` 15. Open risk: the 2-minute merge window joins unrelated link-only and image-only shares.
- Then the design overhaul (Mike, 2026-11-25), which includes the drawer frame strip and designing cards/drawer for image-only saves.
- Then phase 4 (vision pass, pilot schema; flag medium-confidence labels, where all 3 pilot misses were).
