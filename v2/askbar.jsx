// AskBar — unified AI search dock.
// One surface for finding and asking: results stream live as you type,
// and a one-tap "Synthesize" turns the same query into an AI answer
// grounded in those results. No mode switching.

const { useState: aUseState, useEffect: aUseEffect, useRef: aUseRef, useMemo: aUseMemo } = React;

function ab_isQuestion(q) {
  const s = q.trim().toLowerCase();
  return /^(what|who|when|where|why|how|which|did|do|does|is|are|can|should|tell|summari[sz]e|compare|find|show|list)\b/.test(s)
    || s.endsWith('?');
}

function ab_parseSlash(q) {
  const m = /^\/(tag|collection|unread|today|save|recent|random)\b\s*(.*)/i.exec(q.trim());
  if (!m) return null;
  return { cmd: m[1].toLowerCase(), arg: m[2].trim() };
}

function ab_synthesize(query, results) {
  if (!results.length) return null;
  const top = results.slice(0, 3);
  const tagPool = [...new Set(top.flatMap(b => b.tags))].slice(0, 4);
  const intro = `Across ${top.length} saves`;
  const middle = tagPool.length
    ? ` you've collected on ${tagPool.map(t => `**${t}**`).join(', ')}, the throughline is the same:`
    : `, here's what stands out:`;
  const beats = top.map(b => `“${b.title}” — ${b.site}`);
  return {
    intro: `${intro}${middle}`,
    beats,
    closer: `Open any to dive in, or refine: try "${tagPool[0] || 'craft'} from this month".`,
    sources: top,
  };
}

function AskBar({ items, onPickItem, onFilter, onAdd, onSetCollection, leftOffset = 264 }) {
  const [q, setQ] = aUseState('');
  const [focused, setFocused] = aUseState(false);
  const [recent, setRecent] = aUseState(() => {
    try { return JSON.parse(localStorage.getItem('stash_recent_q') || '[]'); } catch { return []; }
  });
  const [answering, setAnswering] = aUseState(false);
  const [answer, setAnswer] = aUseState(null);
  const inputRef = aUseRef(null);
  const wrapRef = aUseRef(null);

  const exitSearch = () => {
    setFocused(false);
    setQ('');
    setAnswer(null);
    onFilter(null);
    inputRef.current && inputRef.current.blur();
  };

  aUseEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === '/') { e.preventDefault(); inputRef.current && inputRef.current.focus(); }
      else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current && inputRef.current.focus();
      } else if (e.key === 'Escape' && focused) {
        e.preventDefault();
        e.stopPropagation();
        exitSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

  const search = aUseMemo(() => {
    if (!q.trim()) return null;
    return window.nlSearch(q, items);
  }, [q, items]);

  const slash = aUseMemo(() => ab_parseSlash(q), [q]);
  const isQ = aUseMemo(() => ab_isQuestion(q), [q]);

  // When query changes, drop any stale answer
  aUseEffect(() => { setAnswer(null); }, [q]);

  // Live filter on every keystroke (when no slash command)
  aUseEffect(() => {
    if (slash) return;
    if (search && search.results.length) onFilter(search.results.map(r => r.id));
    else if (!q.trim()) onFilter(null);
    else onFilter([]);
  }, [q, search, slash, onFilter]);

  const runAnswer = () => {
    if (!q.trim() || !search) return;
    setAnswering(true);
    setAnswer(null);
    setTimeout(() => {
      setAnswer(ab_synthesize(q, search.results));
      setAnswering(false);
      const next = [q, ...recent.filter(x => x !== q)].slice(0, 6);
      setRecent(next);
      try { localStorage.setItem('stash_recent_q', JSON.stringify(next)); } catch {}
    }, 1100);
  };

  const runSlash = () => {
    if (!slash) return;
    if (slash.cmd === 'tag' && slash.arg) onSetCollection(`tag:${slash.arg.replace(/^#/, '')}`);
    else if (slash.cmd === 'collection' && slash.arg) {
      const sc = window.SMART_COLLECTIONS.find(c => c.name.toLowerCase().includes(slash.arg.toLowerCase()));
      if (sc) onSetCollection(sc.id);
    }
    else if (slash.cmd === 'unread') onSetCollection('unread');
    else if (slash.cmd === 'today') onSetCollection('today');
    else if (slash.cmd === 'save') onAdd();
    else if (slash.cmd === 'random') {
      const r = items[Math.floor(Math.random() * items.length)];
      r && onPickItem(r);
    }
    setQ(''); setFocused(false);
  };

  const onEnter = () => {
    if (slash) return runSlash();
    if (isQ && search && search.results.length) return runAnswer();
    if (search && search.results.length) onPickItem(search.results[0]);
  };

  const suggestions = aUseMemo(() => [
    { label: 'Saved this month', q: 'this month', icon: '◐' },
    { label: 'Typography pieces', q: 'typography', icon: '◇' },
    { label: 'Motion & interaction', q: 'motion interaction', icon: '⌇' },
    { label: 'Long-reads I haven\'t opened', q: 'long unread', icon: '◌' },
    { label: 'Anything about color', q: 'color', icon: '●' },
  ], []);

  const showOverlay = focused;
  const resultCount = search ? search.results.length : 0;

  return (
    <div ref={wrapRef}
      className={`ab-wrap ${showOverlay ? 'is-open' : ''}`}
      style={{ '--ab-left-offset': leftOffset + 'px' }}>
      {showOverlay && <div className="ab-scrim" onClick={exitSearch} />}

      <div className={`ab ${showOverlay ? 'is-open' : ''} ${slash ? 'is-slash' : ''}`}>
        {showOverlay && (
          <div className="ab-panel">
            <div className="ab-body">
              {/* Empty state — suggestions, recent, slash hints */}
              {!q && (
                <React.Fragment>
                  <div className="ab-section-label">Try asking</div>
                  <div className="ab-chips">
                    {suggestions.map(s => (
                      <button key={s.q} className="ab-chip" onClick={() => setQ(s.q)}>
                        <span className="ab-chip-ico">{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                  {recent.length > 0 && (
                    <React.Fragment>
                      <div className="ab-section-label">Recent</div>
                      <div className="ab-recent">
                        {recent.map(r => (
                          <button key={r} className="ab-recent-row" onClick={() => setQ(r)}>
                            <span className="ab-recent-ico">↺</span>
                            <span className="ab-recent-q">{r}</span>
                          </button>
                        ))}
                      </div>
                    </React.Fragment>
                  )}
                  <div className="ab-section-label">Shortcuts</div>
                  <div className="ab-slash-grid">
                    <div><code>/tag motion</code> filter to a tag</div>
                    <div><code>/collection craft</code> jump to a collection</div>
                    <div><code>/unread</code> only unread</div>
                    <div><code>/save</code> open the save modal</div>
                    <div><code>/random</code> surprise me</div>
                  </div>
                </React.Fragment>
              )}

              {/* Slash mode */}
              {q && slash && (
                <div className="ab-slash">
                  <div className="ab-slash-h">
                    <span className="ab-slash-ico">⏎</span>
                    Run <code>/{slash.cmd}{slash.arg ? ' ' + slash.arg : ''}</code>
                  </div>
                  <div className="ab-slash-hint">Press Enter</div>
                </div>
              )}

              {/* Active query — single unified surface */}
              {q && !slash && search && (
                <React.Fragment>
                  {/* Interpretation bar */}
                  <div className="ab-interp">
                    <span className="ab-orb" />
                    <span>{search.interpretation}</span>
                    <span className="ab-interp-count">{resultCount} match{resultCount === 1 ? '' : 'es'}</span>
                  </div>

                  {/* AI synthesis section — promoted at top when relevant */}
                  {(answering || answer) && (
                    <div className="ab-ai-block">
                      {answering && (
                        <div className="ab-thinking">
                          <span className="ab-think-orb" />
                          <span>Reading your top {Math.min(resultCount, 6)} saves…</span>
                        </div>
                      )}
                      {answer && (
                        <div className="ab-answer-card">
                          <div className="ab-ai-head">
                            <span className="ab-ai-glyph">✦</span>
                            <span className="ab-ai-label">AI synthesis</span>
                            <span className="ab-ai-note">grounded in {answer.sources.length} of your saves</span>
                          </div>
                          <p className="ab-ans-intro" dangerouslySetInnerHTML={{__html:
                            answer.intro.replace(/\*\*(.+?)\*\*/g, '<em>$1</em>')
                          }} />
                          <ul className="ab-ans-beats">
                            {answer.beats.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                          <p className="ab-ans-closer">{answer.closer}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Synthesize CTA — appears once we have results, before answer is generated */}
                  {!answering && !answer && resultCount > 0 && (
                    <button className="ab-synth-cta" onClick={runAnswer}>
                      <span className="ab-spark">✦</span>
                      <span className="ab-synth-l">
                        <span className="ab-synth-h">{isQ ? 'Answer with AI' : 'Synthesize across these saves'}</span>
                        <span className="ab-synth-s">Reads the top results and writes a grounded summary.</span>
                      </span>
                      <span className="ab-kbd">↵</span>
                    </button>
                  )}

                  {/* Results — always shown, labelled as sources when answer exists */}
                  <div className="ab-section-label">
                    {answer ? 'Sources' : 'Results'}
                  </div>
                  <div className="ab-results">
                    {search.results.slice(0, answer ? 4 : 7).map(b => (
                      <button key={b.id} className="ab-row" onClick={() => onPickItem(b)}>
                        <span className="ab-fav" style={{background: b.accent}}>{b.favIcon}</span>
                        <div className="ab-meta">
                          <div className="ab-title">{b.title}</div>
                          <div className="ab-sub">
                            <span>{b.site}</span><span className="ab-dot" />
                            <span>{b.collection}</span><span className="ab-dot" />
                            <span>{b.saved}</span>
                          </div>
                        </div>
                        <div className="ab-tags">
                          {b.tags.slice(0,2).map(t => <span key={t}>#{t}</span>)}
                        </div>
                      </button>
                    ))}
                    {resultCount === 0 && (
                      <div className="ab-empty">
                        Nothing matches in your stash. Try a tag (#color), rephrase,
                        {' '}or <button className="ab-link-btn" onClick={runAnswer}>ask anyway</button>.
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        )}

        {/* Always-visible bar */}
        <div className="ab-bar">
          {showOverlay ? (
            <button className="ab-bar-back" onClick={exitSearch} title="Close search (Esc)">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <span className="ab-bar-pill" title="AI-powered search">
              <span className="ab-bar-pill-spark">✦</span>
              <span className="ab-bar-pill-label">AI</span>
            </span>
          )}
          <input
            ref={inputRef}
            className="ab-input"
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={focused
              ? 'Search or ask anything — your stash answers'
              : 'Search or ask your stash with AI'}
            onKeyDown={e => { if (e.key === 'Enter') onEnter(); }}
          />
          {q && (
            <button className="ab-x" onClick={() => { setQ(''); setAnswer(null); inputRef.current?.focus(); }}>×</button>
          )}
          <div className="ab-bar-keys">
            {!focused && <span className="ab-kbd">⌘ /</span>}
            {focused && q && !slash && resultCount > 0 && !answer && (
              <button className="ab-bar-go" onClick={runAnswer}>
                <span className="ab-spark">✦</span> {isQ ? 'Ask' : 'Synthesize'} <span className="ab-kbd">↵</span>
              </button>
            )}
            {focused && !q && (
              <span className="ab-bar-hint">try "what did I save about typography?"</span>
            )}
            {focused && slash && (
              <span className="ab-bar-hint">↵ run command</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.AskBar = AskBar;
