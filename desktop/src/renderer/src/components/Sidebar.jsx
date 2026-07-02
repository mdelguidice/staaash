import { useState } from 'react'
import {
  GridIcon,
  BookIcon,
  HeartIcon,
  ArchiveIcon,
  TrashIcon,
  PlusIcon,
  ChevronIcon,
  HelpIcon,
  SlidersIcon,
  DotsIcon
} from './Icons.jsx'
import { hashColor } from '../lib/format.js'

const LIBRARY = [
  { key: 'everything', name: 'Everything', Icon: GridIcon, countKey: 'everything' },
  { key: 'unread', name: 'Unread', Icon: BookIcon, countKey: 'unread' },
  { key: 'favorite', name: 'Favorite', Icon: HeartIcon, countKey: 'favorite' },
  { key: 'archived', name: 'Archived', Icon: ArchiveIcon, countKey: 'archived' },
  { key: 'trash', name: 'Trash', Icon: TrashIcon, countKey: 'trash' }
]

const COLLECTIONS_VISIBLE = 6

export default function Sidebar({
  collapsed,
  view,
  counts,
  collections,
  tags,
  activeTags,
  savedCount,
  onPickView,
  onToggleTag,
  onCreateCollection,
  onCreateTag,
  onOpenShortcuts,
  onOpenSettings
}) {
  const [tagsOpen, setTagsOpen] = useState(true)
  const [showAllCollections, setShowAllCollections] = useState(false)
  const [newCollection, setNewCollection] = useState(null)
  const [newTag, setNewTag] = useState(null)

  const visibleCollections = showAllCollections
    ? collections
    : collections.slice(0, COLLECTIONS_VISIBLE)
  const usedTags = tags.filter((t) => t.count > 0 || activeTags.includes(t.id))

  return (
    <aside className={`sb${collapsed ? ' is-collapsed' : ''}`} aria-label="Library sidebar">
      <div className="sb-drag" />
      <div className="sb-scroll">
        <div className="sb-label" style={{ paddingTop: 4 }}>
          <span>Library</span>
        </div>
        {LIBRARY.map(({ key, name, Icon, countKey }) => {
          const active = view.type === 'library' && view.key === key
          const count = counts[countKey]
          return (
            <button
              key={key}
              className={`sb-row${active ? ' is-active' : ''}`}
              onClick={() => onPickView({ type: 'library', key })}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="sb-ico" size={17} />
              <span className="sb-row-name">{name}</span>
              {key !== 'trash' || count > 0 ? <span className="sb-count">{count}</span> : null}
            </button>
          )
        })}

        <div className="sb-label">
          <span>Collections</span>
          <button aria-label="New collection" onClick={() => setNewCollection('')}>
            <PlusIcon size={13} />
          </button>
        </div>
        {visibleCollections.map((c) => {
          const active = view.type === 'collection' && view.id === c.id
          return (
            <button
              key={c.id}
              className={`sb-row${active ? ' is-active' : ''}`}
              onClick={() => onPickView({ type: 'collection', id: c.id })}
              aria-current={active ? 'page' : undefined}
            >
              <span className="sb-dot" style={{ background: c.color || hashColor(c.id) }} />
              <span className="sb-row-name">{c.name}</span>
              <span className="sb-count">{c.count}</span>
            </button>
          )
        })}
        {collections.length > COLLECTIONS_VISIBLE && !showAllCollections && (
          <button className="sb-row sb-more" onClick={() => setShowAllCollections(true)}>
            <DotsIcon className="sb-ico" size={17} />
            <span className="sb-row-name">More</span>
          </button>
        )}
        {newCollection !== null && (
          <div className="sb-newitem">
            <input
              autoFocus
              placeholder="Collection name…"
              value={newCollection}
              spellCheck={false}
              onChange={(e) => setNewCollection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCollection.trim()) {
                  onCreateCollection(newCollection.trim())
                  setNewCollection(null)
                } else if (e.key === 'Escape') {
                  setNewCollection(null)
                }
              }}
              onBlur={() => setNewCollection(null)}
              aria-label="New collection name"
            />
          </div>
        )}

        <div className="sb-label">
          <span>Tags</span>
          <span style={{ display: 'flex', gap: 2 }}>
            <button aria-label="New tag" onClick={() => setNewTag('')}>
              <PlusIcon size={13} />
            </button>
            <button
              aria-label={tagsOpen ? 'Collapse tags' : 'Expand tags'}
              onClick={() => setTagsOpen((v) => !v)}
            >
              <ChevronIcon size={13} dir={tagsOpen ? 'down' : 'right'} />
            </button>
          </span>
        </div>
        {newTag !== null && (
          <div className="sb-newitem">
            <input
              autoFocus
              placeholder="Tag name…"
              value={newTag}
              spellCheck={false}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  onCreateTag(newTag.trim())
                  setNewTag(null)
                } else if (e.key === 'Escape') {
                  setNewTag(null)
                }
              }}
              onBlur={() => setNewTag(null)}
              aria-label="New tag name"
            />
          </div>
        )}
        {tagsOpen && usedTags.length > 0 && (
          <div className="sb-tags">
            {usedTags.map((t) => {
              const active = activeTags.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={`sb-tag${active ? ' is-active' : ''}`}
                  onClick={() => onToggleTag(t.id)}
                  aria-pressed={active}
                  title={t.name}
                >
                  {!active && (
                    <span
                      className="sb-dot"
                      style={{ width: 6, height: 6, margin: 0, background: hashColor(t.id) }}
                    />
                  )}
                  <span>{t.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="sb-foot">
        <button className="sb-shortcuts" onClick={onOpenShortcuts}>
          <HelpIcon className="sb-ico" size={16} />
          <span className="sb-row-name">Shortcuts</span>
        </button>
        <div className="sb-status">
          <span className="sb-status-dot" aria-hidden="true" />
          <span className="sb-status-text">Stored locally · {savedCount} saved</span>
          <button aria-label="Open settings" onClick={onOpenSettings}>
            <SlidersIcon size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
