import {
  app,
  BrowserWindow,
  protocol,
  globalShortcut,
  Menu,
  clipboard,
  shell,
  net
} from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { openDb, imagesDir } from './db.js'
import { runMigrationIfNeeded } from './migrate.js'
import { registerIpc, addBookmark, smartUrl } from './ipc.js'
import { startExtensionServer } from './httpServer.js'
import * as db from './db.js'

const isDev = !app.isPackaged
let mainWindow = null

// Data always lives in ~/Library/Application Support/staaash — dev and packaged alike.
app.setName('staaash')
app.setPath('userData', join(app.getPath('appData'), 'staaash'))

// Serve cached preview images from the app's data dir: staaash-img://<filename>
protocol.registerSchemesAsPrivileged([
  { scheme: 'staaash-img', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

function createWindow() {
  // STAAASH_WIN=1440x792 pins the window size (design-parity screenshots)
  const [envW, envH] = (process.env.STAAASH_WIN || '').split('x').map(Number)
  mainWindow = new BrowserWindow({
    width: envW || 1520,
    height: envH || 940,
    minWidth: 880,
    minHeight: 600,
    show: false,
    backgroundColor: '#0E0E10',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 20 },
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Verification hook: STAAASH_SCREENSHOT=/path.png captures the window and quits.
  if (process.env.STAAASH_SCREENSHOT) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          if (process.env.STAAASH_TEST_JS) {
            await mainWindow.webContents.executeJavaScript(process.env.STAAASH_TEST_JS)
            await new Promise((r) => setTimeout(r, Number(process.env.STAAASH_TEST_WAIT || 900)))
          }
          const image = await mainWindow.webContents.capturePage()
          const { writeFile } = await import('node:fs/promises')
          await writeFile(process.env.STAAASH_SCREENSHOT, image.toPNG())
        } finally {
          if (process.env.STAAASH_SCREENSHOT_QUIT !== '0') app.quit()
        }
      }, Number(process.env.STAAASH_SCREENSHOT_DELAY || 4000))
    })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function notify(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload)
}

function buildMenu() {
  const template = [
    {
      label: 'staaash',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings…',
          accelerator: 'Cmd+,',
          click: () => notify('ui:open-settings')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Bookmark',
          accelerator: 'Cmd+N',
          click: () => notify('ui:open-capture', { url: null })
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(async () => {
  openDb()
  const migration = await runMigrationIfNeeded()
  if (migration.migrated) {
    console.log(
      `[staaash] migrated ${migration.bookmarks} bookmarks, ${migration.tags} tags, ${migration.imagesCopied} cached images`
    )
  }

  // staaash-img://img/<filename> → local image cache
  protocol.handle('staaash-img', (request) => {
    const url = new URL(request.url)
    const name = decodeURIComponent(url.pathname.replace(/^\//, '')) || url.hostname
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) return new Response('bad name', { status: 400 })
    return net.fetch(pathToFileURL(join(imagesDir(), name)).toString())
  })

  registerIpc(() => mainWindow)
  buildMenu()
  createWindow()

  // Keep the browser extension working: POST /api/add on port 3847
  startExtensionServer({
    addBookmark: (fields) => addBookmark(fields, notify),
    findDuplicate: (url) => db.findDuplicate(smartUrl(url) || url)
  })

  // Global quick-capture: ⌥⌘S opens the palette, pre-filled from clipboard
  globalShortcut.register('Alt+Command+S', () => {
    if (!mainWindow) createWindow()
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    const text = clipboard.readText().trim()
    const url = /^https?:\/\/\S+$/i.test(text) ? text : null
    notify('ui:open-capture', { url })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

// Drag a URL onto the Dock icon (delivered as open-url for http/https)
app.on('open-url', async (event, url) => {
  event.preventDefault()
  if (/^https?:\/\//i.test(url)) {
    await addBookmark({ url, source: 'dock' }, notify).catch(() => {})
  }
})

// Drag a .webloc/.url file onto the Dock icon
app.on('open-file', async (event, filePath) => {
  event.preventDefault()
  try {
    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(filePath, 'utf-8')
    const m = raw.match(/https?:\/\/[^\s<>"]+/)
    if (m) await addBookmark({ url: m[0], source: 'dock' }, notify)
  } catch {
    /* not a link file */
  }
})

app.on('will-quit', () => globalShortcut.unregisterAll())

app.on('window-all-closed', () => {
  // macOS convention: keep the app alive in the Dock
  if (process.platform !== 'darwin') app.quit()
})
