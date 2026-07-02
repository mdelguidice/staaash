import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";

const PORT = 3847;

// SSE clients for live push
const sseClients = new Set();
const DIR = import.meta.dirname;

// Load .env file if present
try {
  const env = await readFile(join(DIR, ".env"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
} catch { /* no .env, that's fine */ }
const CACHE_DIR = join(DIR, ".cache", "images");
const BACKUP_DIR = join(DIR, ".cache", "backups");
const DATA_FILE = join(DIR, ".cache", "data.json");

// Ensure cache directories exist
await mkdir(CACHE_DIR, { recursive: true });
await mkdir(BACKUP_DIR, { recursive: true });

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ── Metadata Extraction ──

async function extractMeta(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      // Not HTML — return basics
      const domain = new URL(url).hostname.replace("www.", "");
      return { title: domain, summary: null, image_url: null, domain };
    }

    const html = await res.text();
    const domain = new URL(url).hostname.replace("www.", "");

    const rawTitle =
      getMetaContent(html, 'property="og:title"') ||
      getMetaContent(html, 'name="twitter:title"') ||
      getTitleTag(html) ||
      null;

    // Detect template variables / unrendered SPA titles and fall back to inline data
    const titleIsTemplate = rawTitle && /^[%{]|^\[.*\]$|^{{/.test(rawTitle.trim());
    const inlineData = titleIsTemplate || !rawTitle ? extractInlineData(html) : null;

    const title = (titleIsTemplate ? null : rawTitle) || inlineData?.siteName || domain;

    const summary =
      getMetaContent(html, 'property="og:description"') ||
      getMetaContent(html, 'name="description"') ||
      getMetaContent(html, 'name="twitter:description"') ||
      inlineData?.siteDescription ||
      null;

    let image_url =
      getMetaContent(html, 'property="og:image"') ||
      getMetaContent(html, 'name="twitter:image"') ||
      null;

    // Resolve relative image URLs
    if (image_url && !image_url.startsWith("http")) {
      try {
        image_url = new URL(image_url, url).href;
      } catch {
        image_url = null;
      }
    }

    // If no OG image found, try a screenshot fallback
    if (!image_url) {
      image_url = await getScreenshot(url);
    }

    const content = extractReadableText(html);

    return { title: cleanText(title), summary: cleanText(summary), image_url, domain, content };
  } catch (err) {
    const domain = new URL(url).hostname.replace("www.", "");
    const image_url = await getScreenshot(url);
    return { title: domain, summary: null, image_url, domain };
  } finally {
    clearTimeout(timeout);
  }
}

async function getScreenshot(url) {
  try {
    // Use Google PageSpeed Insights API for a free screenshot
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&strategy=desktop&fields=lighthouseResult.audits.final-screenshot`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const data = await res.json();
    const screenshot = data?.lighthouseResult?.audits?.["final-screenshot"]?.details?.data;
    if (!screenshot) return null;

    // It's a base64 data URI — save it to cache
    const base64 = screenshot.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const fileHash = createHash("sha256").update(url + ":screenshot").digest("hex").slice(0, 16);
    const cachePath = join(CACHE_DIR, fileHash + ".jpg");
    await writeFile(cachePath, buffer);

    return "/api/cached/" + fileHash;
  } catch {
    return null;
  }
}

function getMetaContent(html, attrMatch) {
  // Match both orderings: <meta property="..." content="..."> and <meta content="..." property="...">
  const patterns = [
    new RegExp(`<meta[^>]*${attrMatch}[^>]*content="([^"]*)"`, "i"),
    new RegExp(`<meta[^>]*${attrMatch}[^>]*content='([^']*)'`, "i"),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attrMatch}`, "i"),
    new RegExp(`<meta[^>]*content='([^']*)'[^>]*${attrMatch}`, "i"),
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m && m[1]) return m[1];
  }
  return null;
}

function getTitleTag(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1] : null;
}

function cleanText(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

function extractReadableText(html) {
  // Strip script, style, nav, header, footer tags and their content
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')          // Strip remaining tags
    .replace(/&[a-z]+;/gi, ' ')         // Strip HTML entities
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();
  // Limit to ~5000 chars to keep storage reasonable
  return text.length > 5000 ? text.slice(0, 5000) : text;
}

function extractInlineData(html) {
  // Try to extract site metadata from inline script data (Nuxt, Next.js, etc.)
  const patterns = [
    // Nuxt: window.__NUXT__.config={public:{...,siteName:"...",siteDescription:"..."}}
    /siteName:\s*"([^"]+)"/,
    /siteDescription:\s*"([^"]+)"/,
    // Next.js / generic JSON-LD
    /"name"\s*:\s*"([^"]+)"/,
    /"description"\s*:\s*"([^"]+)"/,
  ];
  const siteName = html.match(patterns[0])?.[1] || html.match(patterns[2])?.[1] || null;
  const siteDescription = html.match(patterns[1])?.[1] || html.match(patterns[3])?.[1] || null;
  if (!siteName && !siteDescription) return null;
  return { siteName, siteDescription };
}

// ── Server ──

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Load data (source of truth)
  if (url.pathname === "/api/data" && req.method === "GET") {
    try {
      const data = await readFile(DATA_FILE, "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    } catch {
      // No data file yet — return empty
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ links: [], tags: [] }));
    }
    return;
  }

  // API: Save data (source of truth)
  if (url.pathname === "/api/data" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body);
      await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // SSE: live push to open Stash tabs
  if (url.pathname === "/api/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(":\n\n"); // initial comment to open the stream
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // API: Add a single item (used by browser extension)
  if (url.pathname === "/api/add" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const { url: itemUrl, title, note } = JSON.parse(body);
      if (!itemUrl) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "url is required" }));
        return;
      }

      // Read existing data
      let store = { links: [] };
      try {
        const raw = await readFile(DATA_FILE, "utf-8");
        store = JSON.parse(raw);
        if (!Array.isArray(store.links)) store.links = [];
      } catch { /* first item */ }

      // Check for duplicate URL
      const normalized = itemUrl.split("?")[0].replace(/\/$/, "");
      const dupe = store.links.find(d => {
        const n = (d.url || "").split("?")[0].replace(/\/$/, "");
        return n === normalized;
      });
      if (dupe) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, duplicate: true, id: dupe.id }));
        return;
      }

      // Extract metadata in background, save immediately with what we have
      const id = crypto.randomUUID();
      const domain = (() => { try { return new URL(itemUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
      const newItem = {
        id,
        url: itemUrl,
        title: title || domain,
        domain,
        summary: null,
        image_url: null,
        created_at: new Date().toISOString(),
        read_at: null,
        deleted_at: null,
        archived_at: null,
        source: "extension",
        hn_url: null,
        note: note || null,
        tags: [],
      };

      store.links.unshift(newItem);
      await writeFile(DATA_FILE, JSON.stringify(store, null, 2));

      // Enrich metadata async (don't block response)
      extractMeta(itemUrl).then(async (meta) => {
        try {
          const raw = await readFile(DATA_FILE, "utf-8");
          const s = JSON.parse(raw);
          const idx = s.links.findIndex(i => i.id === id);
          if (idx !== -1) {
            s.links[idx] = { ...s.links[idx], ...meta };
            await writeFile(DATA_FILE, JSON.stringify(s, null, 2));
            // Broadcast enriched item to open tabs
            const update = `data: ${JSON.stringify({ type: "update", item: s.links[idx] })}\n\n`;
            for (const client of sseClients) client.write(update);
          }
        } catch { /* best effort */ }
      }).catch(() => {});

      // Broadcast new item to all open Stash tabs
      const event = `data: ${JSON.stringify({ type: "add", item: newItem })}\n\n`;
      for (const client of sseClients) client.write(event);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, id }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Extract metadata
  if (url.pathname === "/api/extract" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;

    try {
      const { url: targetUrl } = JSON.parse(body);
      if (!targetUrl) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "url is required" }));
        return;
      }

      // Validate URL
      new URL(targetUrl);

      const meta = await extractMeta(targetUrl);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(meta));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Image proxy with disk cache
  if (url.pathname === "/api/image") {
    const imgUrl = url.searchParams.get("url");
    if (!imgUrl) {
      res.writeHead(400);
      res.end("url param required");
      return;
    }

    // Generate cache key from URL
    const urlHash = createHash("sha256").update(imgUrl).digest("hex").slice(0, 16);
    const cachePathBase = join(CACHE_DIR, urlHash);

    // Check disk cache first
    for (const ext of [".jpg", ".png", ".gif", ".webp", ".jpeg"]) {
      const cached = cachePathBase + ext;
      try {
        await stat(cached);
        const data = await readFile(cached);
        const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" };
        res.writeHead(200, {
          "Content-Type": mimeMap[ext] || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache-Hash": urlHash,
        });
        res.end(data);
        return;
      } catch { /* not cached with this extension */ }
    }

    // Fetch and cache
    try {
      const imgRes = await fetch(imgUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      if (!imgRes.ok) {
        res.writeHead(502);
        res.end("Upstream returned " + imgRes.status);
        return;
      }

      const ct = imgRes.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      // Determine file extension from content-type
      const extMap = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp" };
      const cacheExt = extMap[ct.split(";")[0].trim()] || ".jpg";
      const cachePath = cachePathBase + cacheExt;

      // Write to disk cache (async, don't block response)
      writeFile(cachePath, buffer).catch(() => {});

      res.writeHead(200, {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      res.end(buffer);
    } catch {
      res.writeHead(502);
      res.end("Failed to fetch image");
    }
    return;
  }

  // API: Upload image for a link
  if (url.pathname === "/api/upload" && req.method === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    // Parse multipart boundary
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No boundary in content-type" }));
      return;
    }

    const boundary = "--" + boundaryMatch[1];
    const parts = body.toString("binary").split(boundary);

    let fileData = null;
    let fileExt = ".jpg";

    for (const part of parts) {
      if (part.includes("Content-Disposition")) {
        const ctMatch = part.match(/Content-Type:\s*(\S+)/i);
        if (ctMatch) {
          const mime = ctMatch[1].trim();
          const extMap = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp" };
          fileExt = extMap[mime] || ".jpg";

          // Extract binary data after the double CRLF
          const headerEnd = part.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            const raw = part.slice(headerEnd + 4);
            // Remove trailing \r\n
            const trimmed = raw.endsWith("\r\n") ? raw.slice(0, -2) : raw;
            fileData = Buffer.from(trimmed, "binary");
          }
        }
      }
    }

    if (!fileData) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No file data found" }));
      return;
    }

    // Save with a unique hash
    const fileHash = createHash("sha256").update(fileData).digest("hex").slice(0, 16);
    const cachePath = join(CACHE_DIR, fileHash + fileExt);
    await writeFile(cachePath, fileData);

    const cachedUrl = "/api/cached/" + fileHash;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ url: cachedUrl }));
    return;
  }

  // API: Serve cached image by hash (stable URL that never expires)
  const cachedMatch = url.pathname.match(/^\/api\/cached\/([a-f0-9]{16})$/);
  if (cachedMatch) {
    const hash = cachedMatch[1];
    for (const ext of [".jpg", ".png", ".gif", ".webp", ".jpeg"]) {
      const cached = join(CACHE_DIR, hash + ext);
      try {
        await stat(cached);
        const data = await readFile(cached);
        const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" };
        res.writeHead(200, {
          "Content-Type": mimeMap[ext] || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(data);
        return;
      } catch { /* try next ext */ }
    }
    res.writeHead(404);
    res.end("Not cached");
    return;
  }

  // API: Save backup (client pushes data to server for safekeeping)
  if (url.pathname === "/api/backup" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = join(BACKUP_DIR, `stash-${ts}.json`);
      await writeFile(backupPath, JSON.stringify(data, null, 2));

      // Keep only last 20 backups
      const { readdir, unlink } = await import("node:fs/promises");
      const files = (await readdir(BACKUP_DIR)).filter(f => f.startsWith("stash-") && f.endsWith(".json")).sort();
      if (files.length > 20) {
        for (const old of files.slice(0, files.length - 20)) {
          await unlink(join(BACKUP_DIR, old)).catch(() => {});
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, file: backupPath }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: List backups
  if (url.pathname === "/api/backups" && req.method === "GET") {
    try {
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(BACKUP_DIR)).filter(f => f.startsWith("stash-") && f.endsWith(".json")).sort().reverse();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(files));
    } catch {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("[]");
    }
    return;
  }

  // API: Restore from backup
  if (url.pathname.startsWith("/api/backups/") && req.method === "GET") {
    const filename = url.pathname.replace("/api/backups/", "");
    if (!/^stash-.*\.json$/.test(filename)) {
      res.writeHead(400);
      res.end("Invalid filename");
      return;
    }
    try {
      const data = await readFile(join(BACKUP_DIR, filename), "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Backup not found");
    }
    return;
  }

  // API: Check link health
  if (url.pathname === "/api/check-link" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const { url: targetUrl } = JSON.parse(body);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const checkRes = await fetch(targetUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      });
      clearTimeout(timeout);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url: targetUrl, status: checkRes.status, ok: checkRes.ok }));
    } catch {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url: "", status: 0, ok: false }));
    }
    return;
  }

  // API: Enhance note with AI
  if (url.pathname === "/api/enhance-note" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const { note, title, summary } = JSON.parse(body);
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }));
        return;
      }

      const userContent = note
        ? `My note: "${note}"\nPage title: "${title || ""}"\nPage description: "${summary || ""}"`
        : `Page title: "${title || ""}"\nPage description: "${summary || ""}"`;

      const prompt = note
        ? `Rewrite the user's note as a single clear sentence capturing their intent. Use their words and meaning — the page context is just for filling in proper nouns or details. Return only the sentence, no quotes, no explanation.`
        : `Write a single sentence explaining why someone might save this page, based on the title and description. Return only the sentence, no quotes, no explanation.`;

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          messages: [
            { role: "user", content: `${prompt}\n\n${userContent}` }
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!aiRes.ok) {
        const err = await aiRes.text();
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err }));
        return;
      }

      const data = await aiRes.json();
      const enhanced = data.content?.[0]?.text?.trim() || note;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ note: enhanced }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static files
  let filePath = (url.pathname === "/" || url.pathname.endsWith("/")) ? url.pathname.replace(/\/?$/, "/index.html") : url.pathname;
  const fullPath = join(DIR, filePath);
  const ext = extname(fullPath);
  const mime = MIME[ext] || "application/octet-stream";

  try {
    const data = await readFile(fullPath);
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n  Stash is running at http://localhost:${PORT}\n`);
});
