import { useEffect } from 'react'
import { timeAgo, hashColor, domainInitial } from '../lib/format.js'
import { NoteIcon } from './Icons.jsx'

export default function ListView({ items, tags, focusedIndex, onOpenDrawer }) {
  const focusedId = focusedIndex >= 0 ? items[focusedIndex]?.id : null
  useEffect(() => {
    if (!focusedId) return
    document
      .querySelector(`[data-row-id="${CSS.escape(focusedId)}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [focusedId])

  return (
    <div className="list">
      {items.map((b, idx) => {
        const rowTags = (b.tags || [])
          .map((id) => tags.find((t) => t.id === id))
          .filter(Boolean)
          .slice(0, 3)
        return (
          <button
            key={b.id}
            data-row-id={b.id}
            className={`list-row${idx === focusedIndex ? ' is-focused' : ''}`}
            onClick={() => onOpenDrawer(b, idx)}
          >
            <span className="list-fav" style={{ background: hashColor(b.domain || b.id) }}>
              {domainInitial(b)}
            </span>
            <span className="list-main">
              <span className="list-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {b.title || b.url}
                {b.note && <NoteIcon size={12} style={{ flex: 'none', color: 'var(--muted-2)' }} />}
              </span>
              <span className="list-sub">{b.domain}</span>
            </span>
            <span className="list-tags">
              {rowTags.map((t) => (
                <span key={t.id} className="list-tag">
                  {t.name}
                </span>
              ))}
            </span>
            <span className="list-time">{timeAgo(b.created_at)}</span>
          </button>
        )
      })}
    </div>
  )
}
