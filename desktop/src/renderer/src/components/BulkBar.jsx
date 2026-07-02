import { useState } from 'react'
import { XIcon } from './Icons.jsx'

const api = window.staaash

export default function BulkBar({ selection, view, tags, onClear, onDone, showToast }) {
  const [tagPicker, setTagPicker] = useState(false)
  const inTrash = view.type === 'library' && view.key === 'trash'
  const inArchive = view.type === 'library' && view.key === 'archived'
  const n = selection.length

  const bulk = async (patch, msg) => {
    await api['bookmarks:bulk-update'](selection, patch)
    showToast(msg)
    onDone()
  }

  return (
    <div className="bulkbar" role="toolbar" aria-label="Bulk actions">
      <span className="bulk-count">{n} selected</span>

      {!inTrash && (
        <>
          <button onClick={() => setTagPicker((v) => !v)}>Tag</button>
          <button onClick={() => bulk({ favorited: true }, `Favorited ${n}`)}>Favorite</button>
          {inArchive ? (
            <button onClick={() => bulk({ archived_at: null }, `Unarchived ${n}`)}>Unarchive</button>
          ) : (
            <button
              onClick={() => bulk({ archived_at: new Date().toISOString() }, `Archived ${n}`)}
            >
              Archive
            </button>
          )}
          <button
            className="bulk-danger"
            onClick={() => bulk({ deleted_at: new Date().toISOString() }, `Moved ${n} to Trash`)}
          >
            Delete
          </button>
        </>
      )}

      {inTrash && (
        <>
          <button onClick={() => bulk({ deleted_at: null }, `Restored ${n}`)}>Restore</button>
          <button
            className="bulk-danger"
            onClick={async () => {
              for (const id of selection) await api['bookmarks:delete-permanent'](id)
              showToast(`Deleted ${n} permanently`)
              onDone()
            }}
          >
            Delete forever
          </button>
        </>
      )}

      <button onClick={onClear} aria-label="Clear selection">
        <XIcon size={13} />
      </button>

      {tagPicker && (
        <div className="drawer-menu" style={{ bottom: 44, top: 'auto', right: 'auto', left: 60 }}>
          {tags.length === 0 && <button disabled>No tags yet</button>}
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                await api['bookmarks:bulk-tag'](selection, [t.id])
                showToast(`Tagged ${n} with ${t.name}`)
                setTagPicker(false)
                onDone()
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
