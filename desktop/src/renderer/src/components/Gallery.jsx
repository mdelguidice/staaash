import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import { HeartIcon, CheckIcon, ExtLinkIcon, NoteIcon } from './Icons.jsx'
import { timeAgo, hashColor, imageSrc, domainInitial, cardAspect, shouldContain } from '../lib/format.js'
import Favicon from './Favicon.jsx'

const GAP_X = 20
const GAP_Y = 12
const MIN_COL_W = 300
const MAX_COLS = 3
const META_H = 24 // 4px gap + 20px domain chip row

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

  const { placements, totalH, colW } = useMemo(() => {
    if (!width) return { placements: [], totalH: 0, colW: 0 }
    const cols = Math.max(1, Math.min(MAX_COLS, Math.floor((width + GAP_X) / (MIN_COL_W + GAP_X))))
    const colW = (width - GAP_X * (cols - 1)) / cols
    const heights = new Array(cols).fill(0)
    const placements = items.map((b, idx) => {
      const h = colW / cardAspect(b.id) + META_H
      const col = heights.indexOf(Math.min(...heights))
      const x = col * (colW + GAP_X)
      const y = heights[col]
      heights[col] = y + h + GAP_Y
      return { b, idx, x, y }
    })
    return { placements, totalH: Math.max(...heights, 0), colW }
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
  const [natural, setNatural] = useState(0)
  const [heartAnim, setHeartAnim] = useState('')
  const src = imageSrc(b)
  const contain = shouldContain(b.id, natural)

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
      <div className="card-media" style={{ aspectRatio: cardAspect(b.id) }}>
        {src && !imgFailed ? (
          <>
            {contain && (
              <img className="card-img-backdrop" src={src} alt="" aria-hidden="true" draggable={false} />
            )}
            <img
              className={`card-img${contain ? ' is-contain' : ''}`}
              src={src}
              alt=""
              loading="lazy"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget
                if (w && h) setNatural(w / h)
              }}
              onError={() => {
                setImgFailed(true)
                // If we only had a remote URL, ask main to cache it for next time
                if (!b.image_path && b.image_url) window.staaash['images:ensure'](b.id)
              }}
            />
          </>
        ) : (
          <div className="card-ph" aria-hidden="true">
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
