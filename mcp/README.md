# staaash MCP server

Lets Claude Code search your staaash library. Local, stdio, **read-only**.

## Tools

| Tool | What it does |
|---|---|
| `search_saves` | Full-text search over title, note, tags, summary, page text, AI description and image text. Optional `tag`, `platform` (`instagram` / `web`), `include_archived`, `limit`. Matches on every word rank first, then partial matches. |
| `get_save` | One save in full, including the absolute path of its local preview image (open it with Read to see it). |
| `list_recent` | Newest saves first. Optional `days`, `platform`, `limit`. |

Never returned: trashed saves, and anything from the `settings` table (that's where the API key lives).

## Setup (macOS)

Needs Node 20 or newer.

```bash
cd ~/staaash/mcp
npm install
npm run build
claude mcp add staaash -s user -- node ~/staaash/mcp/dist/index.js
```

`-s user` makes it available in every project, not just this repo.

Reads `~/Library/Application Support/staaash/staaash.db` by default. Point it
somewhere else with `STAAASH_DB`:

```bash
claude mcp add staaash -s user -e STAAASH_DB=/path/to/staaash.db -- node ~/staaash/mcp/dist/index.js
```

## Notes

- **Own `node_modules`, on purpose.** The desktop app's `better-sqlite3` is
  compiled for Electron; this one is compiled for Node. Don't share them.
- **Schema.** Tags, summary and AI fields are searched once the app has run its
  v2 migration (launch the updated app once). Before that, the server still
  works but only searches title, domain, note and page text.
- **Tests** (`npm test`) build their databases with the app's own
  `desktop/src/main/schema.js`, so they test the schema the app actually writes.
