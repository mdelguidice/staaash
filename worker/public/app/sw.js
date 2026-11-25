// staaash phone app service worker.
// - Catches shares from the Android share sheet, keeps them on the phone, and
//   opens the save sheet.
// - Sends queued shares, now or when the connection comes back.
// - Serves the app itself offline.
importScripts('store.js')

const VERSION = 'staaash-app-v1'
const SHELL = ['/app/', '/app/app.js', '/app/store.js', '/app/app.css', '/app/manifest.webmanifest', '/app/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) return

  if (event.request.method === 'POST' && url.pathname === '/app/share') {
    event.respondWith(receiveShare(event.request))
    return
  }
  // The app shell: network first so updates land, cache when offline.
  if (event.request.method === 'GET' && url.pathname.startsWith('/app/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(VERSION).then((c) => c.put(url.pathname === '/app/index.html' ? '/app/' : event.request, copy))
          }
          return res
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }).then((r) => r || caches.match('/app/')))
    )
  }
})

async function receiveShare(request) {
  let form
  try {
    form = await request.formData()
  } catch {
    return Response.redirect('/app/?share=unreadable', 303)
  }
  const files = []
  for (const f of form.getAll('image')) {
    if (f && typeof f === 'object' && f.size > 0) files.push({ blob: f, name: f.name || 'image', type: f.type })
  }
  const draft = {
    id: newId(),
    client_id: newId(),
    created_at: new Date().toISOString(),
    url: String(form.get('url') || '') || null,
    text: String(form.get('text') || '') || null,
    title: String(form.get('title') || '') || null,
    files,
    note: '',
    status: 'draft'
  }
  await store.put(draft)
  return Response.redirect(`/app/?draft=${encodeURIComponent(draft.id)}`, 303)
}

async function flushAndTell() {
  const r = await flushQueue()
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const c of clients) c.postMessage({ type: 'flushed', ...r })
  return r
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'flush') event.waitUntil(flushAndTell())
})

// Background sync: Chrome calls this when the phone is back online, even with
// the app closed. Throwing asks Chrome to try again later.
self.addEventListener('sync', (event) => {
  if (event.tag !== 'flush') return
  event.waitUntil(
    flushAndTell().then((r) => {
      if (r.kept.length) throw new Error('still offline')
    })
  )
})
