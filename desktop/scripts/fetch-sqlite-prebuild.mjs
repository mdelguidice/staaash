// Fetch the better-sqlite3 prebuilt binary matching the installed Electron ABI.
// Replaces `electron-builder install-app-deps` (which insists on a node-gyp
// source build) — better-sqlite3 publishes official Electron prebuilds.
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bs3 = join(root, 'node_modules', 'better-sqlite3')
const electronVersion = JSON.parse(
  readFileSync(join(root, 'node_modules', 'electron', 'package.json'), 'utf-8')
).version

if (existsSync(join(bs3, 'build', 'Release', 'better_sqlite3.node'))) {
  // Assume it's correct if present; delete build/ to force a re-fetch.
  console.log('[staaash] better_sqlite3.node already present')
  process.exit(0)
}

console.log(`[staaash] fetching better-sqlite3 prebuild for electron ${electronVersion}`)
execFileSync(
  join(root, 'node_modules', '.bin', 'prebuild-install'),
  ['-r', 'electron', '-t', electronVersion, '--verbose'],
  { cwd: bs3, stdio: 'inherit' }
)
