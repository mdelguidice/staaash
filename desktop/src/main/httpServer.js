// Local HTTP endpoint kept alive for the existing browser extension:
// POST /api/add on port 3847, same request/response contract as the old server.js.
import { createServer } from 'node:http'

const PORT = 3847

export function startExtensionServer({ addBookmark, findDuplicate }) {
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url, `http://localhost:${PORT}`)

    if (url.pathname === '/api/add' && req.method === 'POST') {
      let body = ''
      for await (const chunk of req) body += chunk
      try {
        const { url: itemUrl, title, note } = JSON.parse(body)
        if (!itemUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'url is required' }))
          return
        }
        const dupe = findDuplicate(itemUrl)
        if (dupe) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, duplicate: true, id: dupe.id }))
          return
        }
        const item = await addBookmark({ url: itemUrl, title, note, source: 'extension' })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, id: item.id }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, app: 'staaash' }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  })

  server.on('error', (err) => {
    // Port in use (old server still running, or another copy of the app) — not fatal.
    console.warn('[staaash] extension server not started:', err.message)
  })

  server.listen(PORT)
  return server
}
