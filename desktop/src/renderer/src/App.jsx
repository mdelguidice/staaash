import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Gallery from './components/Gallery.jsx'
import ListView from './components/ListView.jsx'
import Drawer from './components/Drawer.jsx'
import AskBar from './components/AskBar.jsx'
import BulkBar from './components/BulkBar.jsx'
import { CaptureModal, SettingsModal, ShortcutsOverlay } from './components/Overlays.jsx'
import EmptyState from './components/EmptyState.jsx'

const api = window.staaash

const LIBRARY_VIEWS = {
  everything: { title: 'Everything' },
  unread: { title: 'Unread' },
  favorite: { title: 'Favorite' },
  archived: { title: 'Archived' },
  trash: { title: 'Trash' }
}

function inView(b, view) {
  switch (view.type === 'collection' ? 'collection' : view.key) {
    case 'everything':
      return !b.deleted_at && !b.archived_at
    case 'unread':
      return !b.deleted_at && !b.archived_at && !b.read_at
    case 'favorite':
      return !b.deleted_at && !b.archived_at && b.favorited
    case 'archived':
      return !!b.archived_at && !b.deleted_at
    case 'trash':
      return !!b.deleted_at
    case 'collection':
      return !b.deleted_at && !b.archived_at && b.collection_id === view.id
    default:
      return false
  }
}

export default function App() {
  const [bookmarks, setBookmarks] = useState([])
  const [tags, setTags] = useState([])
  const [collections, setCollections] = useState([])
  const [view, setView] = useState({ type: 'library', key: 'everything' })
  const [activeTags, setActiveTags] = useState([])
  const [layout, setLayout] = useState('gallery')
  const [query, setQuery] = useState('')
  const [searchIds, setSearchIds] = useState(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [selection, setSelection] = useState([])
  const [drawerId, setDrawerId] = useState(null)
  const [capture, setCapture] = useState(null) // {url} | null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [dropActive, setDropActive] = useState(false)
  const [toast, setToast] = useState(null)
  const askInputRef = useRef(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const reload = useCallback(async () => {
    const [b, t, c] = await Promise.all([
      api['bookmarks:list'](),
      api['tags:list'](),
      api['collections:list']()
    ])
    setBookmarks(b)
    setTags(t)
    setCollections(c)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Live updates from the main process (extension saves, metadata enrichment)
  useEffect(() => {
    const offs = [
      api.on('bookmarks:added', (item) => {
        setBookmarks((prev) => (prev.some((b) => b.id === item.id) ? prev : [item, ...prev]))
      }),
      api.on('bookmarks:updated', (item) => {
        if (!item) return
        setBookmarks((prev) => prev.map((b) => (b.id === item.id ? item : b)))
      }),
      api.on('bookmarks:changed', reload),
      api.on('collections:changed', () => api['collections:list']().then(setCollections)),
      api.on('ui:open-capture', ({ url }) => setCapture({ url: url || '' })),
      api.on('ui:open-settings', () => setSettingsOpen(true))
    ]
    return () => offs.forEach((off) => off())
  }, [reload])

  // Background dead-link sweep, once per session, off the critical path
  useEffect(() => {
    const t = setTimeout(() => api['health:sweep']().catch(() => {}), 8000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Instant local search via FTS in the main process
  useEffect(() => {
    let cancelled = false
    if (!query.trim()) {
      setSearchIds(null)
      return
    }
    api['bookmarks:search'](query).then((rows) => {
      if (!cancelled) setSearchIds(new Set(rows.map((r) => r.id)))
    })
    return () => {
      cancelled = true
    }
  }, [query])

  const items = useMemo(() => {
    let list = bookmarks.filter((b) => inView(b, view))
    if (activeTags.length) {
      list = list.filter((b) => activeTags.every((t) => (b.tags || []).includes(t)))
    }
    if (searchIds) list = list.filter((b) => searchIds.has(b.id))
    return list
  }, [bookmarks, view, activeTags, searchIds])

  useEffect(() => {
    setFocusedIndex((i) => (items.length ? Math.min(Math.max(i, -1), items.length - 1) : -1))
  }, [items.length])

  const counts = useMemo(() => {
    const c = { everything: 0, unread: 0, favorite: 0, archived: 0, trash: 0 }
    for (const b of bookmarks) {
      if (b.deleted_at) {
        c.trash++
        continue
      }
      if (b.archived_at) {
        c.archived++
        continue
      }
      c.everything++
      if (!b.read_at) c.unread++
      if (b.favorited) c.favorite++
    }
    return c
  }, [bookmarks])

  const savedCount = useMemo(() => bookmarks.filter((b) => !b.deleted_at).length, [bookmarks])

  const title =
    view.type === 'collection'
      ? collections.find((c) => c.id === view.id)?.name || 'Collection'
      : LIBRARY_VIEWS[view.key].title

  // ── Mutations ──
  const patch = useCallback(async (id, fields) => {
    const updated = await api['bookmarks:update'](id, fields)
    if (updated) setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)))
    return updated
  }, [])

  const openBookmark = useCallback(
    (b) => {
      api['system:open-external'](b.url)
      if (!b.read_at) patch(b.id, { read_at: new Date().toISOString() })
    },
    [patch]
  )

  const toggleFavorite = useCallback((b) => patch(b.id, { favorited: !b.favorited }), [patch])

  const archiveToggle = useCallback(
    (b) => patch(b.id, { archived_at: b.archived_at ? null : new Date().toISOString() }),
    [patch]
  )

  const trashBookmark = useCallback(
    async (b) => {
      if (b.deleted_at) {
        await api['bookmarks:delete-permanent'](b.id)
        setBookmarks((prev) => prev.filter((x) => x.id !== b.id))
        showToast('Deleted permanently')
      } else {
        await patch(b.id, { deleted_at: new Date().toISOString() })
        showToast('Moved to Trash')
      }
      if (drawerId === b.id) setDrawerId(null)
    },
    [patch, drawerId, showToast]
  )

  const restoreBookmark = useCallback((b) => patch(b.id, { deleted_at: null }), [patch])

  const addBookmark = useCallback(
    async (url, note) => {
      try {
        const item = await api['bookmarks:add']({ url, note })
        if (item.duplicate) {
          showToast('Already staaashed')
        } else {
          showToast('Saved — fetching preview…')
        }
        setCapture(null)
        return item
      } catch (err) {
        showToast(err.message || 'Could not save')
        return null
      }
    },
    [showToast]
  )

  const toggleSelect = useCallback((id) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const toggleTagFilter = useCallback((id) => {
    setActiveTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const pickView = useCallback((v) => {
    setView(v)
    setSelection([])
    setFocusedIndex(-1)
  }, [])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      const anyModal = capture || settingsOpen || shortcutsOpen

      if (e.key === 'Escape') {
        if (shortcutsOpen) return setShortcutsOpen(false)
        if (settingsOpen) return setSettingsOpen(false)
        if (capture) return setCapture(null)
        if (drawerId) return setDrawerId(null)
        if (selection.length) return setSelection([])
        if (query) {
          setQuery('')
          askInputRef.current?.blur()
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        askInputRef.current?.focus()
        return
      }
      if (typing || anyModal) return

      const focused = focusedIndex >= 0 ? items[focusedIndex] : null
      switch (e.key) {
        case '?':
          e.preventDefault()
          setShortcutsOpen(true)
          break
        case '/':
          e.preventDefault()
          askInputRef.current?.focus()
          break
        case 'j':
        case 'J':
          e.preventDefault()
          setFocusedIndex((i) => Math.min(i + 1, items.length - 1))
          break
        case 'k':
        case 'K':
          e.preventDefault()
          setFocusedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
        case 'o':
        case 'O':
          if (focused) {
            e.preventDefault()
            openBookmark(focused)
          }
          break
        case 's':
        case 'S':
          if (focused) toggleFavorite(focused)
          break
        case 'a':
        case 'A':
          if (focused) archiveToggle(focused)
          break
        case 'd':
        case 'D':
          if (focused) trashBookmark(focused)
          break
        case 'n':
        case 'N':
          e.preventDefault()
          setCapture({ url: '' })
          break
        case '1':
          setLayout('gallery')
          break
        case '2':
          setLayout('list')
          break
        case 'x':
        case 'X':
          if (focused) toggleSelect(focused.id)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    items,
    focusedIndex,
    drawerId,
    capture,
    settingsOpen,
    shortcutsOpen,
    selection.length,
    query,
    openBookmark,
    toggleFavorite,
    archiveToggle,
    trashBookmark,
    toggleSelect
  ])

  // Prefill capture from clipboard when opened via N / + New
  const openCapture = useCallback(async () => {
    const clip = await api['system:clipboard-url']().catch(() => null)
    setCapture({ url: clip || '' })
  }, [])

  // ── Drag & drop a URL onto the window ──
  useEffect(() => {
    let depth = 0
    const over = (e) => {
      e.preventDefault()
    }
    const enter = (e) => {
      e.preventDefault()
      depth++
      if ([...(e.dataTransfer?.types || [])].some((t) => t === 'text/uri-list' || t === 'text/plain')) {
        setDropActive(true)
      }
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDropActive(false)
    }
    const drop = (e) => {
      e.preventDefault()
      depth = 0
      setDropActive(false)
      const url =
        e.dataTransfer.getData('text/uri-list')?.split('\n')[0]?.trim() ||
        e.dataTransfer.getData('text/plain')?.trim()
      if (url && /^https?:\/\//i.test(url)) addBookmark(url)
    }
    window.addEventListener('dragover', over)
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [addBookmark])

  const drawerBookmark = drawerId ? bookmarks.find((b) => b.id === drawerId) : null

  return (
    <div className={`app${selection.length ? ' is-selecting' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        view={view}
        counts={counts}
        collections={collections}
        tags={tags}
        activeTags={activeTags}
        savedCount={savedCount}
        onPickView={pickView}
        onToggleTag={toggleTagFilter}
        onCreateCollection={async (name) => {
          await api['collections:create'](name)
          setCollections(await api['collections:list']())
        }}
        onCreateTag={async (name) => {
          await api['tags:create'](name)
          setTags(await api['tags:list']())
        }}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="main">
        <Topbar
          title={title}
          count={items.length}
          layout={layout}
          theme={theme}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          onLayout={setLayout}
          onNew={openCapture}
          onTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />

        <div className="content" role="region" aria-label={`${title} bookmarks`}>
          {items.length === 0 ? (
            <EmptyState view={view} query={query} onNew={openCapture} />
          ) : layout === 'gallery' ? (
            <Gallery
              items={items}
              collections={collections}
              tags={tags}
              focusedIndex={focusedIndex}
              selection={selection}
              onOpenDrawer={(b, i) => {
                setDrawerId(b.id)
                setFocusedIndex(i)
              }}
              onOpen={openBookmark}
              onFavorite={toggleFavorite}
              onSelect={toggleSelect}
            />
          ) : (
            <ListView
              items={items}
              tags={tags}
              focusedIndex={focusedIndex}
              onOpenDrawer={(b, i) => {
                setDrawerId(b.id)
                setFocusedIndex(i)
              }}
            />
          )}
        </div>

        <AskBar
          inputRef={askInputRef}
          query={query}
          onQuery={setQuery}
          resultCount={items.length}
          onPickSource={(b) => setDrawerId(b.id)}
        />

        {selection.length > 0 && (
          <BulkBar
            selection={selection}
            view={view}
            tags={tags}
            onClear={() => setSelection([])}
            onDone={async () => {
              setSelection([])
              await reload()
            }}
            showToast={showToast}
          />
        )}

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </main>

      {drawerBookmark && (
        <Drawer
          bookmark={drawerBookmark}
          tags={tags}
          collections={collections}
          onClose={() => setDrawerId(null)}
          onPatch={patch}
          onOpen={openBookmark}
          onFavorite={toggleFavorite}
          onArchive={archiveToggle}
          onTrash={trashBookmark}
          onRestore={restoreBookmark}
          onCreateTag={async (name) => {
            const t = await api['tags:create'](name)
            setTags(await api['tags:list']())
            return t
          }}
        />
      )}

      {capture && (
        <CaptureModal
          initialUrl={capture.url}
          onSave={addBookmark}
          onClose={() => setCapture(null)}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} showToast={showToast} />}
      {shortcutsOpen && <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}

      {dropActive && (
        <div className="drop-overlay">
          <div>Drop to staaash it</div>
        </div>
      )}
    </div>
  )
}
