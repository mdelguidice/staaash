import { useState, useCallback, useEffect } from 'react'
import { SearchIcon } from './Icons.jsx'
import { hashColor, domainInitial } from '../lib/format.js'

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

export default function AskBar({ inputRef, query, onQuery, resultCount, onPickSource }) {
  const [ask, setAsk] = useState(null) // null | {status:'thinking'|'answer'|'error', ...}

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
                      <span
                        className="card-fav"
                        style={{ background: hashColor(s.domain || s.id) }}
                      >
                        {domainInitial(s)}
                      </span>
                      <span className="ask-source-title">{s.title || s.url}</span>
                      <span className="ask-source-domain">{s.domain}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="ask-wrap">
        <div className="ask">
          {/* passive label — deliberately not a button */}
          <span className="ask-chip">
            <SearchIcon size={13} />
            Ask Staaash
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder="Search or ask a question…"
            aria-label="Search or ask a question"
            spellCheck={false}
            autoComplete="off"
          />
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
