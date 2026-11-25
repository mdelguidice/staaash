// IndexedDB shared by the page and the service worker. Shares wait here until
// they reach the inbox, so nothing is lost without signal.
//
// drafts: { id, client_id, created_at, url, text, title, files: [{ blob, name, type }],
//           note, status: 'draft' | 'queued' | 'failed', error }
// kv:     token
const DB_NAME = 'staaash'
const DB_VERSION = 1

function openStore() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(store, mode, fn) {
  const db = await openStore()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const result = fn(t.objectStore(store))
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

const store = {
  get: (id) => tx('drafts', 'readonly', (s) => s.get(id)),
  all: () => tx('drafts', 'readonly', (s) => s.getAll()),
  put: (d) => tx('drafts', 'readwrite', (s) => s.put(d)),
  remove: (id) => tx('drafts', 'readwrite', (s) => s.delete(id)),
  getKv: (k) => tx('kv', 'readonly', (s) => s.get(k)),
  setKv: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k))
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)
}

// Sends every queued share. Used by the service worker (and by the page when
// no service worker is running). Returns { sent, kept, failed }.
async function flushQueue() {
  const token = await store.getKv('token')
  const out = { sent: [], kept: [], failed: [] }
  if (!token) return out
  const queued = (await store.all()).filter((d) => d.status === 'queued').sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const d of queued) {
    const form = new FormData()
    form.set('client_id', d.client_id)
    form.set('saved_at', d.created_at)
    for (const k of ['url', 'text', 'title', 'note']) if (d[k]) form.set(k, d[k])
    for (const f of d.files || []) form.append('image', f.blob, f.name || 'image')
    let res
    try {
      res = await fetch('/items', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form })
    } catch {
      out.kept.push(d.id) // no signal: stays queued
      continue
    }
    if (res.ok) {
      await store.remove(d.id)
      out.sent.push(d.id)
    } else if (res.status >= 500 || res.status === 429) {
      out.kept.push(d.id)
    } else {
      let msg = res.status === 401 ? 'The phone token was refused. Check it in Settings.' : `The inbox said ${res.status}.`
      try {
        const body = await res.json()
        if (body.error && res.status !== 401) msg = body.error
      } catch {}
      await store.put({ ...d, status: 'failed', error: msg })
      out.failed.push(d.id)
    }
  }
  return out
}
