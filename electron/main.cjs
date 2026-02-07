const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { findAvailablePort } = require('./utils/port-finder.cjs')
const { startServer, stopServer } = require('./server-manager.cjs')
const { loadWindowState, trackWindowState } = require('./utils/window-state.cjs')
const { createApplicationMenu } = require('./menu.cjs')

// Log to file in packaged app for debugging
const logFile = path.join(app.getPath('userData'), 'electron-log.txt')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  console.log(msg)
  fs.appendFileSync(logFile, line)
}

let mainWindow
let serverPort = null

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // Focus the existing window if a second instance is launched
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function createWindow(port) {
  const isDev = !app.isPackaged
  const windowState = loadWindowState()

  mainWindow = new BrowserWindow({
    ...windowState,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // icon: path.join(__dirname, '../build-resources/icons/icon.png'),
  })

  // Restore maximized state if needed
  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // Track state changes
  trackWindowState(mainWindow)

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

    // Start the Express server with userData directory for data storage
    const dataDir = app.getPath('userData')
    await startServer(serverPort, dataDir)
    log(`[electron] Server started on port ${serverPort}`)
    log(`[electron] Data directory: ${dataDir}`)

    // Create the window
    createWindow(serverPort)

    // Set up application menu
    createApplicationMenu(mainWindow)

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
