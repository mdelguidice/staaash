// Overlays: SaveModal, DetailPane, CommandPalette, DirectionDoc, DailyResurfacer

const { useState: oUseState, useEffect: oUseEffect, useRef: oUseRef, useMemo: oUseMemo } = React;

// ─────────────────────────────────────────────────────────────
// SaveModal — paste a URL, watch AI suggest tags + collection
// ─────────────────────────────────────────────────────────────
function SaveModal({ open, onClose, onSave }) {
  const [url, setUrl] = oUseState('');
  const [title, setTitle] = oUseState('');
  const [stage, setStage] = oUseState('input'); // input → fetching → ready → saved
  const [tags, setTags] = oUseState([]);
  const [collection, setCollection] = oUseState('');
  const [accent, setAccent] = oUseState('#7AA2FF');
  const inputRef = oUseRef(null);

  oUseEffect(() => {
    if (open) {
      setUrl(''); setTitle(''); setStage('input'); setTags([]); setCollection('');
      setTimeout(() => inputRef.current && inputRef.current.focus(), 80);
    }
  }, [open]);

  // Simulate "fetching" + AI inference once a URL looks like one
  const triggerInfer = (u) => {
    setStage('fetching');
    setTimeout(() => {
      // fake title pulled from path
      const guess = (u.split('/').pop() || u).replace(/[-_]/g, ' ').replace(/\.[a-z]+$/i, '');
      const niceTitle = guess ? guess.replace(/\b\w/g, c => c.toUpperCase()) : 'Untitled page';
      setTitle(niceTitle);
      const t = window.suggestTagsFor(u + ' ' + niceTitle);
      setTags(t);
      // collection inference
      const tagStr = t.join(' ');
      const coll = /typography|font/.test(tagStr) ? 'Typography'
        : /motion|spring|animation/.test(tagStr) ? 'Motion'
        : /craft|interaction|hover/.test(tagStr) ? 'Craft & Detail'
        : /system|tokens|color/.test(tagStr) ? 'Systems'
        : /3d|inspir|gallery/.test(tagStr) ? 'Inspiration'
        : 'Reading List';
      setCollection(coll);
      // pick accent
      const palette = ['#7AA2FF','#E8C792','#79E6B6','#9D8DF0','#F0A672','#5BC0EB','#E879A8'];
      setAccent(palette[(u.length) % palette.length]);
      setStage('ready');
    }, 900);
  };

  const onUrlChange = (v) => {
    setUrl(v);
    if (/^https?:\/\/.+\..+/.test(v) && stage === 'input') triggerInfer(v);
  };

  const removeTag = (t) => setTags(tags.filter(x => x !== t));
  const addTag = (t) => { if (t && !tags.includes(t)) setTags([...tags, t]); };

  const submit = () => {
    if (!url || stage !== 'ready') return;
    setStage('saved');
    setTimeout(() => {
      onSave({
        id: 'b' + Math.random().toString(36).slice(2, 7),
        title: title || 'Untitled',
        site: (url.replace(/^https?:\/\//, '').split('/')[0] || 'unknown'),
        url,
        desc: 'Just saved — a description will appear here once it\'s read.',
        tags, collection,
        aspect: 1.2,
        color: '#0F1218', accent,
        type: 'article',
        saved: 'just now', readTime: '—',
        domain: (url.replace(/^https?:\/\//, '').split('/')[0] || 'unknown'),
        favIcon: (url.replace(/^https?:\/\//, '')[0] || '?').toUpperCase(),
      });
      onClose();
    }, 700);
  };

  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className={`save-modal stage-${stage}`} onClick={e => e.stopPropagation()}>
        <div className="sm-head">
          <div className="sm-h-title">Save bookmark</div>
          <button className="sm-x" onClick={onClose}>esc</button>
        </div>

        <div className="sm-row">
          <label className="sm-label">URL</label>
          <input
            ref={inputRef}
            className="sm-input sm-input-url"
            placeholder="paste a link, drop, or type…"
            value={url}
            onChange={e => onUrlChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { if (stage === 'ready') submit(); else if (url) triggerInfer(url); } }}
          />
        </div>

        {/* The "AI is thinking" panel — visible from fetching onward */}
        <div className={`sm-ai ${stage === 'input' ? 'is-empty' : ''}`}>
          <div className="sm-ai-h">
            <span className="sm-ai-orb" />
            <span className="sm-ai-label">
              {stage === 'input' && 'Auto-tag will fire as soon as you paste a link'}
              {stage === 'fetching' && 'Reading the page · extracting tags · matching collection'}
              {stage === 'ready' && 'Inferred — tweak anything before saving'}
              {stage === 'saved' && 'Saved to your stash'}
            </span>
          </div>

          {stage !== 'input' && (
            <React.Fragment>
              <div className="sm-row">
                <label className="sm-label">Title</label>
                <input className="sm-input" value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div className="sm-row">
                <label className="sm-label">Tags</label>
                <div className="sm-tags">
                  {tags.map(t => (
                    <span key={t} className="sm-tag" style={{ borderColor: accent + '55' }}>
                      <span style={{ color: accent }}>#</span>{t}
                      <button onClick={() => removeTag(t)}>×</button>
                    </span>
                  ))}
                  <input
                    className="sm-tag-input"
                    placeholder="add tag…"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addTag(e.target.value.trim()); e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              <div className="sm-row sm-row-h">
                <label className="sm-label">Collection</label>
                <select className="sm-select" value={collection} onChange={e => setCollection(e.target.value)}>
                  {['Reading List','Craft & Detail','Typography','Motion','Inspiration','Systems'].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </React.Fragment>
          )}
        </div>

        <div className="sm-foot">
          <div className="sm-foot-l">
            <span className="sm-kbd">⌘</span><span className="sm-kbd">↵</span>
            <span className="sm-foot-hint">to save</span>
          </div>
          <button className="sm-save" disabled={stage !== 'ready'} onClick={submit}
            style={{ background: stage === 'ready' ? accent : undefined,
                     color: stage === 'ready' ? '#0a0a0a' : undefined }}>
            {stage === 'saved' ? '✓ Saved' : 'Save to stash'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DetailPane — slide-out preview with related bookmarks
// ─────────────────────────────────────────────────────────────
function DetailPane({ bookmark, all, onClose, onOpen }) {
  if (!bookmark) return null;
  const related = oUseMemo(() => {
    if (!bookmark) return [];
    const overlap = (a, b) => a.tags.filter(t => b.tags.includes(t)).length;
    return all
      .filter(b => b.id !== bookmark.id)
      .map(b => ({ b, score: overlap(bookmark, b) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(x => x.b);
  }, [bookmark, all]);

  return (
    <React.Fragment>
      <div className="detail-scrim" onClick={onClose} />
      <aside className="detail" style={{ '--accent': bookmark.accent }}>
        <div className="detail-head">
          <button className="detail-x" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
          <div className="detail-actions">
            <button className="detail-ico" title="Open original">↗</button>
            <button className="detail-ico" title="Copy link">⌘C</button>
            <button className="detail-ico" title="Share">⤴</button>
            <button className="detail-ico detail-del" title="Delete">×</button>
          </div>
        </div>
        <div className="detail-thm">
          <Thumbnail b={bookmark} />
        </div>
        <div className="detail-body">
          <div className="detail-meta">
            <span className="detail-fav" style={{ background: bookmark.accent }}>{bookmark.favIcon}</span>
            <span>{bookmark.site}</span>
            <span className="detail-dot" />
            <span>{bookmark.saved}</span>
            {bookmark.readTime !== '—' && <React.Fragment><span className="detail-dot" /><span>{bookmark.readTime} read</span></React.Fragment>}
          </div>
          <h2 className="detail-title">{bookmark.title}</h2>
          <p className="detail-desc">{bookmark.desc}</p>

          <div className="detail-tags">
            {bookmark.tags.map(t => (
              <span key={t} className="detail-tag">#{t}</span>
            ))}
          </div>

          <div className="detail-section">
            <div className="detail-section-h">
              <span>AI summary</span>
              <span className="detail-ai-pill">drafted</span>
            </div>
            <p className="detail-summary">
              A focused read on {bookmark.tags[0] || 'design'} — covering practical patterns and a small set of opinionated rules.
              Worth a re-read when you're working on {bookmark.collection.toLowerCase()}.
            </p>
          </div>

          {related.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-h">
                <span>Related in your stash</span>
                <span className="detail-ai-pill">AI</span>
              </div>
              <div className="detail-related">
                {related.map(r => (
                  <button key={r.id} className="detail-rel" onClick={() => onOpen(r)}>
                    <div className="detail-rel-thm" style={{ background: r.color }}>
                      <span style={{ color: r.accent }}>{r.favIcon}</span>
                    </div>
                    <div className="detail-rel-meta">
                      <div className="detail-rel-title">{r.title}</div>
                      <div className="detail-rel-sub">{r.site} · {r.saved}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </React.Fragment>
  );
}

// ─────────────────────────────────────────────────────────────
// CommandPalette — natural-language search + quick actions
// ─────────────────────────────────────────────────────────────
function CommandPalette({ open, onClose, items, onPick }) {
  const [q, setQ] = oUseState('');
  const [sel, setSel] = oUseState(0);
  const inputRef = oUseRef(null);

  oUseEffect(() => {
    if (open) {
      setQ(''); setSel(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    }
  }, [open]);

  const search = oUseMemo(() => window.nlSearch(q, items), [q, items]);
  const list = search ? search.results : items.slice(0, 8);

  oUseEffect(() => { setSel(0); }, [q]);

  oUseEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(list.length - 1, s + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
      else if (e.key === 'Enter' && list[sel]) { e.preventDefault(); onPick(list[sel]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, list, sel, onPick]);

  if (!open) return null;
  return (
    <div className="palette-scrim" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input-wrap">
          <span className="palette-spark">✦</span>
          <input ref={inputRef}
            className="palette-input"
            placeholder="Search, or ask… try ‘that thing about typography I saved last month’"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <span className="palette-key">esc</span>
        </div>

        {q && search && (
          <div className="palette-interp">
            <span className="palette-interp-orb" />
            <span>{search.interpretation}</span>
            <span className="palette-interp-count">{list.length} match{list.length === 1 ? '' : 'es'}</span>
          </div>
        )}

        <div className="palette-list">
          {list.length === 0 && (
            <div className="palette-empty">No matches. Try another phrase.</div>
          )}
          {list.map((b, i) => (
            <button key={b.id}
              className={`palette-row ${i === sel ? 'is-sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => onPick(b)}>
              <span className="palette-fav" style={{ background: b.accent, color: '#0a0a0a' }}>{b.favIcon}</span>
              <div className="palette-meta">
                <div className="palette-title">{b.title}</div>
                <div className="palette-sub">
                  <span>{b.site}</span>
                  <span className="palette-dot" />
                  <span>{b.collection}</span>
                  <span className="palette-dot" />
                  <span>{b.saved}</span>
                </div>
              </div>
              <div className="palette-tags">
                {b.tags.slice(0, 2).map(t => <span key={t}>#{t}</span>)}
              </div>
              {i === sel && <span className="palette-enter">↵</span>}
            </button>
          ))}
        </div>

        <div className="palette-foot">
          <span><span className="sm-kbd">↑</span><span className="sm-kbd">↓</span> navigate</span>
          <span><span className="sm-kbd">↵</span> open</span>
          <span><span className="sm-kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DirectionDoc — collapsible design-direction document
// ─────────────────────────────────────────────────────────────
function DirectionDoc({ open, onToggle }) {
  return (
    <div className={`doc ${open ? 'is-open' : ''}`}>
      <button className="doc-tab" onClick={onToggle}>
        <span className="doc-tab-glyph">¶</span>
        <span>{open ? 'Hide direction doc' : 'Read the direction doc'}</span>
      </button>
      {open && (
        <div className="doc-body">
          <div className="doc-inner">
            <div className="doc-eyebrow">Design direction · for the maker</div>
            <h1 className="doc-h1">Stash — a bookmark app that earns the re-open.</h1>

            <p className="doc-lead">
              Honest gut take: a personal bookmark app lives or dies on one feeling — that
              opening it feels good, every single time. Not "useful." Good. Most local-first
              tools die because they treat the library as a list. This one should treat it as
              a curated room you walk through. The job is browsing-as-pleasure, with capture
              so frictionless it disappears.
            </p>

            <h2 className="doc-h2">What makes it sticky</h2>
            <ul className="doc-list">
              <li><b>Beauty as function.</b> The masonry is the product. High-contrast thumbnails on near-black, generous gaps, OG image + favicon + title overlay. It should look more like a gallery than a database.</li>
              <li><b>Trust the save.</b> ⌘N opens a single field. The AI begins inferring before you finish pasting. By the time your eyes reach the button, the work is done.</li>
              <li><b>Resurface, don't archive.</b> Saves you forgot are saves you wasted. A weekly “from your stash” strip, related-bookmarks pane, and natural-language search make old saves discoverable.</li>
              <li><b>Local is a feature, not a constraint.</b> Show "0 cloud calls" in the footer. People care.</li>
            </ul>

            <h2 className="doc-h2">Architecture</h2>
            <ul className="doc-list">
              <li><b>Sidebar</b> — collections (manual), smart collections (AI-inferred), tag cloud. Quiet, recedes.</li>
              <li><b>Gallery</b> — JS-driven masonry. Variable aspect, deterministic OG-style thumbnail generated from a per-bookmark accent. Cards have pointer-tilt + foot meta + tag chips.</li>
              <li><b>Detail pane</b> — slide-in from right. AI summary + related bookmarks via tag overlap.</li>
              <li><b>⌘K palette</b> — primary nav. Natural-language search with an interpretation line above results.</li>
              <li><b>⌘N save</b> — single URL field, AI streams in tags + collection + accent, you tweak, ⌘↵.</li>
            </ul>

            <h2 className="doc-h2">Motion principles</h2>
            <ul className="doc-list">
              <li>Spring, never linear. 280 stiffness / 28 damping is the base.</li>
              <li>Cards stagger in by 18ms per index, capped at 240ms. Feels alive without dragging.</li>
              <li>Hover is a 2.4° tilt, ~4px translate. Never enough to disturb the row, always enough to feel.</li>
              <li>The save modal has stages — input → fetching → ready → saved — with the AI label as the connective tissue.</li>
            </ul>

            <h2 className="doc-h2">AI moments (magical, not gimmicky)</h2>
            <ul className="doc-list">
              <li><b>Auto-tag on save</b> — fires the moment a URL parses. Tags are removable; you stay in control.</li>
              <li><b>Smart collections</b> — sidebar groupings that earn an "AI" pill. Move a bookmark, the collection updates.</li>
              <li><b>Natural-language search</b> — "that thing about typography I saved last month" returns ranked results with a one-line interpretation so the user trusts the match.</li>
              <li><b>Related bookmarks</b> — quiet, in the detail pane, computed from tag overlap. Never pushy.</li>
            </ul>

            <h2 className="doc-h2">First-bookmark moment</h2>
            <p>
              Empty state isn't a sad illustration — it's a single oversized prompt: "Paste a link.
              We'll do the rest." The moment a save lands, the empty state crossfades into the
              gallery and the new card pulses its accent once. That's the whole onboarding.
            </p>

            <h2 className="doc-h2">Build order</h2>
            <ol className="doc-list">
              <li>Masonry + thumbnail system + seed data (the soul of the product).</li>
              <li>⌘N save flow with simulated auto-tagging.</li>
              <li>⌘K palette + NL search.</li>
              <li>Detail pane + related.</li>
              <li>Empty state + first-save crossfade.</li>
              <li>Smart collections, daily resurface, settings.</li>
              <li>Polish: pointer tilt, spring distance, accent-based hover glow.</li>
            </ol>

            <p className="doc-sign">— Open the prototype. Try ⌘K, ⌘N, click any card.</p>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SaveModal, DetailPane, CommandPalette, DirectionDoc });
