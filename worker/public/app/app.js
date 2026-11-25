// staaash phone app: the save sheet a share opens, the queue, and setup.
// Plain JS, no build step: it's served as-is by the inbox Worker.
const root = document.getElementById('root')
const params = new URLSearchParams(location.search)
let installPrompt = null
let view = null // which screen is showing; background refreshes only touch 'home'

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (k === 'class') el.className = v
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid)
  return el
}
const render = (...kids) => root.replaceChildren(...kids.flat().filter((k) => k != null && k !== false))
const firstUrl = (s) => (s || '').match(/https?:\/\/[^\s<>"']+/i)?.[0].replace(/[),.;!?]+$/, '') ?? null
const linkOf = (d) => firstUrl(d.url) || firstUrl(d.text) || firstUrl(d.title)
const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}
const isStandalone = () => matchMedia('(display-mode: standalone)').matches

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installPrompt = e
  if (!params.get('draft')) home()
})

// ── Sending ──

async function send() {
  const reg = await navigator.serviceWorker?.ready.catch(() => null)
  if (reg?.active) {
    // Background sync covers "no signal now": Chrome retries when it's back.
    try {
      await reg.sync?.register('flush')
    } catch {}
    return new Promise((resolve) => {
      const done = (e) => {
        if (e.data?.type !== 'flushed') return
        navigator.serviceWorker.removeEventListener('message', done)
        clearTimeout(timer)
        resolve(e.data)
      }
      const timer = setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', done)
        resolve({ sent: [], kept: ['timeout'], failed: [] })
      }, 20000)
      navigator.serviceWorker.addEventListener('message', done)
      reg.active.postMessage({ type: 'flush' })
    })
  }
  return flushQueue()
}

// ── Views ──

async function setup(message) {
  view = 'setup'
  const input = h('input', { type: 'password', placeholder: 'Phone token', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Phone token' })
  const status = h('p', { class: 'hint' }, message || 'Paste the phone token that setup.sh printed. It can only add things to your inbox.')
  const save = h('button', { class: 'primary', type: 'submit' }, 'Save token')
  render(
    h('header', {}, h('h1', {}, 'staaash')),
    h(
      'form',
      {
        class: 'card',
        onsubmit: async (e) => {
          e.preventDefault()
          const token = input.value.trim()
          if (!token) return
          save.disabled = true
          status.textContent = 'Checking…'
          try {
            const res = await fetch('/phone/check', { headers: { authorization: `Bearer ${token}` } })
            if (res.status === 401) throw new Error('That token was refused. Copy it again from setup.sh’s output.')
            if (!res.ok) throw new Error(`The inbox said ${res.status}.`)
            await store.setKv('token', token)
            await send()
            route()
          } catch (err) {
            status.textContent = err.message.startsWith('Failed to fetch') ? 'No connection. Try again when you have signal.' : err.message
            save.disabled = false
          }
        }
      },
      h('label', { class: 'label' }, 'Connect this phone'),
      input,
      save,
      status
    )
  )
  input.focus()
}

async function draftView(id) {
  view = 'draft'
  const d = await store.get(id)
  if (!d) return home('That share was already saved or discarded.')
  if (d.status !== 'draft') return home()
  const link = linkOf(d)
  const urls = d.files.map((f) => URL.createObjectURL(f.blob))
  const note = h('textarea', { rows: '3', placeholder: 'Note (optional)', 'aria-label': 'Note' })
  note.value = d.note || ''
  const save = h('button', { class: 'primary', type: 'submit' }, 'Save')
  const discard = h(
    'button',
    {
      class: 'quiet',
      type: 'button',
      onclick: async () => {
        await store.remove(d.id)
        home('Discarded.')
      }
    },
    'Discard'
  )
  render(
    h('header', {}, h('h1', {}, 'Save to staaash')),
    h(
      'form',
      {
        class: 'card',
        onsubmit: async (e) => {
          e.preventDefault()
          save.disabled = discard.disabled = true
          save.textContent = 'Saving…'
          await store.put({ ...d, note: note.value.trim(), status: 'queued' })
          const r = await send()
          urls.forEach(URL.revokeObjectURL)
          if (r.sent.includes(d.id)) return done('Saved', 'It’ll be on your Mac the next time staaash syncs.')
          if (r.failed.includes(d.id)) return home()
          done('Queued', 'No connection right now. It’ll send by itself when you’re back online.')
        }
      },
      urls.length ? h('div', { class: 'thumbs' }, urls.map((src) => h('img', { src, alt: '' }))) : null,
      link ? h('div', { class: 'link' }, h('strong', {}, host(link)), h('span', {}, link)) : null,
      !link && !urls.length ? h('p', { class: 'hint error' }, 'This share had no link or image, so there’s nothing to save.') : null,
      note,
      h('div', { class: 'row' }, discard, save)
    )
  )
  if (!link && !urls.length) save.disabled = true
}

function done(title, body) {
  view = 'done'
  render(
    h('header', {}, h('h1', {}, 'staaash')),
    h('div', { class: 'card done' }, h('p', { class: 'big' }, title), h('p', { class: 'hint' }, body), h('button', { class: 'quiet', onclick: () => home() }, 'Done'))
  )
  history.replaceState(null, '', '/app/')
}

async function home(message) {
  view = 'home'
  history.replaceState(null, '', '/app/')
  const all = await store.all()
  const queued = all.filter((d) => d.status === 'queued')
  const failed = all.filter((d) => d.status === 'failed')
  const drafts = all.filter((d) => d.status === 'draft')
  const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: () => addFromPicker() })
  const linkInput = h('input', { type: 'url', placeholder: 'Paste a link', 'aria-label': 'Link', inputmode: 'url' })

  async function addFromPicker(link) {
    const files = [...(fileInput.files || [])].map((f) => ({ blob: f, name: f.name, type: f.type }))
    if (!files.length && !link) return
    const d = { id: newId(), client_id: newId(), created_at: new Date().toISOString(), url: link || null, text: null, title: null, files, note: '', status: 'draft' }
    await store.put(d)
    draftView(d.id)
  }

  render(
    h('header', {}, h('h1', {}, 'staaash')),
    message ? h('p', { class: 'hint banner' }, message) : null,
    !isStandalone()
      ? h(
          'div',
          { class: 'card' },
          h('label', { class: 'label' }, 'Install'),
          h('p', { class: 'hint' }, 'Install staaash so it shows up when you tap Share in any app.'),
          installPrompt
            ? h('button', { class: 'primary', onclick: async () => (await installPrompt.prompt(), (installPrompt = null), home()) }, 'Install app')
            : h('p', { class: 'hint' }, 'In Chrome: tap ⋮, then Install app (or Add to Home screen).')
        )
      : null,
    h(
      'div',
      { class: 'card' },
      h('label', { class: 'label' }, 'Inbox'),
      h(
        'p',
        { class: 'hint' },
        queued.length
          ? `${queued.length} waiting to send. They’ll go when you have signal.`
          : 'Nothing waiting. Share a link or screenshot to staaash from any app.'
      ),
      queued.length ? h('button', { class: 'quiet', onclick: async () => (await send(), home()) }, 'Send now') : null
    ),
    failed.length
      ? h(
          'div',
          { class: 'card' },
          h('label', { class: 'label' }, 'Couldn’t send'),
          failed.map((d) => h('p', { class: 'hint error' }, `${linkOf(d) ? host(linkOf(d)) : `${d.files.length} image${d.files.length === 1 ? '' : 's'}`}: ${d.error}`)),
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'quiet', onclick: async () => (await Promise.all(failed.map((d) => store.remove(d.id))), home()) }, 'Discard'),
            h(
              'button',
              {
                class: 'primary',
                onclick: async () => {
                  for (const d of failed) await store.put({ ...d, status: 'queued', error: null })
                  await send()
                  home()
                }
              },
              'Try again'
            )
          )
        )
      : null,
    drafts.length
      ? h(
          'div',
          { class: 'card' },
          h('label', { class: 'label' }, 'Not saved yet'),
          drafts.map((d) =>
            h('button', { class: 'quiet left', onclick: () => draftView(d.id) }, linkOf(d) ? host(linkOf(d)) : `${d.files.length} image${d.files.length === 1 ? '' : 's'}`)
          )
        )
      : null,
    h(
      'form',
      {
        class: 'card',
        onsubmit: (e) => {
          e.preventDefault()
          const link = firstUrl(linkInput.value)
          if (link) addFromPicker(link)
        }
      },
      h('label', { class: 'label' }, 'Add by hand'),
      h('div', { class: 'row' }, linkInput, h('button', { class: 'quiet', type: 'submit' }, 'Add')),
      h('button', { class: 'quiet', type: 'button', onclick: () => fileInput.click() }, 'Choose screenshots…'),
      fileInput
    ),
    h('footer', {}, h('button', { class: 'link-btn', onclick: () => setup('Paste a new phone token to replace the current one.') }, 'Change phone token'))
  )
}

async function route() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {})
  const token = await store.getKv('token')
  if (!token) return setup()
  const draft = params.get('draft')
  if (draft) return draftView(draft)
  if (params.get('share') === 'lost') return home('That share arrived before the app had finished installing. Share it again.')
  if (params.get('share') === 'unreadable') return home('That share couldn’t be read. Try sharing it again.')
  // Opening the app is a good moment to send anything still waiting.
  const pending = (await store.all()).some((d) => d.status === 'queued')
  if (pending) send().then(() => home())
  home()
}

navigator.serviceWorker?.addEventListener('message', (e) => {
  // A background send finished while the home screen was open: refresh its
  // counts, unless Mike is typing in it.
  if (e.data?.type === 'flushed' && view === 'home' && (!document.activeElement || document.activeElement === document.body)) home()
})

route()
