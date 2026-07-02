// Render the locked staaash mark into an .icns app icon.
// Mark spec: three italic ellipses (rx 13, ry 12) rotated −12°, ascending
// cy 53/50/47, white→warm-gray gradient, on warm near-black
// linear-gradient(155deg, #26211A → #0D0B08), 22.5% corner radius.
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'build')
mkdirSync(buildDir, { recursive: true })

// 155deg CSS gradient ≈ direction vector (sin155°, -cos155°) = (0.42, 0.91)
const svg = `<svg width="1024" height="1024" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="29%" y1="4.7%" x2="71%" y2="95.3%">
      <stop offset="0%" stop-color="#26211A"/>
      <stop offset="100%" stop-color="#0D0B08"/>
    </linearGradient>
    <linearGradient id="mark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#B9B0A3"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22.5" ry="22.5" fill="url(#bg)"/>
  <g fill="none" stroke="url(#mark)" stroke-width="4.6">
    <ellipse cx="28" cy="53" rx="13" ry="12" transform="rotate(-12 28 53)"/>
    <ellipse cx="50" cy="50" rx="13" ry="12" transform="rotate(-12 50 50)"/>
    <ellipse cx="72" cy="47" rx="13" ry="12" transform="rotate(-12 72 47)"/>
  </g>
</svg>`

writeFileSync(join(buildDir, 'icon.svg'), svg)

const iconset = join(buildDir, 'staaash.iconset')
rmSync(iconset, { recursive: true, force: true })
mkdirSync(iconset)

const sizes = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
]

for (const [name, size] of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(iconset, name))
}
// A plain 1024 png too (electron-builder accepts either)
await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(join(buildDir, 'icon.png'))

execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(buildDir, 'icon.icns')])
console.log('build/icon.icns written')
