import { useState, useEffect } from 'react'

const api = window.staaash

function Scrim({ onClose, children, label }) {
  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

export function CaptureModal({ initialUrl, onSave, onClose }) {
  const [url, setUrl] = useState(initialUrl || '')
  const [note, setNote] = useState('')
  const [dupe, setDupe] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!url.trim()) {
      setDupe(null)
      return
    }
    api['bookmarks:check-duplicate'](url).then((d) => {
      if (!cancelled) setDupe(d)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  const save = async () => {
    if (!url.trim() || saving) return
    setSaving(true)
    await onSave(url.trim(), note.trim() || undefined)
    setSaving(false)
  }

  return (
    <Scrim onClose={onClose} label="Save a bookmark">
      <h2>Staaash a link</h2>
      <div className="field">
        <label htmlFor="capture-url">URL</label>
        <input
          id="capture-url"
          type="text"
          autoFocus
          value={url}
          placeholder="paste or type — https:// is optional…"
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
        />
        {dupe && <p className="modal-hint">Already staaashed as “{dupe.title || dupe.url}”.</p>}
      </div>
      <div className="field">
        <label htmlFor="capture-note">Note (optional)</label>
        <input
          id="capture-note"
          type="text"
          value={note}
          placeholder="why you’re saving it…"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
        />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !url.trim()}>
          {saving ? 'Saving…' : dupe ? 'Save anyway' : 'Save'}
        </button>
      </div>
    </Scrim>
  )
}

export function SettingsModal({ onClose, showToast }) {
  const [apiKey, setApiKey] = useState('')
  const [keyLoaded, setKeyLoaded] = useState(false)

  useEffect(() => {
    api['settings:get']('anthropic_api_key').then((v) => {
      setApiKey(v || '')
      setKeyLoaded(true)
    })
  }, [])

  return (
    <Scrim onClose={onClose} label="Settings">
      <h2>Settings</h2>

      <div className="field">
        <label htmlFor="settings-key">Claude API key — powers Ask Staaash</label>
        <input
          id="settings-key"
          type="password"
          value={apiKey}
          placeholder={keyLoaded ? 'sk-ant-…' : 'Loading…'}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p className="modal-hint">
          Stored locally on this Mac. Without a key, the bar falls back to plain search.
        </p>
      </div>

      <div className="field">
        <label>Data</label>
        <div className="modal-row">
          <button className="btn" onClick={() => api['data:export-json']()}>
            Export JSON
          </button>
          <button className="btn" onClick={() => api['data:export-html']()}>
            Export HTML
          </button>
          <button
            className="btn"
            onClick={async () => {
              const res = await api['data:import']()
              if (res.ok) showToast(`Imported ${res.imported} bookmark${res.imported === 1 ? '' : 's'}`)
            }}
          >
            Import…
          </button>
        </div>
        <p className="modal-hint">
          Everything lives in ~/Library/Application Support/staaash — no cloud, no accounts.
        </p>
      </div>

      <div className="modal-actions">
        <button
          className="btn btn-primary"
          onClick={async () => {
            await api['settings:set']('anthropic_api_key', apiKey.trim())
            showToast('Settings saved')
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Scrim>
  )
}

const SHORTCUTS = [
  ['J / K', 'Move between cards'],
  ['Enter / O', 'Open in browser'],
  ['S', 'Favorite'],
  ['A', 'Archive'],
  ['D', 'Delete'],
  ['N', 'New bookmark'],
  ['X', 'Select card'],
  ['1 / 2', 'Gallery / List'],
  ['⌘ /', 'Ask Staaash'],
  ['⌥⌘S', 'Quick capture (global)'],
  ['⌘ ,', 'Settings'],
  ['Esc', 'Close / clear'],
  ['?', 'This overlay']
]

export function ShortcutsOverlay({ onClose }) {
  return (
    <Scrim onClose={onClose} label="Keyboard shortcuts">
      <h2>Keyboard shortcuts</h2>
      <div className="shortcuts-grid">
        {SHORTCUTS.map(([key, desc]) => (
          <div key={key} className="shortcut">
            <span>{desc}</span>
            <span className="kbd">{key}</span>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Scrim>
  )
}
