#!/usr/bin/env node
// staaash MCP server — stdio. Read-only tools over the local staaash library.
//
//   claude mcp add staaash -s user -- node /absolute/path/to/staaash/mcp/dist/index.js
//
// STAAASH_DB overrides the database path (default: the app's data folder).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { Library, defaultDbPath } from './library.js'

// Opened lazily so a missing database becomes a readable tool error instead of
// a server that fails to start (which Claude Code reports far less clearly).
let lib: Library | null = null
function library(): Library {
  if (!lib) lib = new Library(defaultDbPath())
  return lib
}

function reply(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}

function guarded<A>(fn: (args: A) => unknown) {
  return async (args: A) => {
    try {
      return reply(fn(args))
    } catch (err) {
      return { isError: true, content: [{ type: 'text' as const, text: (err as Error).message }] }
    }
  }
}

const server = new McpServer({ name: 'staaash', version: '1.0.0' })

const platform = z
  .enum(['instagram', 'web'])
  .optional()
  .describe('Only saves from this platform.')

server.registerTool(
  'search_saves',
  {
    title: 'Search staaash saves',
    description:
      "Full-text search over the user's staaash library (their saved links, screenshots and Instagram saves). " +
      'Searches title, note ("why I saved this"), tags, summary, page text, and the AI description and ' +
      'image text where those exist. Pass the distinctive words, e.g. "onboarding" rather than a full sentence; ' +
      'prefix matching is automatic ("onboard" matches "onboarding"). Results that matched every word come ' +
      'first (match: "all terms"), then results that matched some. Use get_save for the full record.',
    inputSchema: {
      query: z.string().min(1).describe('Words to search for.'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10).'),
      tag: z.string().optional().describe('Only saves with this tag (exact name, case-insensitive).'),
      platform,
      include_archived: z.boolean().optional().describe('Include archived saves (default true).')
    }
  },
  guarded(({ query, limit, tag, platform, include_archived }) => {
    const results = library().search(query, { limit, tag, platform, includeArchived: include_archived })
    return { query, count: results.length, results }
  })
)

server.registerTool(
  'get_save',
  {
    title: 'Get one staaash save',
    description:
      'The full record for one save: url, note, tags, collection, summary, AI description and image text, ' +
      'page text (truncated), and the absolute local path of its preview image. Open image.path with the ' +
      'Read tool to look at the image itself.',
    inputSchema: {
      id: z.string().min(1).describe('The save id from search_saves or list_recent.'),
      max_content_chars: z
        .number()
        .int()
        .min(0)
        .max(50000)
        .optional()
        .describe('How much extracted page text to include (default 4000).')
    }
  },
  guarded(({ id, max_content_chars }) => library().get(id, max_content_chars ?? 4000))
)

server.registerTool(
  'list_recent',
  {
    title: 'List recent staaash saves',
    description: 'The most recently saved items, newest first.',
    inputSchema: {
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20).'),
      days: z.number().positive().optional().describe('Only saves from the last N days.'),
      platform,
      include_archived: z.boolean().optional().describe('Include archived saves (default true).')
    }
  },
  guarded(({ limit, days, platform, include_archived }) => {
    const results = library().recent({ limit, days, platform, includeArchived: include_archived })
    return { count: results.length, results }
  })
)

await server.connect(new StdioServerTransport())
