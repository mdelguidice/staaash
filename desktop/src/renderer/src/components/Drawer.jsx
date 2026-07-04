import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { XIcon, HeartIcon, DotsIcon, PlusIcon, CheckIcon, ChevronIcon } from './Icons.jsx'
import { timeAgo, hashColor, imageSrc } from '../lib/format.js'
import Favicon from './Favicon.jsx'

const CLOSE_MS = 320 // matches --dur-sheet-out (+ a hair of slack)

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
  const [phase, setPhase] = useState('enter') // enter → open → closing
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(b.note || '')
  const [picker, setPicker] = useState(null) // null | 'tags' | 'collection'
  const [tagPopUp, setTagPopUp] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [heartAnim, setHeartAnim] = useState('')
  const menuRef = useRef(null)
  const tagAnchorRef = useRef(null)
  const collectionAnchorRef = useRef(null)
  const closeTimer = useRef(null)

  // Rise in on mount: two frames so the initial transform actually paints first
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase((p) => (p === 'enter' ? 'open' : p)))
    })
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(closeTimer.current)
    }
  }, [])

  const close = useCallback(() => {
    setPhase((p) => {
      if (p === 'closing') return p
      closeTimer.current = setTimeout(onClose, CLOSE_MS)
      return 'closing'
    })
  }, [onClose])

  // The sheet owns Escape so dismissal is animated (App defers while open)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (menuOpen) return setMenuOpen(false)
      if (picker) return setPicker(null)
      if (editingNote) return // the textarea's own Esc handler runs
      close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, menuOpen, picker, editingNote])

  useEffect(() => {
    setNoteDraft(b.note || '')
    setEditingNote(false)
    setMenuOpen(false)
    setPicker(null)
  }, [b.id])

  // overflow menu + pickers close on outside click
  useEffect(() => {
    if (!menuOpen && !picker) return
    const onDown = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (picker === 'tags' && tagAnchorRef.current && !tagAnchorRef.current.contains(e.target)) {
        setPicker(null)
      }
      if (
        picker === 'collection' &&
        collectionAnchorRef.current &&
        !collectionAnchorRef.current.contains(e.target)
      ) {
        setPicker(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen, picker])

  const src = imageSrc(b)
  const bookmarkTags = (b.tags || []).map((id) => tags.find((t) => t.id === id)).filter(Boolean)
  const stateClass = phase === 'open' ? ' is-open' : phase === 'closing' ? ' is-closing' : ''
  const currentCollection = b.collection_id
    ? collections.find((c) => c.id === b.collection_id)
    : null

  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((t) => t.name.toLowerCase().includes(q))
  }, [tags, tagQuery])
  const exactTagMatch = tags.some((t) => t.name.toLowerCase() === tagQuery.trim().toLowerCase())

  const saveNote = () => {
    onPatch(b.id, { note: noteDraft.trim() || null })
    setEditingNote(false)
  }

  const toggleTag = (tagId) => {
    const has = b.tags.includes(tagId)
    onPatch(b.id, { tags: has ? b.tags.filter((id) => id !== tagId) : [...b.tags, tagId] })
  }

  const createAndAddTag = async () => {
    const name = tagQuery.trim()
    if (!name) return
    const tag = await onCreateTag(name)
    if (!b.tags.includes(tag.id)) onPatch(b.id, { tags: [...b.tags, tag.id] })
    setTagQuery('')
  }

  return (
    <>
      <div className={`drawer-scrim${stateClass}`} onClick={close} />
      <aside className={`drawer${stateClass}`} role="dialog" aria-label={b.title || 'Bookmark details'}>
        <div className="drawer-head">
          <span className="drawer-head-domain">
            <Favicon bookmark={b} />
            <span>{b.domain || b.url}</span>
          </span>
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
            <button className="icon-btn" onClick={close} aria-label="Close details">
              <XIcon size={16} />
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

        <div className="drawer-scroll">
          <div className="drawer-cols">
            {src && (
              <div className="drawer-preview">
                <img src={src} alt="" />
              </div>
            )}

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
                        e.stopPropagation()
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
                      onClick={() => toggleTag(t.id)}
                    >
                      <XIcon size={9} />
                    </button>
                  </span>
                ))}
                <span className="popover-anchor" ref={tagAnchorRef}>
                  <button
                    className="chip-add"
                    aria-label="Add tag"
                    aria-expanded={picker === 'tags'}
                    onClick={(e) => {
                      setTagQuery('')
                      // flip upward when the list would run past the viewport
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTagPopUp(rect.bottom + 300 > window.innerHeight)
                      setPicker(picker === 'tags' ? null : 'tags')
                    }}
                  >
                    <PlusIcon size={12} />
                  </button>
                  {picker === 'tags' && (
                    <div
                      className={`popover${tagPopUp ? ' popover-up' : ''}`}
                      role="listbox"
                      aria-label="Tags"
                    >
                      <input
                        autoFocus
                        className="popover-search"
                        value={tagQuery}
                        placeholder="Search or create…"
                        spellCheck={false}
                        aria-label="Search or create a tag"
                        onChange={(e) => setTagQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const first = filteredTags[0]
                            if (tagQuery.trim() && !exactTagMatch) createAndAddTag()
                            else if (first) toggleTag(first.id)
                          }
                        }}
                      />
                      <div className="popover-list">
                        {filteredTags.map((t) => {
                          const applied = b.tags.includes(t.id)
                          return (
                            <button
                              key={t.id}
                              className="popover-item"
                              role="option"
                              aria-selected={applied}
                              onClick={() => toggleTag(t.id)}
                            >
                              <span className="popover-dot" style={{ background: hashColor(t.id) }} />
                              <span className="popover-name">{t.name}</span>
                              {applied && <CheckIcon className="popover-check" size={13} />}
                            </button>
                          )
                        })}
                        {filteredTags.length === 0 && !tagQuery.trim() && (
                          <div className="popover-empty">No tags yet — type to create one.</div>
                        )}
                        {tagQuery.trim() && !exactTagMatch && (
                          <button className="popover-item popover-create" onClick={createAndAddTag}>
                            <PlusIcon size={13} />
                            <span className="popover-name">Create “{tagQuery.trim()}”</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </span>
              </div>
            </div>

            <div>
              <div className="drawer-sec-label">
                <span>Collection</span>
              </div>
              <div className="popover-anchor" ref={collectionAnchorRef}>
                <button
                  className="select-btn"
                  aria-label="Collection"
                  aria-expanded={picker === 'collection'}
                  onClick={() => setPicker(picker === 'collection' ? null : 'collection')}
                >
                  {currentCollection && (
                    <span
                      className="popover-dot"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flex: 'none',
                        background: currentCollection.color || hashColor(currentCollection.id)
                      }}
                    />
                  )}
                  <span className="select-value">
                    {currentCollection ? currentCollection.name : 'No collection'}
                  </span>
                  <ChevronIcon className="select-chevron" size={13} dir="down" />
                </button>
                {picker === 'collection' && (
                  <div className="popover popover-up" role="listbox" aria-label="Collections">
                    <div className="popover-list">
                      <button
                        className="popover-item"
                        role="option"
                        aria-selected={!b.collection_id}
                        onClick={() => {
                          onPatch(b.id, { collection_id: null })
                          setPicker(null)
                        }}
                      >
                        <span className="popover-name">No collection</span>
                        {!b.collection_id && <CheckIcon className="popover-check" size={13} />}
                      </button>
                      {collections.map((c) => (
                        <button
                          key={c.id}
                          className="popover-item"
                          role="option"
                          aria-selected={b.collection_id === c.id}
                          onClick={() => {
                            onPatch(b.id, { collection_id: c.id })
                            setPicker(null)
                          }}
                        >
                          <span
                            className="popover-dot"
                            style={{ background: c.color || hashColor(c.id) }}
                          />
                          <span className="popover-name">{c.name}</span>
                          {b.collection_id === c.id && (
                            <CheckIcon className="popover-check" size={13} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="drawer-kv">
              <span>Saved {timeAgo(b.created_at)}</span>
              {b.read_at && <span>Read {timeAgo(b.read_at)}</span>}
              {b.archived_at && <span>Archived {timeAgo(b.archived_at)}</span>}
              {b.source && <span>via {b.source}</span>}
            </div>

            <button className="drawer-open-btn" onClick={() => onOpen(b)}>
              Open
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
