import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CONFIG_PATH = resolve(__dirname, 'config.json')
const DEFAULT_DATA_PATH = './data/tasks.json'
const PORT = 4173

// Read config from disk
function readConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    }
  } catch (err) {
    console.error('Error reading config.json:', err.message)
  }
  return { dataFilePath: DEFAULT_DATA_PATH }
}

// Write config to disk
function writeConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

// Resolve the data file path (relative to project root)
function resolveDataPath() {
  const config = readConfig()
  const filePath = config.dataFilePath || DEFAULT_DATA_PATH
  // If absolute, use as-is; otherwise resolve relative to project root
  if (filePath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(filePath) || filePath.startsWith('\\\\')) {
    return filePath
  }
  return resolve(__dirname, filePath)
}

// Ensure directory exists for a file path
function ensureDir(filePath) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Default data structure (mirrors client DEFAULT_DATA)
const DEFAULT_DATA = {
  profiles: [],
  tasks: [],
  labels: [
    { id: 'label-1', name: 'Bug', color: 'red' },
    { id: 'label-2', name: 'Feature', color: 'blue' },
    { id: 'label-3', name: 'Urgent', color: 'orange' },
  ],
  columns: [
    { id: 'col-plan', name: 'Plan', order: 0 },
    { id: 'col-execute', name: 'Execute', order: 1 },
    { id: 'col-blocked', name: 'Blocked', order: 2 },
    { id: 'col-done', name: 'Done', order: 3 },
  ],
  settings: {
    theme: 'light',
    dataFilePath: './data/tasks.json',
    autoRefreshEnabled: true,
    autoRefreshInterval: 5000,
    language: 'en',
  },
}

const app = express()
app.use(express.json({ limit: '10mb' }))

// --- API routes ---

// GET /api/data — read JSON data file
app.get('/api/data', (req, res) => {
  try {
    const filePath = resolveDataPath()
    if (!existsSync(filePath)) {
      // Return default data if file doesn't exist yet
      return res.json(DEFAULT_DATA)
    }
    const raw = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    res.json(data)
  } catch (err) {
    console.error('Error reading data file:', err.message)
    res.status(500).json({ error: 'Failed to read data file' })
  }
})

// POST /api/data — write JSON data file
app.post('/api/data', (req, res) => {
  try {
    const filePath = resolveDataPath()
    ensureDir(filePath)
    writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8')
    res.json({ ok: true })
  } catch (err) {
    console.error('Error writing data file:', err.message)
    res.status(500).json({ error: 'Failed to write data file' })
  }
})

// GET /api/config — return current config
app.get('/api/config', (req, res) => {
  try {
    const config = readConfig()
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' })
  }
})

// POST /api/config — update config (dataFilePath)
app.post('/api/config', (req, res) => {
  try {
    const config = readConfig()
    const newConfig = { ...config, ...req.body }
    writeConfig(newConfig)

    // Create default data file at new path if it doesn't exist
    const filePath = newConfig.dataFilePath || DEFAULT_DATA_PATH
    let resolved
    if (filePath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(filePath) || filePath.startsWith('\\\\')) {
      resolved = filePath
    } else {
      resolved = resolve(__dirname, filePath)
    }
    if (!existsSync(resolved)) {
      ensureDir(resolved)
      writeFileSync(resolved, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8')
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Error writing config:', err.message)
    res.status(500).json({ error: 'Failed to write config' })
  }
})

// --- Static files & SPA fallback ---
const distPath = resolve(__dirname, 'dist')
app.use(express.static(distPath))

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(resolve(distPath, 'index.html'))
})

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  const config = readConfig()
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Data file: ${config.dataFilePath}`)
  console.log(`LAN access: http://0.0.0.0:${PORT}`)
})
