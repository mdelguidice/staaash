/**
 * The dominant hue of a cached favicon, or null when there isn't a usable one.
 *
 * Placeholder cards take their hue from the site's own favicon where the icon
 * actually carries colour, and from a hash of the domain otherwise. That choice
 * has to be made in the main process at save time, which has no image decoder —
 * so this decodes PNG directly. Node ships zlib, and a favicon is a few KB, so
 * the alternative (pulling an image library into main to read one hue) costs far
 * more than it returns.
 *
 * Measured on a real library: of 38 cached favicons across the 45 preview-less
 * bookmarks, 34 are PNG, 3 are ICO and 1 is JPEG. Anything this cannot read
 * returns null and falls back to the domain hash, which is a complete answer
 * rather than a degraded one.
 *
 * Deliberately not supported, each returning null: interlaced PNG, bit depths
 * other than 8, greyscale (it has no hue by definition), ICO, JPEG, SVG.
 */
import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Undo PNG's per-scanline filtering, in place, returning raw samples. */
function unfilter(raw, width, height, bpp) {
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)
  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0
      const b = prev ? prev[i] : 0
      const c = prev && i >= bpp ? prev[i - bpp] : 0
      let v = line[i]
      switch (filter) {
        case 0: break
        case 1: v += a; break
        case 2: v += b; break
        case 3: v += (a + b) >> 1; break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          break
        }
        default: return null            // unknown filter: refuse rather than guess
      }
      cur[i] = v & 0xff
    }
  }
  return out
}

function decodePng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return null
  let pos = 8
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0
  let palette = null, trns = null
  const idat = []

  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      depth = data[8]; colorType = data[9]; interlace = data[12]
    } else if (type === 'PLTE') palette = Buffer.from(data)
    else if (type === 'tRNS') trns = Buffer.from(data)
    else if (type === 'IDAT') idat.push(Buffer.from(data))
    else if (type === 'IEND') break
    pos += 12 + len                      // length + type + data + crc
  }

  if (!width || !height || depth !== 8 || interlace !== 0) return null
  if (colorType !== 2 && colorType !== 3 && colorType !== 6) return null   // 0/4 are greyscale
  if (width * height > 512 * 512) return null                             // a favicon, not a photo

  let raw
  try { raw = inflateSync(Buffer.concat(idat)) } catch { return null }

  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 1
  const expected = height * (1 + width * channels)
  if (raw.length < expected) return null
  const px = unfilter(raw, width, height, channels)
  if (!px) return null

  return { width, height, px, channels, colorType, palette, trns }
}

function rgb2hue(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  if (mx === mn) return null
  const d = mx - mn
  let h
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0))
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return h * 60
}

/**
 * Returns the dominant hue in degrees, or null.
 *
 * Same rule the prototype measured with: a pixel counts only if it is opaque and
 * genuinely chromatic (saturation >= 0.18, lightness within 0.12-0.90), hues are
 * bucketed into 20-degree bins, and a bin has to hold at least 12% of the
 * chromatic pixels to count as a colour rather than a stray edge artifact. An
 * icon whose chromatic pixels are under a tenth of its opaque pixels is a
 * monochrome mark and returns null.
 */
export async function faviconHue(path) {
  let buf
  try { buf = await readFile(path) } catch { return null }
  const img = decodePng(buf)
  if (!img) return null

  const { width, height, px, channels, colorType, palette, trns } = img
  const bins = new Map()
  let opaque = 0, chromatic = 0

  for (let i = 0, n = width * height; i < n; i++) {
    let r, g, b, a = 255
    if (colorType === 3) {
      const idx = px[i]
      if (!palette || idx * 3 + 2 >= palette.length) continue
      r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2]
      if (trns && idx < trns.length) a = trns[idx]
    } else {
      const o = i * channels
      r = px[o]; g = px[o + 1]; b = px[o + 2]
      if (channels === 4) a = px[o + 3]
    }
    if (a < 128) continue
    opaque++
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255
    const l = (mx + mn) / 2
    if (l < 0.12 || l > 0.90) continue
    const s = mx === mn ? 0 : l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn)
    if (s < 0.18) continue
    const h = rgb2hue(r, g, b)
    if (h == null) continue
    chromatic++
    const k = Math.floor(((h % 360) + 360) % 360 / 20)
    const e = bins.get(k) ?? { n: 0, h: 0 }
    e.n++; e.h += h
    bins.set(k, e)
  }

  if (!opaque || chromatic / opaque < 0.10) return null
  let best = null
  for (const [, e] of bins) if (!best || e.n > best.n) best = e
  if (!best || best.n / chromatic < 0.12) return null
  return ((best.h / best.n) % 360 + 360) % 360
}
