import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

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

// Convert Windows paths to WSL paths ONLY when running on Linux/WSL
function convertWindowsPathToWSL(filePath) {
  // Safety check
  if (!filePath || typeof filePath !== 'string') {
    return filePath
  }

  // Only convert paths on Linux/WSL, not on native Windows
  const isLinux = process.platform === 'linux'

  if (!isLinux) {
    // On Windows or Mac, just normalize backslashes to forward slashes
    return filePath.replace(/\\/g, '/')
  }

  // On Linux/WSL: Check if this is a Windows absolute path (C:\... or C:/...)
  const windowsPathMatch = filePath.match(/^([A-Za-z]):[\\/](.*)/)

  if (windowsPathMatch) {
    const driveLetter = windowsPathMatch[1].toLowerCase()
    const restOfPath = windowsPathMatch[2]
    // Convert to WSL mount path: C:\Users\... → /mnt/c/Users/...
    return `/mnt/${driveLetter}/${restOfPath}`
  }

  // Not a Windows path, return as-is
  return filePath
}

// Resolve the data file path (relative to project root)
function resolveDataPath() {
  const config = readConfig()
  let filePath = config.dataFilePath || DEFAULT_DATA_PATH

  // Trim whitespace
  filePath = filePath.trim()

  // Convert Windows paths to WSL format if needed (handles backslash normalization too)
  filePath = convertWindowsPathToWSL(filePath)

  // If absolute path, use as-is
  if (filePath.startsWith('/') || /^[A-Za-z]:\//.test(filePath)) {
    return filePath
  }

  // Otherwise resolve relative to project root
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
    autoUpdateEnabled: false,
    updateCheckInterval: 86400000,
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

    // Normalize dataFilePath if provided
    if (req.body.dataFilePath) {
      let filePath = req.body.dataFilePath.trim()
      if (!filePath) {
        return res.status(400).json({ error: 'Path cannot be empty' })
      }

      // Normalize path separators to forward slashes
      filePath = filePath.replace(/\\/g, '/')

      // Convert Windows paths to WSL format
      filePath = convertWindowsPathToWSL(filePath)

      req.body.dataFilePath = filePath
    }

    const newConfig = { ...config, ...req.body }
    writeConfig(newConfig)

    // Create default data file at new path if it doesn't exist
    const filePath = newConfig.dataFilePath || DEFAULT_DATA_PATH
    let resolved

    // Resolve the path - check for absolute paths (Unix / or Windows C:/)
    if (filePath.startsWith('/') || /^[A-Za-z]:\//.test(filePath)) {
      resolved = filePath
    } else {
      resolved = resolve(__dirname, filePath)
    }

    // Log the resolved path for debugging
    console.log(`Saving to path: ${resolved}`)

    try {
      if (!existsSync(resolved)) {
        ensureDir(resolved)
        writeFileSync(resolved, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8')
        console.log(`Created new data file at: ${resolved}`)
      }
    } catch (fileErr) {
      console.error('Error creating data file:', fileErr)
      return res.status(500).json({
        error: `Failed to create file: ${fileErr.message}`,
        details: `Path: ${resolved}, Code: ${fileErr.code}`
      })
    }

    res.json({ ok: true, path: resolved })
  } catch (err) {
    console.error('Error writing config:', err)
    res.status(500).json({
      error: `Failed to save config: ${err.message}`
    })
  }
})

// --- Update API endpoints ---

// GET /api/update/check — check for new releases on GitHub
app.get('/api/update/check', async (req, res) => {
  try {
    const OFFICIAL_REPO = 'lcoullery/task-manager'
    const response = await fetch(`https://api.github.com/repos/${OFFICIAL_REPO}/releases/latest`)

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch releases' })
    }

    const release = await response.json()
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
    const currentVersion = packageJson.version
    const latestVersion = release.tag_name.replace(/^v/, '')

    // Simple version comparison (assumes semantic versioning)
    const hasUpdate = latestVersion > currentVersion

    res.json({
      currentVersion,
      latestVersion,
      hasUpdate,
      downloadUrl: release.assets.find(a => a.name.endsWith('.zip'))?.browser_download_url,
      commitSha: release.target_commitish,
      releaseNotes: release.body || '',
      releaseName: release.name || `v${latestVersion}`,
    })
  } catch (err) {
    console.error('Error checking for updates:', err.message)
    res.status(500).json({ error: 'Failed to check for updates' })
  }
})

// POST /api/update/download — download update from GitHub
app.post('/api/update/download', async (req, res) => {
  try {
    const { downloadUrl, commitSha, version } = req.body

    if (!downloadUrl || !commitSha || !version) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Security check: verify URL is from official GitHub
    if (!downloadUrl.includes('github.com/lcoullery/task-manager')) {
      return res.status(400).json({ error: 'Download URL must be from official repository' })
    }

    // Create updates directory
    const updatesDir = resolve(__dirname, '.updates')
    if (!existsSync(updatesDir)) {
      mkdirSync(updatesDir, { recursive: true })
    }

    const zipPath = resolve(updatesDir, `update-${version}.zip`)

    // Download the ZIP file
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to download update' })
    }

    const buffer = await response.arrayBuffer()
    writeFileSync(zipPath, Buffer.from(buffer))

    // Create pending update flag
    const pendingUpdatePath = resolve(__dirname, '.update-pending.json')
    writeFileSync(pendingUpdatePath, JSON.stringify({
      version,
      commitSha,
      downloadedAt: new Date().toISOString(),
      zipPath,
    }, null, 2), 'utf-8')

    res.json({ success: true, version })
  } catch (err) {
    console.error('Error downloading update:', err.message)
    res.status(500).json({ error: 'Failed to download update' })
  }
})

// POST /api/update/apply — trigger update and graceful shutdown
app.post('/api/update/apply', (req, res) => {
  try {
    res.json({ ok: true })

    // Graceful shutdown with 1 second delay to allow response to complete
    setTimeout(() => {
      console.log('Shutting down for update...')
      process.exit(0)
    }, 1000)
  } catch (err) {
    console.error('Error applying update:', err.message)
    res.status(500).json({ error: 'Failed to apply update' })
  }
})

// GET /api/update/status — check if update is pending
app.get('/api/update/status', (req, res) => {
  try {
    const pendingUpdatePath = resolve(__dirname, '.update-pending.json')
    if (existsSync(pendingUpdatePath)) {
      const pendingUpdate = JSON.parse(readFileSync(pendingUpdatePath, 'utf-8'))
      return res.json({ pending: true, ...pendingUpdate })
    }
    res.json({ pending: false })
  } catch (err) {
    console.error('Error checking update status:', err.message)
    res.status(500).json({ error: 'Failed to check update status' })
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
