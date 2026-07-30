// Metadata extraction — ported from the original server.js.
// OG/meta tags with inline-SPA-data fallback, readable-text capture (5,000-char cap),
// screenshot fallback via PageSpeed when no OG image exists, and disk-cached preview images.
import { writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { imagesDir } from './db.js'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export async function extractMeta(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*' },
      redirect: 'follow'
    })

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      const domain = new URL(url).hostname.replace('www.', '')
      return { title: domain, summary: null, image_url: null, image_path: null, domain }
    }

    const html = await res.text()
    const domain = new URL(url).hostname.replace('www.', '')

    const rawTitle =
      getMetaContent(html, 'property="og:title"') ||
      getMetaContent(html, 'name="twitter:title"') ||
      getTitleTag(html) ||
      null

    // Detect template variables / unrendered SPA titles and fall back to inline data
    const titleIsTemplate = rawTitle && /^[%{]|^\[.*\]$|^{{/.test(rawTitle.trim())
    const inlineData = titleIsTemplate || !rawTitle ? extractInlineData(html) : null

    const title = (titleIsTemplate ? null : rawTitle) || inlineData?.siteName || domain

    const summary =
      getMetaContent(html, 'property="og:description"') ||
      getMetaContent(html, 'name="description"') ||
      getMetaContent(html, 'name="twitter:description"') ||
      inlineData?.siteDescription ||
      null

    let image_url =
      getMetaContent(html, 'property="og:image"') ||
      getMetaContent(html, 'name="twitter:image"') ||
      null

    if (image_url && !image_url.startsWith('http')) {
      try {
        image_url = new URL(image_url, url).href
      } catch {
        image_url = null
      }
    }

    // Which branch produced the preview is recorded, not inferred later. It
    // decides how a clamped card crops, and it is unrecoverable after the fact:
    // a cached og:image and a cached screenshot are both just a hash on disk.
    let image_path = null
    let preview_source = null
    if (image_url) {
      image_path = await cacheImage(image_url)
      if (image_path) preview_source = 'og'
    } else {
      image_path = await screenshotFallback(url)
      if (image_path) preview_source = 'screenshot'
    }

    const content = extractReadableText(html)

    return {
      title: cleanText(title), summary: cleanText(summary),
      image_url, image_path, preview_source, domain, content
    }
  } catch {
    const domain = safeDomain(url)
    const image_path = await screenshotFallback(url)
    return {
      title: domain, summary: null, image_url: null, image_path,
      preview_source: image_path ? 'screenshot' : null, domain
    }
  } finally {
    clearTimeout(timeout)
  }
}

function safeDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Download a preview image and cache it on disk. Returns "hash.ext" or null.
// Hash matches the old server's scheme (sha256 of the image URL, 16 hex chars)
// so migrated cache files keep working.
export async function cacheImage(imgUrl) {
  const urlHash = createHash('sha256').update(imgUrl).digest('hex').slice(0, 16)
  const existing = await findCached(urlHash)
  if (existing) return existing

  try {
    const res = await fetch(imgUrl, {
      headers: { 'User-Agent': UA.slice(0, 80) },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return null
    const ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' }
    const ext = extMap[ct] || '.jpg'
    const buffer = Buffer.from(await res.arrayBuffer())
    if (!buffer.length) return null
    await writeFile(join(imagesDir(), urlHash + ext), buffer)
    return urlHash + ext
  } catch {
    return null
  }
}

export async function findCached(hash) {
  for (const ext of ['.jpg', '.png', '.gif', '.webp', '.jpeg', '.ico', '.svg']) {
    try {
      await stat(join(imagesDir(), hash + ext))
      return hash + ext
    } catch {
      /* try next */
    }
  }
  return null
}

// Fetch and cache a site favicon. Returns "hash.ext" or null.
export async function fetchFavicon(domain) {
  if (!domain) return null
  const hash = createHash('sha256').update('favicon:' + domain).digest('hex').slice(0, 16)
  const existing = await findCached(hash)
  if (existing) return existing

  const sources = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    `https://${domain}/favicon.ico`
  ]
  for (const url of sources) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 40) continue // skip empty / 1px placeholders
      const ct = (res.headers.get('content-type') || '').split(';')[0].trim()
      const ext = ct.includes('png')
        ? '.png'
        : ct.includes('svg')
          ? '.svg'
          : ct.includes('jpeg')
            ? '.jpg'
            : ct.includes('webp')
              ? '.webp'
              : '.ico'
      await writeFile(join(imagesDir(), hash + ext), buffer)
      return hash + ext
    } catch {
      /* try next source */
    }
  }
  return null
}

// Screenshot fallback via Google PageSpeed (free, no key). Returns "hash.jpg" or null.
async function screenshotFallback(url) {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&strategy=desktop&fields=lighthouseResult.audits.final-screenshot`
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const data = await res.json()
    const screenshot = data?.lighthouseResult?.audits?.['final-screenshot']?.details?.data
    if (!screenshot) return null

    const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const fileHash = createHash('sha256').update(url + ':screenshot').digest('hex').slice(0, 16)
    await writeFile(join(imagesDir(), fileHash + '.jpg'), buffer)
    return fileHash + '.jpg'
  } catch {
    return null
  }
}

function getMetaContent(html, attrMatch) {
  const patterns = [
    new RegExp(`<meta[^>]*${attrMatch}[^>]*content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]*${attrMatch}[^>]*content='([^']*)'`, 'i'),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attrMatch}`, 'i'),
    new RegExp(`<meta[^>]*content='([^']*)'[^>]*${attrMatch}`, 'i')
  ]
  for (const pat of patterns) {
    const m = html.match(pat)
    if (m && m[1]) return m[1]
  }
  return null
}

function getTitleTag(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1] : null
}

export function cleanText(str) {
  if (!str) return str
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim()
}

function extractReadableText(html) {
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 5000 ? text.slice(0, 5000) : text
}

function extractInlineData(html) {
  const patterns = [
    /siteName:\s*"([^"]+)"/,
    /siteDescription:\s*"([^"]+)"/,
    /"name"\s*:\s*"([^"]+)"/,
    /"description"\s*:\s*"([^"]+)"/
  ]
  const siteName = html.match(patterns[0])?.[1] || html.match(patterns[2])?.[1] || null
  const siteDescription = html.match(patterns[1])?.[1] || html.match(patterns[3])?.[1] || null
  if (!siteName && !siteDescription) return null
  return { siteName, siteDescription }
}

// Link health check (dead-link detection)
export async function checkLink(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
      headers: { 'User-Agent': UA.slice(0, 80) }
    })
    return { url, status: res.status, ok: res.ok }
  } catch {
    return { url, status: 0, ok: false }
  }
}
