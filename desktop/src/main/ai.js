// Ask Staaash — natural-language Q&A over the local library, plus
// AI collection suggestion on save. Both degrade gracefully to no-ops
// when no API key is configured (the bar falls back to plain search).
import Anthropic from '@anthropic-ai/sdk'
import * as db from './db.js'

const MODEL = 'claude-opus-4-8'

function getClient() {
  const apiKey = db.getSetting('anthropic_api_key')
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

// Compact library digest for grounding. Content is capped so a few hundred
// bookmarks stay well within budget.
function libraryDigest(bookmarks, { perItem = 400, maxItems = 300 } = {}) {
  return bookmarks
    .filter((b) => !b.deleted_at)
    .slice(0, maxItems)
    .map((b) => {
      const bits = [
        `id: ${b.id}`,
        `title: ${b.title || '(untitled)'}`,
        `domain: ${b.domain || ''}`,
        `saved: ${(b.created_at || '').slice(0, 10)}`
      ]
      if (b.note) bits.push(`note: ${String(b.note).slice(0, 200)}`)
      if (b.summary) bits.push(`summary: ${String(b.summary).slice(0, perItem)}`)
      return bits.join(' | ')
    })
    .join('\n')
}

export async function askStaaash(question) {
  const client = getClient()
  if (!client) return { ok: false, reason: 'no-key' }

  // Narrow with local FTS first; fall back to the whole library digest.
  const hits = db.searchBookmarks(question)
  const pool = hits.length >= 3 ? hits : db.listBookmarks()
  const digest = libraryDigest(pool)

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        'You are Ask Staaash, the search assistant inside staaash, a personal bookmarking app. ' +
        'Answer questions about the user\'s saved bookmarks using ONLY the library digest provided. ' +
        'Be brief and direct — a sentence or two, then the matches. ' +
        'When you reference specific bookmarks, list their ids on a final line formatted exactly as ' +
        'SOURCES: id1, id2, id3 (up to 6). If nothing in the library is relevant, say so plainly.',
      messages: [
        {
          role: 'user',
          content: `Library digest:\n${digest}\n\nQuestion: ${question}`
        }
      ]
    })

    if (response.stop_reason === 'refusal') return { ok: false, reason: 'refused' }

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const sourceMatch = text.match(/SOURCES:\s*(.+)\s*$/m)
    const sourceIds = sourceMatch
      ? sourceMatch[1].split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
      : []
    const answer = text.replace(/SOURCES:.*$/m, '').trim()
    const sources = sourceIds.map((id) => db.getBookmark(id)).filter(Boolean)

    return { ok: true, answer, sources }
  } catch (err) {
    return { ok: false, reason: 'error', message: err.message }
  }
}

// Suggest a collection for a freshly saved bookmark. Returns a collection id
// or null. Never creates collections on its own — it only picks among the
// user's existing shelves.
export async function suggestCollection(bookmark) {
  const client = getClient()
  if (!client) return null
  const collections = db.listCollections()
  if (!collections.length) return null

  const names = collections.map((c) => c.name).join(', ')
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 50,
    system:
      'You classify a bookmark into one of the user\'s collections. ' +
      'Reply with exactly one collection name from the list, or NONE if no collection clearly fits. ' +
      'No other text.',
    messages: [
      {
        role: 'user',
        content:
          `Collections: ${names}\n\nBookmark:\ntitle: ${bookmark.title || ''}\n` +
          `domain: ${bookmark.domain || ''}\nsummary: ${(bookmark.summary || '').slice(0, 400)}`
      }
    ]
  })

  if (response.stop_reason === 'refusal') return null
  const raw = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!raw || raw.toUpperCase() === 'NONE') return null
  const match = collections.find((c) => c.name.toLowerCase() === raw.toLowerCase())
  return match ? match.id : null
}
