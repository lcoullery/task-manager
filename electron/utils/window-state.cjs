const { app, screen } = require('electron')
const fs = require('fs')
const path = require('path')

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json')

const DEFAULT_STATE = {
  width: 1200,
  height: 800,
  x: undefined,
  y: undefined,
}

/**
 * Load saved window state from disk
 */
function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))

      // Validate bounds are still on screen (in case monitor config changed)
      const { width, height, x, y } = data
      if (x !== undefined && y !== undefined) {
        const display = screen.getDisplayNearestPoint({ x, y })
        const area = display.workArea

        // Check if window is at least partially visible
        if (x >= area.x - width && x < area.x + area.width &&
            y >= area.y - height && y < area.y + area.height) {
          return data
        }
      }

      // Position is offscreen, use default position but keep size
      return { ...DEFAULT_STATE, width, height }
    }
  } catch (err) {
    console.error('[window-state] Failed to load state:', err.message)
  }

  return DEFAULT_STATE
}

/**
 * Save current window state to disk
 */
function saveWindowState(win) {
  try {
    const bounds = win.getBounds()
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: win.isMaximized(),
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch (err) {
    console.error('[window-state] Failed to save state:', err.message)
  }
}

/**
 * Track window state changes and save on close
 */
function trackWindowState(win) {
  // Debounce save to avoid excessive writes
  let saveTimeout
  const debouncedSave = () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveWindowState(win), 500)
  }

  win.on('resize', debouncedSave)
  win.on('move', debouncedSave)

  // Save immediately on close
  win.on('close', () => {
    clearTimeout(saveTimeout)
    saveWindowState(win)
  })
}

module.exports = { loadWindowState, trackWindowState }
