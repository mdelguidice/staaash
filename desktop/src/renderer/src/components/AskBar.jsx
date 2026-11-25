import { useState, useCallback, useEffect, useMemo } from 'react'
import { SearchIcon } from './Icons.jsx'
import Favicon from './Favicon.jsx'
import { saveTitle, saveSource } from '../lib/format.js'

const api = window.staaash

// Heuristic: a question routes to Claude, plain keystrokes just filter.
function looksLikeQuestion(q) {
  const s = q.trim().toLowerCase()
  return (
    s.endsWith('?') ||
    /^(what|who|when|where|why|how|which|did|do|does|is|are|can|should|find me|show me|tell me|summari[sz]e)\b/.test(
      s
    )
  )
}

// Tags worth offering as a filter for what's typed: exact name first, then names
// that start with it, then names containing it as a word. Needs 2+ characters so
// single keystrokes don't flash suggestions. Already-active tags are skipped.
// An exact name match is offered alone.
export function tagSuggestions(query, tags, activeTags = [], max = 2) {
  const q = query.trim().toLowerCase()
  if (q.length < 2 || looksLikeQuestion(q)) return []
  const scored = []
  for (const t of tags) {
    if (activeTags.includes(t.id)) continue
    const n = t.name.toLowerCase()
    const rank = n === q ? 0 : n.startsWith(q) ? 1 : n.split(/[\s\-_/]+/).some((w) => w.startsWith(q)) ? 2 : -1
    if (rank >= 0) scored.push({ t, rank })
  }
  scored.sort((a, b) => a.rank - b.rank || a.t.name.length - b.t.name.length)
  // An exact match is the answer; don't crowd the bar with near-misses.
  if (scored[0]?.rank === 0) return [scored[0].t]
  return scored.slice(0, max).map((s) => s.t)
}

export default function AskBar({
  inputRef,
  query,
  onQuery,
  resultCount,
  onPickSource,
  tags = [],
  activeTags = [],
  onPickTag
}) {
  const [ask, setAsk] = useState(null) // null | {status:'thinking'|'answer'|'error', ...}
  const suggestions = useMemo(() => tagSuggestions(query, tags, activeTags), [query, tags, activeTags])

  useEffect(() => {
    if (!query) setAsk(null)
  }, [query])

  const submit = useCallback(async () => {
    const q = query.trim()
    if (!q || !looksLikeQuestion(q)) return
    const hasKey = await api['ask:has-key']()
    if (!hasKey) {
      setAsk({
        status: 'error',
        message: 'Ask needs a Claude API key — add one in Settings (⌘,). Plain search still works.'
      })
      return
    }
    setAsk({ status: 'thinking' })
    const res = await api['ask:question'](q)
    if (res.ok) {
      setAsk({ status: 'answer', answer: res.answer, sources: res.sources })
    } else {
      setAsk({
        status: 'error',
        message:
          res.reason === 'no-key'
            ? 'Ask needs a Claude API key — add one in Settings (⌘,).'
            : `Couldn’t get an answer${res.message ? ` — ${res.message}` : ''}. Plain search still works.`
      })
    }
  }, [query])

  return (
    <>
      {ask && (
        <div className="ask-panel" role="region" aria-live="polite" aria-label="Ask Staaash answer">
          {ask.status === 'thinking' && (
            <div className="ask-thinking">
              <span className="ask-orb" />
              Reading your staaash…
            </div>
          )}
          {ask.status === 'error' && <div className="ask-answer">{ask.message}</div>}
          {ask.status === 'answer' && (
            <>
              <div className="ask-panel-label">Ask Staaash</div>
              <div className="ask-answer">{ask.answer}</div>
              {ask.sources?.length > 0 && (
                <div className="ask-sources">
                  {ask.sources.map((s) => (
                    <button key={s.id} className="ask-source" onClick={() => onPickSource(s)}>
                      <Favicon bookmark={s} />
                      <span className="ask-source-title">{saveTitle(s)}</span>
                      <span className="ask-source-domain">{saveSource(s)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="ask-blur" aria-hidden="true" />
      <div className="ask-wrap">
        <div className="ask">
          {/* passive label — deliberately not a button */}
          <span className="ask-chip">
            <SearchIcon size={10} />
            Ask Staaash
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              // Plain words that name a tag: Enter applies the tag filter.
              if (suggestions.length && onPickTag) onPickTag(suggestions[0].id)
              else submit()
            }}
            placeholder="Search or ask a question…"
            aria-label="Search or ask a question"
            spellCheck={false}
            autoComplete="off"
          />
          {suggestions.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className="ask-tag-suggest"
              onClick={() => onPickTag?.(t.id)}
              title={`Show only saves tagged “${t.name}”`}
            >
              <span className="ask-tag-suggest-label">Filter by tag</span>
              <span className="ask-tag-suggest-name">{t.name}</span>
              {i === 0 && <span className="ask-tag-suggest-key" aria-hidden="true">↵</span>}
            </button>
          ))}
          {query && (
            <span className="kbd" style={{ border: 'none' }}>
              {resultCount} match{resultCount === 1 ? '' : 'es'}
            </span>
          )}
          <span className="kbd">⌘ /</span>
        </div>
      </div>
    </>
  )
}
