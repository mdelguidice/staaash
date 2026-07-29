/**
 * Intrinsic pixel dimensions from an image file's header.
 *
 * Cards take the shape of their image (see cardAspect in lib/format.js), and
 * the masonry places every card before any of them paint — so the size has to
 * be known ahead of layout, not read off the <img> once it loads. Reading it
 * here, from the bytes already on disk, keeps that synchronous at render time.
 *
 * Header parsing rather than a decoder dependency: only the first few dozen
 * bytes are needed, and the alternative is pulling an image library into the
 * main process to answer a question the file format already states.
 */
import { open } from 'node:fs/promises'

/** Enough for a PNG/GIF/WebP header and a reasonable run of JPEG segments. */
const HEAD_BYTES = 65536

function fromBuffer(buf) {
  if (buf.length < 16) return null

  // PNG — IHDR is always the first chunk, width/height at 16/20.
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  }

  // GIF87a / GIF89a — little-endian at 6/8.
  if (buf.toString('ascii', 0, 3) === 'GIF') {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) }
  }

  // WebP — three sub-formats, all inside a RIFF container.
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buf.toString('ascii', 12, 16)
    if (fmt === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
    if (fmt === 'VP8L') {
      const b = buf.readUInt32LE(21)
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }
    }
    if (fmt === 'VP8X') {
      return {
        w: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
        h: (buf.readUIntLE(27, 3) & 0xffffff) + 1
      }
    }
    return null
  }

  // JPEG — walk the segment chain to the first SOF marker.
  if (buf.readUInt16BE(0) === 0xffd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue } // resync past padding
      const marker = buf[i + 1]
      // SOF0..SOF15, excluding DHT (c4), JPGA (c8) and DAC (cc)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
      const len = buf.readUInt16BE(i + 2)
      if (len < 2) return null
      i += 2 + len
    }
  }

  return null
}

/** Dimensions for a file on disk, or null if the format is unreadable. */
export async function imageSize(path) {
  let fh
  try {
    fh = await open(path, 'r')
    const buf = Buffer.alloc(HEAD_BYTES)
    const { bytesRead } = await fh.read(buf, 0, HEAD_BYTES, 0)
    const size = fromBuffer(buf.subarray(0, bytesRead))
    return size && size.w > 0 && size.h > 0 ? size : null
  } catch {
    return null
  } finally {
    await fh?.close().catch(() => {})
  }
}
