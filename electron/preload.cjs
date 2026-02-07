const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  send: (channel, data) => {
    const validChannels = ['get-port', 'app-version']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  receive: (channel, func) => {
    const validChannels = ['port-info', 'version-info']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
})
