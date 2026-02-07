const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { findAvailablePort } = require('./utils/port-finder.cjs')
const { startServer, stopServer } = require('./server-manager.cjs')

let mainWindow
let serverPort = null

function createWindow(port) {
  const isDev = !app.isPackaged

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../build-resources/icons/icon.png'),
  })

  mainWindow.loadURL(`http://localhost:${port}`)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC handlers
ipcMain.handle('get-port', () => serverPort)

app.whenReady().then(async () => {
  try {
    // Find an available port
    serverPort = await findAvailablePort(4173)
    console.log(`[electron] Using port ${serverPort}`)

    // Start the Express server
    await startServer(serverPort)
    console.log(`[electron] Server started on port ${serverPort}`)

    // Create the window
    createWindow(serverPort)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(serverPort)
      }
    })
  } catch (err) {
    console.error('[electron] Failed to start:', err.message)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopServer()
})
