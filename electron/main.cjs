const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { findAvailablePort } = require('./utils/port-finder.cjs')
const { startServer, stopServer } = require('./server-manager.cjs')

// Log to file in packaged app for debugging
const logFile = path.join(app.getPath('userData'), 'electron-log.txt')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  console.log(msg)
  fs.appendFileSync(logFile, line)
}

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
    // icon: path.join(__dirname, '../build-resources/icons/icon.png'),
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
    log(`[electron] App path: ${app.getAppPath()}`)
    log(`[electron] User data: ${app.getPath('userData')}`)
    log(`[electron] Is packaged: ${app.isPackaged}`)

    // Find an available port
    serverPort = await findAvailablePort(4173)
    log(`[electron] Using port ${serverPort}`)

    // Start the Express server
    await startServer(serverPort)
    log(`[electron] Server started on port ${serverPort}`)

    // Create the window
    createWindow(serverPort)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(serverPort)
      }
    })
  } catch (err) {
    log(`[electron] Failed to start: ${err.message}\n${err.stack}`)
    dialog.showErrorBox('Task Manager - Startup Error', err.message)
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
