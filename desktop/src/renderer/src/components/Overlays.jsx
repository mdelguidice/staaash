import { useState, useEffect } from 'react'
import { saveTitle } from '../lib/format.js'

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
        {dupe && <p className="modal-hint">Already staaashed as “{saveTitle(dupe)}”.</p>}
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
  const [rescan, setRescan] = useState(null) // null | {done, total}
  const [inboxUrl, setInboxUrl] = useState('')
  const [inboxToken, setInboxToken] = useState('')
  const [inboxCheck, setInboxCheck] = useState(null) // null | 'checking' | { ok, pending?, error? }
  const [lastSync, setLastSync] = useState({ at: null, error: null })

  useEffect(() => {
    api['settings:get']('anthropic_api_key').then((v) => {
      setApiKey(v || '')
      setKeyLoaded(true)
    })
    api['settings:get']('inbox_url').then((v) => setInboxUrl(v || ''))
    api['settings:get']('inbox_token').then((v) => setInboxToken(v || ''))
    Promise.all([api['settings:get']('inbox_last_sync'), api['settings:get']('inbox_last_error')]).then(([at, error]) =>
      setLastSync({ at, error })
    )
  }, [])

  const checkInbox = async () => {
    setInboxCheck('checking')
    setInboxCheck(await api['inbox:test'](inboxUrl.trim(), inboxToken.trim()))
  }

  useEffect(() => {
    return api.on('media:rescan-progress', (p) => setRescan(p))
  }, [])

  const startRescan = async () => {
    setRescan({ done: 0, total: 0 })
    const res = await api['media:rescan']()
    setRescan(null)
    if (res.ok) {
      showToast(
        res.scanned === 0
          ? 'Nothing to rescan — all thumbnails present'
          : `Rescanned ${res.scanned} bookmark${res.scanned === 1 ? '' : 's'}`
      )
    }
  }

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
        <label htmlFor="settings-inbox-url">Phone inbox</label>
        <input
          id="settings-inbox-url"
          type="url"
          value={inboxUrl}
          placeholder="https://staaash-inbox.<you>.workers.dev"
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setInboxUrl(e.target.value)
            setInboxCheck(null)
          }}
        />
        <input
          id="settings-inbox-token"
          aria-label="Desktop token"
          type="password"
          value={inboxToken}
          placeholder="Desktop token"
          spellCheck={false}
          autoComplete="off"
          style={{ marginTop: 8 }}
          onChange={(e) => {
            setInboxToken(e.target.value)
            setInboxCheck(null)
          }}
        />
        <div className="modal-row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={checkInbox} disabled={inboxCheck === 'checking' || !inboxUrl.trim() || !inboxToken.trim()}>
            {inboxCheck === 'checking' ? 'Checking…' : 'Test connection'}
          </button>
        </div>
        <p className="modal-hint" aria-live="polite">
          {inboxCheck && inboxCheck !== 'checking'
            ? inboxCheck.ok
              ? `Connected. ${inboxCheck.pending === 1 ? '1 item' : `${inboxCheck.pending} items`} waiting.`
              : inboxCheck.error
            : lastSync.error
              ? `Last sync failed: ${lastSync.error}`
              : lastSync.at
                ? `Syncs at launch and every 5 minutes. Last sync ${new Date(lastSync.at).toLocaleString()}.`
                : 'Address and desktop token from worker/setup.sh. Syncs at launch and every 5 minutes.'}
        </p>
      </div>

      <div className="field">
        <label>Thumbnails</label>
        <div className="modal-row">
          <button className="btn" onClick={startRescan} disabled={!!rescan}>
            {rescan
              ? rescan.total
                ? `Rescanning… ${rescan.done}/${rescan.total}`
                : 'Rescanning…'
              : 'Rescan missing thumbnails'}
          </button>
        </div>
        <p className="modal-hint" aria-live="polite">
          Refetches previews and favicons for bookmarks that don’t have one. The gallery fills
          in live as they land.
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
          Your library lives in ~/Library/Application Support/staaash. Only phone saves pass through your Cloudflare inbox on the way here.
        </p>
      </div>

      <div className="modal-actions">
        <button
          className="btn btn-primary"
          onClick={async () => {
            await api['settings:set']('anthropic_api_key', apiKey.trim())
            const newUrl = inboxUrl.trim().replace(/\/+$/, '')
            await api['settings:set']('inbox_url', newUrl)
            await api['settings:set']('inbox_token', inboxToken.trim())
            if (newUrl && inboxToken.trim()) api['inbox:sync']()
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

const plural = (n, one, many = one + 's') => `${n.toLocaleString()} ${n === 1 ? one : many}`

// File › Import Instagram Saves… Opens the file picker straight away, then a
// checklist of the export's collections. Nothing is written until Import; the
// counts under the list are a dry run of exactly what Import will do.
export function InstagramImportModal({ onClose, showToast }) {
  const [state, setState] = useState({ phase: 'choosing' }) // choosing | error | ready | importing
  const [picked, setPicked] = useState(new Set())
  const [unfiled, setUnfiled] = useState(false)
  const [plan, setPlan] = useState(null)

  const choose = async () => {
    setState({ phase: 'choosing' })
    const res = await api['instagram:open']()
    if (!res.ok && !res.error) return onClose()
    if (!res.ok) return setState({ phase: 'error', error: res.error })
    const keys = new Set(res.collections.map((c) => c.key))
    setPicked(new Set((res.lastPicks?.collections || []).filter((k) => keys.has(k))))
    setUnfiled(!!res.lastPicks?.unfiled)
    setState({ phase: 'ready', data: res })
  }

  useEffect(() => {
    choose()
    return () => {
      api['instagram:close']()
    }
  }, [])

  useEffect(() => {
    if (state.phase !== 'ready') return
    let live = true
    api['instagram:plan']({ collections: [...picked], unfiled }).then((p) => live && setPlan(p.ok ? p : null))
    return () => {
      live = false
    }
  }, [picked, unfiled, state.phase])

  const toggle = (key) =>
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const runImport = async () => {
    setState((s) => ({ ...s, phase: 'importing' }))
    const res = await api['instagram:apply']({ collections: [...picked], unfiled })
    if (!res.ok) return setState({ phase: 'error', error: res.error })
    const parts = []
    if (res.add) parts.push(`Imported ${plural(res.add, 'save')}`)
    if (res.tag) parts.push(`tagged ${plural(res.tag, 'existing save')}`)
    showToast(parts.length ? parts.join(', ') : 'Nothing new to import')
    onClose()
  }

  if (state.phase === 'choosing') return null
  if (state.phase === 'error') {
    return (
      <Scrim onClose={onClose} label="Import Instagram saves">
        <h2>Import Instagram saves</h2>
        <p className="modal-hint" role="alert">{state.error}</p>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={choose}>Choose another file…</button>
        </div>
      </Scrim>
    )
  }

  const { data } = state
  const nothing = !plan || (plan.add === 0 && plan.tag === 0)
  const busy = state.phase === 'importing'
  return (
    <Scrim onClose={busy ? () => {} : onClose} label="Import Instagram saves">
      <h2>Import Instagram saves</h2>
      <p className="modal-hint ig-source">
        {data.name} · {plural(data.total, 'save')}. Each collection you check becomes a tag.
      </p>

      <div className="ig-list" role="group" aria-label="Collections to import">
        <label className="ig-row ig-row-unfiled">
          <input type="checkbox" checked={unfiled} onChange={() => setUnfiled((v) => !v)} disabled={busy} />
          <span className="ig-name">Not in any collection</span>
          <span className="ig-count">{data.unfiled.toLocaleString()}</span>
        </label>
        {data.collections.map((c) => (
          <label key={c.key} className="ig-row">
            <input type="checkbox" checked={picked.has(c.key)} onChange={() => toggle(c.key)} disabled={busy} />
            <span className="ig-name">{c.key}</span>
            <span className="ig-count">{c.count.toLocaleString()}</span>
          </label>
        ))}
      </div>

      <p className="modal-hint ig-plan" aria-live="polite">
        {!plan
          ? 'Check a collection to see what will happen.'
          : plan.add + plan.tag + plan.unchanged + plan.trashed === 0
            ? 'Nothing checked yet.'
            : [
                `${plural(plan.add, 'new save')}`,
                plan.tag ? `${plural(plan.tag, 'existing save')} get${plan.tag === 1 ? 's' : ''} a tag` : null,
                plan.unchanged ? `${plan.unchanged.toLocaleString()} already here` : null,
                plan.trashed ? `${plan.trashed.toLocaleString()} in your trash, left there` : null
              ]
                .filter(Boolean)
                .join(' · ')}
      </p>

      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={runImport} disabled={nothing || busy}>
          {busy ? 'Importing…' : plan && plan.add ? `Import ${plural(plan.add, 'save')}` : 'Import'}
        </button>
      </div>
    </Scrim>
  )
}
