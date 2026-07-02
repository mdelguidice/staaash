// Visual primitives + thumbnail rendering for Stash.
// Loaded via Babel; exports to window for the main App script.

const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = React;

// ────────────────────────────────────────────────────────────
// Thumbnail — simulated OG image. We never load remote images
// (offline-first), so we draw a procedural OG card per bookmark
// using its accent color and a few subtle shapes.
// ────────────────────────────────────────────────────────────
function Thumbnail({ b, style }) {
  const seed = useMemo(() => b.id.charCodeAt(1) + b.id.charCodeAt(2), [b.id]);
  const blob = (seed % 4);
  const [imgOk, setImgOk] = useState(!!b.image);
  return (
    <div className="thm" style={{ background: b.color, ...style }}>
      {b.image && imgOk && (
        <img
          className="thm-img"
          src={b.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
        />
      )}
      <svg className="thm-art" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id={`g-${b.id}`} cx="30%" cy="20%" r="90%">
            <stop offset="0%" stopColor={b.accent} stopOpacity="0.55" />
            <stop offset="55%" stopColor={b.accent} stopOpacity="0.08" />
            <stop offset="100%" stopColor={b.color} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`l-${b.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={b.accent} stopOpacity="0.0" />
            <stop offset="100%" stopColor={b.accent} stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill={b.color} />
        <rect width="400" height="240" fill={`url(#g-${b.id})`} />
        {blob === 0 && (
          <g>
            <circle cx="320" cy="60" r="120" fill={b.accent} fillOpacity="0.10" />
            <circle cx="380" cy="200" r="60" fill={b.accent} fillOpacity="0.06" />
          </g>
        )}
        {blob === 1 && (
          <g>
            <rect x="-20" y="160" width="500" height="160" fill={`url(#l-${b.id})`} />
            <line x1="0" y1="200" x2="400" y2="200" stroke={b.accent} strokeOpacity="0.18" strokeWidth="0.5" />
            <line x1="0" y1="218" x2="400" y2="218" stroke={b.accent} strokeOpacity="0.10" strokeWidth="0.5" />
          </g>
        )}
        {blob === 2 && (
          <g>
            <path d="M0 180 Q 100 120, 200 160 T 400 140 L 400 240 L 0 240 Z" fill={b.accent} fillOpacity="0.12" />
            <path d="M0 200 Q 100 150, 200 180 T 400 170 L 400 240 L 0 240 Z" fill={b.accent} fillOpacity="0.06" />
          </g>
        )}
        {blob === 3 && (
          <g>
            <rect x="40" y="40" width="120" height="120" rx="8" fill={b.accent} fillOpacity="0.10" />
            <rect x="160" y="80" width="60" height="60" rx="6" fill={b.accent} fillOpacity="0.06" />
            <rect x="240" y="40" width="120" height="160" rx="8" fill={b.accent} fillOpacity="0.04" />
          </g>
        )}
        {/* subtle vignette */}
        <rect width="400" height="240" fill="url(#vignette)" />
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.35" />
          </radialGradient>
        </defs>
      </svg>
      {b.collection && <span className="thm-pill thm-pill-tr">{b.collection}</span>}
      <div className="thm-overlay">
        <div className="thm-meta">
          <span className="thm-fav" style={{ background: b.accent }}>{b.favIcon}</span>
          <span className="thm-site">{b.site}</span>
          {b.type === 'video' && <span className="thm-pill">▸ Video</span>}
          {b.type === 'tool' && <span className="thm-pill">◆ Tool</span>}
        </div>
        <div className="thm-title" style={{ '--accent': b.accent }}>{b.title}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Card — the masonry tile. Hover lifts, focus shows shadow.
// ────────────────────────────────────────────────────────────
function Card({ b, onOpen, onHover, dense }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  // pointer-tilt: subtle 3D following the cursor
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--tx', `${px * 4}px`);
    el.style.setProperty('--ty', `${py * 4}px`);
    el.style.setProperty('--rx', `${-py * 2.4}deg`);
    el.style.setProperty('--ry', `${px * 2.4}deg`);
  };
  const onLeave = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px');
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
    setHover(false);
  };
  return (
    <div
      ref={ref}
      className={`card ${hover ? 'is-hover' : ''}`}
      role="button"
      tabIndex="0"
      style={{ aspectRatio: b.aspect }}
      onMouseEnter={() => { setHover(true); onHover && onHover(b); }}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      onClick={() => onOpen(b)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(b); } }}
    >
      <Thumbnail b={b} />
      <div className="card-foot">
        <a
          className="card-foot-l"
          href={b.url || `https://${b.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Open ${b.domain} in a new tab`}
        >
          <span className="card-fav" style={{ background: b.accent }}>{b.favIcon}</span>
          <span className="card-domain">{b.domain}</span>
          <svg className="card-extlink" width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4 10 14M18 14v6H4V6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        <div className="card-foot-r">
          <span className="card-time">{b.saved}</span>
        </div>
      </div>
      {!dense && (
        <div className="card-tags">
          {b.tags.slice(0, 3).map(t => (
            <span className="tag-chip" key={t}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Masonry — JS-driven column distribution to keep heights tight.
// We measure the container's width, decide cols, and place each
// card into the shortest column. Re-runs on resize and content.
// ────────────────────────────────────────────────────────────
function Masonry({ items, render, gap = 18, minColW = 280, density = 'comfy' }) {
  const wrapRef = useRef(null);
  const [cols, setCols] = useState(3);
  const [colW, setColW] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current; if (!el) return;
    // Sync initial measurement before RO subscribes
    const initW = el.clientWidth;
    if (initW > 0) {
      const c = Math.max(1, Math.floor((initW + gap) / (minColW + gap)));
      setCols(c);
      setColW((initW - gap * (c - 1)) / c);
    }
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w <= 0) return; // ignore zero-width readings
      const c = Math.max(1, Math.floor((w + gap) / (minColW + gap)));
      setCols(c);
      setColW((w - gap * (c - 1)) / c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [gap, minColW]);

  // distribute by current heights
  const placements = useMemo(() => {
    if (!colW) return [];
    const heights = new Array(cols).fill(0);
    return items.map((it, idx) => {
      const h = colW / it.aspect + (density === 'comfy' ? 56 : density === 'compact' ? 30 : 44);
      const col = heights.indexOf(Math.min(...heights));
      const x = col * (colW + gap);
      const y = heights[col];
      heights[col] = y + h + gap;
      return { it, idx, x, y, w: colW, h };
    });
  }, [items, colW, cols, gap, density]);

  const totalH = placements.length ? Math.max(...placements.map(p => p.y + p.h)) : 0;

  return (
    <div ref={wrapRef} className="masonry" style={{ height: totalH }}>
      {placements.map(({ it, idx, x, y, w }) => (
        <div key={it.id}
          className="masonry-item"
          style={{
            transform: `translate3d(${x}px, ${y}px, 0)`,
            width: w,
            transitionDelay: `${Math.min(idx * 18, 240)}ms`,
          }}>
          {render(it, idx)}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sidebar — collections, smart filters, tags
// ────────────────────────────────────────────────────────────
function Sidebar({ active, onPick, onAdd, onPalette, savedCount, collapsed, onToggleCollapse }) {
  if (collapsed) {
    return (
      <aside className="sb sb-collapsed">
        <button className="sb-toggle" onClick={onToggleCollapse} title="Expand sidebar">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6 L15 12 L9 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="sb-mark sb-mark-mini">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M5 4 H19 V20 L12 16 L5 20 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
        <button className="sb-mini-btn" onClick={onToggleCollapse} title="Expand sidebar" style={{display:'none'}}></button>
        <div className="sb-mini-divider" />
        {window.COLLECTIONS.map(c => (
          <button key={c.id} className={`sb-mini-btn ${active === c.id ? 'is-active' : ''}`}
            onClick={() => onPick(c.id)} title={c.name}>
            <span>{c.icon}</span>
          </button>
        ))}
        <div className="sb-mini-divider" />
        {window.SMART_COLLECTIONS.map(c => (
          <button key={c.id} className={`sb-mini-btn ${active === c.id ? 'is-active' : ''}`}
            onClick={() => onPick(c.id)} title={c.name}>
            <span className="sb-mini-letter">{c.name[0]}</span>
          </button>
        ))}
      </aside>
    );
  }
  return (
    <aside className="sb">
      <button className="sb-toggle sb-toggle-collapse" onClick={onToggleCollapse} title="Collapse sidebar">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 6 L9 12 L15 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="sb-brand">
        <div className="sb-mark">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M5 4 H19 V20 L12 16 L5 20 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="sb-brand-name">Stash</div>
        <div className="sb-brand-sub">{savedCount} saved · local</div>
      </div>

      <div className="sb-section">
        <div className="sb-section-h">Library</div>
        {window.COLLECTIONS.map(c => (
          <button key={c.id}
            className={`sb-row ${active === c.id ? 'is-active' : ''}`}
            onClick={() => onPick(c.id)}>
            <span className="sb-row-icon">{c.icon}</span>
            <span className="sb-row-name">{c.name}</span>
            <span className="sb-row-count">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="sb-section">
        <div className="sb-section-h">
          <span>Collections</span>
          <span className="sb-ai-pill" title="Smart collections — generated from your saves">AI</span>
        </div>
        {window.SMART_COLLECTIONS.map(c => (
          <button key={c.id}
            className={`sb-row ${active === c.id ? 'is-active' : ''}`}
            onClick={() => onPick(c.id)}>
            <span className="sb-row-dot" />
            <span className="sb-row-name">{c.name}</span>
            <span className="sb-row-count">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="sb-section">
        <div className="sb-section-h">Tags</div>
        <div className="sb-tags">
          {window.TAG_INDEX.slice(0, 12).map(t => (
            <button key={t.name}
              className={`sb-tag ${active === `tag:${t.name}` ? 'is-active' : ''}`}
              onClick={() => onPick(`tag:${t.name}`)}>
              <span>{t.name}</span>
              <span className="sb-tag-count">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sb-foot">
        <div className="sb-foot-line">
          <span className="sb-foot-dot" />
          <span>Stored locally · 0 cloud calls</span>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { Thumbnail, Card, Masonry, Sidebar });
