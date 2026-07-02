import { useState, useEffect, useRef } from 'react'
import {
  XIcon,
  HeartIcon,
  DotsIcon,
  PlusIcon,
  CheckIcon
} from './Icons.jsx'
import { timeAgo, hashColor, imageSrc } from '../lib/format.js'

export default function Drawer({
  bookmark: b,
  tags,
  collections,
  onClose,
  onPatch,
  onOpen,
  onFavorite,
  onArchive,
  onTrash,
  onRestore,
  onCreateTag
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(b.note || '')
  const [addingTag, setAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [heartAnim, setHeartAnim] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    setNoteDraft(b.note || '')
    setEditingNote(false)
    setMenuOpen(false)
  }, [b.id])

  // three-dot menu closes on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const src = imageSrc(b)
  const bookmarkTags = (b.tags || []).map((id) => tags.find((t) => t.id === id)).filter(Boolean)

  const saveNote = () => {
    onPatch(b.id, { note: noteDraft.trim() || null })
    setEditingNote(false)
  }

  const addTag = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    const tag = existing || (await onCreateTag(trimmed))
    if (!b.tags.includes(tag.id)) onPatch(b.id, { tags: [...b.tags, tag.id] })
    setTagInput('')
    setAddingTag(false)
  }

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={b.title || 'Bookmark details'}>
        <div className="drawer-head">
          <button className="icon-btn" onClick={onClose} aria-label="Close details">
            <XIcon size={16} />
          </button>
          <div className="drawer-head-actions" ref={menuRef}>
            <button
              className={`icon-btn${b.favorited ? ' is-on' : ''} ${heartAnim}`}
              aria-label={b.favorited ? 'Unfavorite' : 'Favorite'}
              aria-pressed={!!b.favorited}
              onClick={() => {
                setHeartAnim(b.favorited ? 'just-unfav' : 'just-fav')
                onFavorite(b)
              }}
              onAnimationEnd={() => setHeartAnim('')}
            >
              <HeartIcon size={16} filled={b.favorited} />
            </button>
            <button
              className="icon-btn"
              aria-label="More actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <DotsIcon size={16} />
            </button>
            {menuOpen && (
              <div className="drawer-menu" role="menu">
                {!b.deleted_at && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onArchive(b)
                      setMenuOpen(false)
                    }}
                  >
                    {b.archived_at ? 'Unarchive' : 'Archive'}
                  </button>
                )}
                {b.deleted_at && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onRestore(b)
                      setMenuOpen(false)
                    }}
                  >
                    Restore
                  </button>
                )}
                <button
                  role="menuitem"
                  className="is-danger"
                  onClick={() => {
                    onTrash(b)
                    setMenuOpen(false)
                  }}
                >
                  {b.deleted_at ? 'Delete forever' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>

        {src && (
          <div className="drawer-preview">
            <img src={src} alt="" />
          </div>
        )}

        <div className="drawer-body">
          <div>
            <h2 className="drawer-title">{b.title || b.url}</h2>
            <a
              className="drawer-url"
              href={b.url}
              onClick={(e) => {
                e.preventDefault()
                onOpen(b)
              }}
            >
              {b.url}
            </a>
            {b.is_dead ? <p className="drawer-dead">This link may be dead.</p> : null}
          </div>

          {b.summary && <p className="drawer-summary">{b.summary}</p>}

          <div>
            <div className="drawer-sec-label">
              <span>Note</span>
              {!editingNote && (
                <button className="mini-btn" onClick={() => setEditingNote(true)}>
                  {b.note ? 'Edit' : 'Add note'}
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="note-editor">
                <textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Why did you save this?"
                  aria-label="Note"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote()
                    if (e.key === 'Escape') {
                      setNoteDraft(b.note || '')
                      setEditingNote(false)
                    }
                  }}
                />
                <div className="note-actions">
                  <button
                    className="btn"
                    onClick={() => {
                      setNoteDraft(b.note || '')
                      setEditingNote(false)
                    }}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={saveNote}>
                    Save note
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`note-view${b.note ? '' : ' is-empty'}`}
                onClick={() => setEditingNote(true)}
              >
                {b.note || 'No note yet — click to add one.'}
              </div>
            )}
          </div>

          <div>
            <div className="drawer-sec-label">
              <span>Tags</span>
            </div>
            <div className="chip-row">
              {bookmarkTags.map((t) => (
                <span key={t.id} className="chip">
                  <span
                    className="pill-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: hashColor(t.id),
                      flex: 'none'
                    }}
                  />
                  <span>{t.name}</span>
                  <button
                    className="chip-x"
                    aria-label={`Remove tag ${t.name}`}
                    onClick={() =>
                      onPatch(b.id, { tags: b.tags.filter((id) => id !== t.id) })
                    }
                  >
                    <XIcon size={9} />
                  </button>
                </span>
              ))}
              {addingTag ? (
                <input
                  autoFocus
                  className="chip-input"
                  value={tagInput}
                  placeholder="Tag name…"
                  spellCheck={false}
                  aria-label="New tag name"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTag(tagInput)
                    if (e.key === 'Escape') {
                      setTagInput('')
                      setAddingTag(false)
                    }
                  }}
                  onBlur={() => {
                    setTagInput('')
                    setAddingTag(false)
                  }}
                />
              ) : (
                <button className="chip-add" aria-label="Add tag" onClick={() => setAddingTag(true)}>
                  <PlusIcon size={12} />
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="drawer-sec-label">
              <span>Collection</span>
            </div>
            <select
              className="select"
              value={b.collection_id || ''}
              aria-label="Collection"
              onChange={(e) => onPatch(b.id, { collection_id: e.target.value || null })}
            >
              <option value="">No collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="drawer-kv">
            <span>Saved {timeAgo(b.created_at)}</span>
            {b.read_at && <span>Read {timeAgo(b.read_at)}</span>}
            {b.archived_at && <span>Archived {timeAgo(b.archived_at)}</span>}
            {b.source && <span>via {b.source}</span>}
          </div>
        </div>

        <div className="drawer-foot">
          <button className="drawer-open-btn" onClick={() => onOpen(b)}>
            Open
          </button>
        </div>
      </aside>
    </>
  )
}
