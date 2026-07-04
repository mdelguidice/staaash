// Typed bridge between renderer and main. The renderer never touches
// Node APIs — everything goes through window.staaash.
const { contextBridge, ipcRenderer } = require('electron')

const INVOKE_CHANNELS = [
  'bookmarks:list',
  'bookmarks:get',
  'bookmarks:add',
  'bookmarks:update',
  'bookmarks:delete-permanent',
  'bookmarks:bulk-update',
  'bookmarks:bulk-tag',
  'bookmarks:search',
  'bookmarks:check-duplicate',
  'meta:extract',
  'meta:refetch',
  'meta:check-link',
  'tags:list',
  'tags:create',
  'tags:rename',
  'tags:delete',
  'collections:list',
  'collections:create',
  'collections:rename',
  'collections:delete',
  'ask:question',
  'ask:has-key',
  'settings:get',
  'settings:set',
  'system:open-external',
  'system:clipboard-url',
  'data:export-json',
  'data:export-html',
  'data:import',
  'health:sweep',
  'images:ensure',
  'media:rescan'
]

const EVENT_CHANNELS = [
  'bookmarks:added',
  'bookmarks:updated',
  'bookmarks:changed',
  'collections:changed',
  'media:rescan-progress',
  'ui:open-capture',
  'ui:open-settings'
]

const api = {}
for (const channel of INVOKE_CHANNELS) {
  api[channel] = (...args) => ipcRenderer.invoke(channel, ...args)
}

api.on = (channel, callback) => {
  if (!EVENT_CHANNELS.includes(channel)) throw new Error(`Unknown event channel: ${channel}`)
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('staaash', api)
