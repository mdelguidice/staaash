// Fetch the better-sqlite3 prebuilt binary matching the installed Electron ABI.
// Replaces `electron-builder install-app-deps` (which insists on a node-gyp
// source build) — better-sqlite3 publishes official Electron prebuilds.
//
// The binary's presence proves nothing about which runtime it targets, and the
// common case is that it targets the WRONG one: better-sqlite3's own install
// script runs first and downloads a prebuild for the host NODE, so by the time
// this postinstall runs, build/Release/better_sqlite3.node already exists with
// Node's ABI. Packaging that produces an app that dies on launch with
// "compiled against a different Node.js version ... NODE_MODULE_VERSION".
// (electron-builder cannot save us — npmRebuild is false.)
//
// So the fetch is gated on a stamp file recording what the binary was fetched
// FOR, not on whether a binary exists. No stamp, or a stamp that disagrees with
// the installed Electron, means re-fetch.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bs3 = join(root, 'node_modules', 'better-sqlite3')
const electronVersion = JSON.parse(
  readFileSync(join(root, 'node_modules', 'electron', 'package.json'), 'utf-8')
).version

const binary = join(bs3, 'build', 'Release', 'better_sqlite3.node')
const stampFile = join(bs3, 'build', 'Release', '.staaash-prebuild-target')

// Arch and platform belong in the stamp too: prebuild-install fetches for the
// HOST arch, so a node_modules copied between an arm64 and an x64 machine is
// just as wrong as one built for Node.
const target = `electron-${electronVersion}-${process.platform}-${process.arch}`
const stamped = existsSync(stampFile) ? readFileSync(stampFile, 'utf-8').trim() : null

if (existsSync(binary) && stamped === target) {
  console.log(`[staaash] better_sqlite3.node already fetched for ${target}`)
  process.exit(0)
}

if (existsSync(binary)) {
  console.log(
    `[staaash] discarding better_sqlite3.node built for ` +
      `${stamped || 'node (better-sqlite3 default install)'} — need ${target}`
  )
  rmSync(binary)
}

console.log(`[staaash] fetching better-sqlite3 prebuild for ${target}`)
execFileSync(
  join(root, 'node_modules', '.bin', 'prebuild-install'),
  ['-r', 'electron', '-t', electronVersion, '--verbose'],
  { cwd: bs3, stdio: 'inherit' }
)

// Stamp only after a successful fetch, so a failed download re-fetches next run
// rather than being mistaken for a good binary.
writeFileSync(stampFile, `${target}\n`)
