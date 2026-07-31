import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import { HeartIcon, CheckIcon, ExtLinkIcon, NoteIcon } from './Icons.jsx'
import { timeAgo, hashColor, imageSrc, domainInitial, cardShape, focalPosition } from '../lib/format.js'
import { hasPlaceholder, placeholderStyle, resolveAdjacentHues } from '../lib/placeholder.js'
import Favicon from './Favicon.jsx'

const GAP_X = 20
const GAP_Y = 12
const MIN_COL_W = 300
const MAX_COLS = 3
// Vertical space each card reserves below its media, and therefore the card
// pitch the masonry accumulates. Figma's card is thumbnail + 4px gap + 24px
// meta row (5181:232 — Thumbnail 195, Container at y=199 h=24, card 223), so
// the reserved amount is 28, not 24. At 24 the grid ran short by 4px per card.
const META_H = 28 // 4px gap + 24px domain chip row

export default function Gallery({
  items,
  collections,
  tags,
  focusedIndex,
  selection,
  onOpenDrawer,
  onOpen,
  onFavorite,
  onSelect
}) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0) setWidth(el.clientWidth)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { placements, totalH, colW, phShifts } = useMemo(() => {
    if (!width) return { placements: [], totalH: 0, colW: 0, phShifts: new Map() }
    const cols = Math.max(1, Math.min(MAX_COLS, Math.floor((width + GAP_X) / (MIN_COL_W + GAP_X))))
    const colW = (width - GAP_X * (cols - 1)) / cols
    const heights = new Array(cols).fill(0)
    const placements = items.map((b, idx) => {
      const h = colW / cardShape(b) + META_H
      const col = heights.indexOf(Math.min(...heights))
      const x = col * (colW + GAP_X)
      const y = heights[col]
      heights[col] = y + h + GAP_Y
      return { b, idx, x, y, h }
    })
    // Two adjacent placeholders in the same colour family read as one smear, so
    // the later of a colliding pair is nudged. Runs on the masonry's own
    // placements, after layout, because adjacency is a fact about position.
    const phShifts = resolveAdjacentHues(placements, colW)
    return { placements, totalH: Math.max(...heights, 0), colW, phShifts }
  }, [items, width])

  // keep the focused card in view for J/K navigation
  const focusedId = focusedIndex >= 0 ? items[focusedIndex]?.id : null
  useEffect(() => {
    if (!focusedId) return
    document
      .querySelector(`[data-card-id="${CSS.escape(focusedId)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedId])

  return (
    <div ref={wrapRef} className="masonry" style={{ height: totalH }}>
      {placements.map(({ b, idx, x, y }) => (
        <div
          key={b.id}
          className="masonry-item"
          style={{ transform: `translate3d(${x}px, ${y}px, 0)`, width: colW }}
        >
          <Card
            bookmark={b}
            phShift={phShifts.get(b.id)}
            collections={collections}
            tags={tags}
            focused={idx === focusedIndex}
            selected={selection.includes(b.id)}
            onClick={() => onOpenDrawer(b, idx)}
            onOpen={onOpen}
            onFavorite={onFavorite}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  )
}

function Card({
  bookmark: b,
  phShift,
  collections,
  tags,
  focused,
  selected,
  onClick,
  onOpen,
  onFavorite,
  onSelect
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const [heartAnim, setHeartAnim] = useState('')
  const src = imageSrc(b)

  // Backfill the local cache for remote-only previews so the gallery works offline
  useEffect(() => {
    if (!b.image_path && b.image_url) window.staaash['images:ensure'](b.id)
  }, [b.id, b.image_path, b.image_url])
  const collection = b.collection_id ? collections.find((c) => c.id === b.collection_id) : null
  const cardTags = (b.tags || [])
    .map((id) => tags.find((t) => t.id === id))
    .filter(Boolean)
    .slice(0, 3)

  const heart = (e) => {
    e.stopPropagation()
    setHeartAnim(b.favorited ? 'just-unfav' : 'just-fav')
    onFavorite(b)
  }

  return (
    <article
      className={`card${focused ? ' is-focused' : ''}`}
      data-card-id={b.id}
      onClick={onClick}
      role="button"
      tabIndex={-1}
      aria-label={b.title || b.url}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}
    >
      <div className="card-media" style={{ aspectRatio: cardShape(b) }}>
        {src && !imgFailed ? (
          <img
            className="card-img"
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
            // Only set for a clamped card, and only ever on the vertical axis —
            // the columns are uniform width, so nothing overflows horizontally.
            style={{ objectPosition: focalPosition(b) }}
            onError={() => {
              setImgFailed(true)
              // If we only had a remote URL, ask main to cache it for next time
              if (!b.image_path && b.image_url) window.staaash['images:ensure'](b.id)
            }}
          />
        ) : (
          <div
            className={`card-ph${hasPlaceholder(b) ? ' is-gradient' : ''}`}
            aria-hidden="true"
            style={hasPlaceholder(b) ? placeholderStyle(b, phShift) : undefined}
          >
            <span>{domainInitial(b)}</span>
          </div>
        )}

        <div className="card-veil">
          <div className="card-veil-title">{b.title || b.url}</div>
          {(collection || cardTags.length > 0) && (
            <div className="card-veil-pills">
              {collection && (
                <span className="pill pill-collection">
                  <span
                    className="pill-dot"
                    style={{ background: collection.color || hashColor(collection.id) }}
                  />
                  {collection.name}
                </span>
              )}
              {cardTags.map((t) => (
                <span key={t.id} className="pill">
                  {t.name}
                </span>
              ))}
              {(b.tags || []).length > cardTags.length && (
                <span className="pill" style={{ flex: 'none' }}>
                  +{b.tags.length - cardTags.length}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          className={`card-check${selected ? ' is-on' : ''}`}
          aria-label={selected ? 'Deselect' : 'Select'}
          aria-pressed={selected}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(b.id)
          }}
        >
          <CheckIcon size={13} />
        </button>

        <button
          className={`card-heart${b.favorited ? ' is-on' : ''} ${heartAnim}`}
          aria-label={b.favorited ? 'Unfavorite' : 'Favorite'}
          aria-pressed={!!b.favorited}
          onClick={heart}
          onAnimationEnd={() => setHeartAnim('')}
        >
          <HeartIcon size={14} filled={b.favorited} />
        </button>
      </div>

      <div className="card-meta">
        <a
          href={b.url}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onOpen(b)
          }}
          title={`Open ${b.domain || b.url}`}
        >
          <Favicon bookmark={b} size={10} radius={3} />
          <span className="card-domain">{b.domain || b.url}</span>
          <ExtLinkIcon className="card-extlink" size={9} />
        </a>
        {b.note && <NoteIcon className="card-noteind" size={11} aria-label="Has note" />}
        {b.is_dead ? <span className="card-dead" title="Link may be dead" /> : null}
        <span className="card-time">{timeAgo(b.created_at)}</span>
      </div>
    </article>
  )
}
