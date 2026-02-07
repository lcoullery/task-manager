const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getPort: () => ipcRenderer.invoke('get-port'),
})
