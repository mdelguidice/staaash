// Launcher shim. Electron on macOS derives `appData` from NSHomeDirectory(),
// which ignores $HOME — so redirecting the app's database to a fixture cannot
// be done with env alone. We patch app.getPath('appData') *before* importing
// the real main, which computes userData = appData/staaash at module scope
// (src/main/index.js) and opens the DB later, on whenReady.
//
// This shim exists so the harness never has to modify app code.
import { app } from 'electron'
import { pathToFileURL } from 'node:url'

const appData = process.env.STAAASH_VD_APPDATA
if (appData) {
  const real = app.getPath.bind(app)
  app.getPath = (name) => (name === 'appData' ? appData : real(name))
}

const target = process.env.STAAASH_VD_MAIN
if (!target) throw new Error('STAAASH_VD_MAIN not set')
await import(pathToFileURL(target).href)
