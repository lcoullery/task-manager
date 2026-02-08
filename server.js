import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, rmSync, readdirSync, cpSync } from 'fs'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import AdmZip from 'adm-zip'
import dotenv from 'dotenv'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { createAuthMiddleware } from './middleware/auth.js'
import logger from './utils/logger.js'

// Load environment variables from .env file
dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============================================
// STARTUP UPDATE APPLICATION
// ============================================
// Check for pending updates and apply them before starting the server

function applyPendingUpdate() {
  const pendingUpdatePath = resolve(__dirname, '.update-pending.json')
  const updatesDir = resolve(__dirname, '.updates')
  const backupDir = resolve(__dirname, '.backup')

  // Check if there's a pending update
  if (!existsSync(pendingUpdatePath)) {
    return { applied: false }
  }

  logger.info('Found pending update, applying...')

  let pendingUpdate
  try {
    pendingUpdate = JSON.parse(readFileSync(pendingUpdatePath, 'utf-8'))
  } catch (err) {
    logger.error('Failed to read pending update info:', err.message)
    unlinkSync(pendingUpdatePath)
    return { applied: false, error: 'Failed to read pending update info' }
  }

  const { version, zipPath } = pendingUpdate

  // Verify zip file exists
  if (!zipPath || !existsSync(zipPath)) {
    logger.error('Update zip file not found:', zipPath)
    unlinkSync(pendingUpdatePath)
    return { applied: false, error: 'Update zip file not found' }
  }

  logger.info(`Applying update to version ${version}...`)

  // Files/directories to preserve (not overwrite)
  const preserveList = ['data', 'config.json', 'node_modules', '.updates', '.backup', '.update-pending.json', '.git', '.gitignore']

  // Files/directories to update
  const updateList = ['server.js', 'package.json', 'package-lock.json', 'src', 'dist', 'public', 'index.html', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js', 'locales']

  try {
    // Step 1: Create backup
    logger.info('Creating backup...')
    if (existsSync(backupDir)) {
      rmSync(backupDir, { recursive: true, force: true })
    }
    mkdirSync(backupDir, { recursive: true })

    // Backup files that will be updated
    for (const item of updateList) {
      const itemPath = resolve(__dirname, item)
      const backupPath = resolve(backupDir, item)
      if (existsSync(itemPath)) {
        cpSync(itemPath, backupPath, { recursive: true })
      }
    }
    logger.info('Backup created successfully')

    // Step 2: Extract zip
    logger.info('Extracting update...')
    const extractDir = resolve(updatesDir, 'extracted')
    if (existsSync(extractDir)) {
      rmSync(extractDir, { recursive: true, force: true })
    }
    mkdirSync(extractDir, { recursive: true })

    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractDir, true)

    // Step 3: Find the root directory inside the extracted zip
    // GitHub zips have a nested structure like: lcoullery-task-manager-abc123/
    const extractedContents = readdirSync(extractDir)
    let sourceDir = extractDir

    if (extractedContents.length === 1) {
      const potentialRoot = resolve(extractDir, extractedContents[0])
      // Check if it's a directory containing project files
      if (existsSync(resolve(potentialRoot, 'package.json')) || existsSync(resolve(potentialRoot, 'server.js'))) {
        sourceDir = potentialRoot
      }
    }

    logger.info('Update extracted, copying files...')

    // Step 4: Copy updated files to project root
    const sourceContents = readdirSync(sourceDir)
    for (const item of sourceContents) {
      // Skip preserved items
      if (preserveList.includes(item)) {
        continue
      }

      const sourcePath = resolve(sourceDir, item)
      const destPath = resolve(__dirname, item)

      // Remove existing file/directory
      if (existsSync(destPath)) {
        rmSync(destPath, { recursive: true, force: true })
      }

      // Copy new file/directory
      cpSync(sourcePath, destPath, { recursive: true })
    }

    logger.info('Files updated successfully')

    // Step 5: Run npm install if package.json was updated
    if (existsSync(resolve(sourceDir, 'package.json'))) {
      logger.info('Running npm install...')
      try {
        execSync('npm install', { cwd: __dirname, stdio: 'inherit' })
        logger.info('npm install completed')
      } catch (err) {
        logger.error('npm install failed, but continuing with update...')
      }
    }

    // Step 6: Run build if needed
    logger.info('Running build...')
    try {
      execSync('npm run build', { cwd: __dirname, stdio: 'inherit' })
      logger.info('Build completed')
    } catch (err) {
      logger.error('Build failed:', err.message)
      // Rollback
      logger.info('Rolling back update...')
      rollbackUpdate(backupDir, updateList)
      throw new Error('Build failed, update rolled back')
    }

    // Step 7: Cleanup and mark as completed
    logger.info('Cleaning up...')

    // Create completed update marker for the frontend toast
    const completedUpdatePath = resolve(__dirname, '.update-completed.json')
    writeFileSync(completedUpdatePath, JSON.stringify({ version, appliedAt: new Date().toISOString() }), 'utf-8')

    unlinkSync(pendingUpdatePath)
    rmSync(updatesDir, { recursive: true, force: true })
    rmSync(backupDir, { recursive: true, force: true })

    logger.info(`Update to version ${version} applied successfully!`)
    return { applied: true, version }

  } catch (err) {
    logger.error('Update failed:', err.message)

    // Attempt rollback
    if (existsSync(backupDir)) {
      logger.info('Attempting rollback...')
      rollbackUpdate(backupDir, updateList)
    }

    // Cleanup pending update flag
    if (existsSync(pendingUpdatePath)) {
      unlinkSync(pendingUpdatePath)
    }

    return { applied: false, error: err.message }
  }
}

function rollbackUpdate(backupDir, updateList) {
  try {
    for (const item of updateList) {
      const backupPath = resolve(backupDir, item)
      const destPath = resolve(__dirname, item)

      if (existsSync(backupPath)) {
        // Remove failed update file
        if (existsSync(destPath)) {
          rmSync(destPath, { recursive: true, force: true })
        }
        // Restore backup
        cpSync(backupPath, destPath, { recursive: true })
      }
    }
    logger.info('Rollback completed')
  } catch (err) {
    logger.error('Rollback failed:', err.message)
  }
}

// Apply pending update at startup
const updateResult = applyPendingUpdate()
if (updateResult.applied) {
  logger.info(`Server starting with newly applied update to version ${updateResult.version}`)
}

// ============================================
// END STARTUP UPDATE APPLICATION
// ============================================

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development'
const PORT = parseInt(process.env.PORT || '4173', 10)
const HOST = process.env.HOST || '0.0.0.0'

const CONFIG_PATH = resolve(__dirname, 'config.json')
const DEFAULT_DATA_PATH = './data/tasks.json'
const DEFAULT_BUG_REPORT_PATH = './data/bugReports.json'

// Read config from disk
function readConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    } else {
      // First run: create config.json with default values
      const defaultConfig = {
        dataFilePath: DEFAULT_DATA_PATH,
        bugReportFilePath: DEFAULT_BUG_REPORT_PATH
      }

      // Ensure ./data directory exists
      const dataDir = resolve(__dirname, 'data')
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true })
      }

      // Create config.json
      writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8')
      logger.info('Created config.json with default paths')

      return defaultConfig
    }
  } catch (err) {
    logger.error('Error reading config.json:', err.message)
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

// Resolve bug report file path (same logic as resolveDataPath)
function resolveBugReportPath(configPath) {
  if (!configPath) {
    return resolve(__dirname, 'data', 'bugReports.json')
  }

  let filePath = configPath.trim()

  // Convert Windows paths to WSL format if needed
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
    bugReportFilePath: './data/bugReports.json',
    bugReportEnabled: true,
    autoRefreshEnabled: true,
    autoRefreshInterval: 5000,
    autoUpdateEnabled: false,
    updateCheckInterval: 86400000,
    language: 'en',
  },
}

const app = express()
app.use(express.json({ limit: '10mb' }))

// --- Security middleware ---
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api', apiLimiter)

// --- Health check (public, no auth required) ---
app.get('/api/health', (req, res) => {
  const dataFileExists = existsSync(resolveDataPath())
  res.status(dataFileExists ? 200 : 503).json({
    status: dataFileExists ? 'healthy' : 'unhealthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    dataFileExists,
  })
})

// --- Authentication middleware ---
const auth = createAuthMiddleware()
app.use('/api', auth)

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
    logger.error('Error reading data file:', err.message)
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
    logger.error('Error writing data file:', err.message)
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

    // Normalize bugReportFilePath if provided
    if (req.body.bugReportFilePath) {
      let filePath = req.body.bugReportFilePath.trim()
      if (!filePath) {
        return res.status(400).json({ error: 'Bug report path cannot be empty' })
      }

      // Normalize path separators to forward slashes
      filePath = filePath.replace(/\\/g, '/')

      // Convert Windows paths to WSL format
      filePath = convertWindowsPathToWSL(filePath)

      req.body.bugReportFilePath = filePath
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
    logger.info(`Saving to path: ${resolved}`)

    try {
      if (!existsSync(resolved)) {
        ensureDir(resolved)
        writeFileSync(resolved, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8')
        logger.info(`Created new data file at: ${resolved}`)
      }
    } catch (fileErr) {
      logger.error('Error creating data file:', fileErr)
      return res.status(500).json({
        error: `Failed to create file: ${fileErr.message}`,
        details: `Path: ${resolved}, Code: ${fileErr.code}`
      })
    }

    res.json({ ok: true, path: resolved })
  } catch (err) {
    logger.error('Error writing config:', err)
    res.status(500).json({
      error: `Failed to save config: ${err.message}`
    })
  }
})

// GET /api/bug-reports — read bug reports
app.get('/api/bug-reports', (req, res) => {
  try {
    const config = readConfig()
    const bugReportPath = resolveBugReportPath(config.bugReportFilePath || './data/bugReports.json')

    if (!existsSync(bugReportPath)) {
      // Create empty file if doesn't exist
      const dir = dirname(bugReportPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(bugReportPath, JSON.stringify({ bugReports: [] }, null, 2), 'utf-8')
    }

    const data = JSON.parse(readFileSync(bugReportPath, 'utf-8'))
    res.json(data)
  } catch (err) {
    logger.error('Error reading bug reports:', err.message)
    res.status(500).json({ error: 'Failed to read bug reports' })
  }
})

// POST /api/bug-reports — append new bug report
app.post('/api/bug-reports', (req, res) => {
  try {
    const config = readConfig()
    const bugReportPath = resolveBugReportPath(config.bugReportFilePath || './data/bugReports.json')
    const { bugReport } = req.body

    if (!bugReport || !bugReport.profileId || !bugReport.message) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Read existing data
    let data = { bugReports: [] }
    if (existsSync(bugReportPath)) {
      data = JSON.parse(readFileSync(bugReportPath, 'utf-8'))
    } else {
      const dir = dirname(bugReportPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }

    // Append new report
    data.bugReports.push(bugReport)

    // Write back to file
    writeFileSync(bugReportPath, JSON.stringify(data, null, 2), 'utf-8')

    res.json({ success: true })
  } catch (err) {
    logger.error('Error saving bug report:', err.message)
    res.status(500).json({ error: 'Failed to save bug report' })
  }
})

// --- Version endpoint ---

// GET /api/version — return current version information
app.get('/api/version', (req, res) => {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
    res.json({
      version: packageJson.version,
      name: packageJson.name
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to read version' })
  }
})

// --- Update API endpoints ---

// GET /api/update/check — check for new releases on GitHub
// Helper function for semantic version comparison
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

app.get('/api/update/check', async (req, res) => {
  try {
    const OFFICIAL_REPO = 'lcoullery/task-manager'
    const response = await fetch(`https://api.github.com/repos/${OFFICIAL_REPO}/releases/latest`)

    // Handle 404 - no releases available (not an error)
    if (response.status === 404) {
      const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
      return res.json({
        currentVersion: packageJson.version,
        latestVersion: packageJson.version,
        hasUpdate: false,
        noReleasesAvailable: true
      })
    }

    // Handle rate limiting
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
      if (rateLimitRemaining === '0') {
        return res.status(429).json({
          error: 'GitHub API rate limit exceeded. Please try again later.'
        })
      }
    }

    // Other errors
    if (!response.ok) {
      return res.status(response.status).json({
        error: `GitHub API error: ${response.status} ${response.statusText}`
      })
    }

    const release = await response.json()
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
    const currentVersion = packageJson.version
    const latestVersion = release.tag_name.replace(/^v/, '')

    // Use semantic version comparison
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    res.json({
      currentVersion,
      latestVersion,
      hasUpdate,
      downloadUrl: (release.assets.find(a => a.name.includes('.zip')) || release.assets.find(a => a.name.includes('.tar.gz')))?.browser_download_url || release.zipball_url,
      commitSha: release.target_commitish,
      releaseNotes: release.body || '',
      releaseName: release.name || `v${latestVersion}`,
    })
  } catch (err) {
    logger.error('Error checking for updates:', err.message)
    res.status(500).json({ error: `Server error: ${err.message}` })
  }
})

// Download progress tracking: version -> { progress, total, downloaded, status }
const downloadProgress = new Map()

// GET /api/update/progress — SSE endpoint for download progress
app.get('/api/update/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const sendProgress = () => {
    const progress = Array.from(downloadProgress.values())[0]
    if (progress) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`)
    }
  }

  const interval = setInterval(sendProgress, 100)

  req.on('close', () => {
    clearInterval(interval)
  })
})

// POST /api/update/download — download update from GitHub
app.post('/api/update/download', async (req, res) => {
  try {
    const { downloadUrl, commitSha, version } = req.body

    if (!downloadUrl || !commitSha || !version) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Security check: verify URL is from official GitHub
    if (!downloadUrl.includes('lcoullery/task-manager')) {
      return res.status(400).json({ error: 'Download URL must be from official repository' })
    }

    // Create updates directory
    const updatesDir = resolve(__dirname, '.updates')
    if (!existsSync(updatesDir)) {
      mkdirSync(updatesDir, { recursive: true })
    }

    const zipPath = resolve(updatesDir, `update-${version}.zip`)

    // Stream download with progress tracking
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to download update' })
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0', 10)
    let downloadedSize = 0

    downloadProgress.set(version, {
      version,
      progress: 0,
      total: totalSize,
      downloaded: 0,
      status: 'downloading',
    })

    const chunks = []
    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      downloadedSize += value.length

      const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0
      downloadProgress.set(version, {
        version,
        progress,
        total: totalSize,
        downloaded: downloadedSize,
        status: 'downloading',
      })
    }

    const buffer = Buffer.concat(chunks)
    writeFileSync(zipPath, buffer)

    // Mark as complete
    downloadProgress.set(version, {
      version,
      progress: 100,
      total: totalSize,
      downloaded: totalSize,
      status: 'complete',
    })

    // Create pending update flag
    const pendingUpdatePath = resolve(__dirname, '.update-pending.json')
    writeFileSync(pendingUpdatePath, JSON.stringify({
      version,
      commitSha,
      downloadedAt: new Date().toISOString(),
      zipPath,
    }, null, 2), 'utf-8')

    res.json({ success: true, version })

    // Clean up progress tracking after 5 seconds
    setTimeout(() => downloadProgress.delete(version), 5000)
  } catch (err) {
    logger.error('Error downloading update:', err.message)
    res.status(500).json({ error: 'Failed to download update' })
  }
})

// POST /api/update/apply — trigger update and graceful shutdown
app.post('/api/update/apply', (req, res) => {
  try {
    res.json({ ok: true })

    // Graceful shutdown with 1 second delay to allow response to complete
    setTimeout(() => {
      logger.info('Shutting down for update...')
      process.exit(0)
    }, 1000)
  } catch (err) {
    logger.error('Error applying update:', err.message)
    res.status(500).json({ error: 'Failed to apply update' })
  }
})

// GET /api/update/status — check if update was just completed
app.get('/api/update/status', (req, res) => {
  try {
    // Check for completed update (shown as toast on frontend)
    const completedUpdatePath = resolve(__dirname, '.update-completed.json')
    if (existsSync(completedUpdatePath)) {
      const completedUpdate = JSON.parse(readFileSync(completedUpdatePath, 'utf-8'))
      return res.json({ pending: true, ...completedUpdate })
    }
    res.json({ pending: false })
  } catch (err) {
    logger.error('Error checking update status:', err.message)
    res.status(500).json({ error: 'Failed to check update status' })
  }
})

// POST /api/update/clear-status — clear completed update flag
app.post('/api/update/clear-status', (req, res) => {
  try {
    const completedUpdatePath = resolve(__dirname, '.update-completed.json')
    if (existsSync(completedUpdatePath)) {
      unlinkSync(completedUpdatePath)
      logger.info('Cleared completed update flag')
    }
    res.json({ success: true })
  } catch (err) {
    logger.error('Error clearing update status:', err.message)
    res.status(500).json({ error: 'Failed to clear update status' })
  }
})

// POST /api/update/cancel — Cancel ongoing download
app.post('/api/update/cancel', (req, res) => {
  try {
    const version = req.body?.version || 'unknown'

    // Clear download progress tracking
    downloadProgress.delete(version)

    // Clean up .updates directory
    const updatesDir = resolve(__dirname, '.updates')
    if (existsSync(updatesDir)) {
      try {
        rmSync(updatesDir, { recursive: true, force: true })
      } catch (err) {
        logger.error('Failed to remove .updates directory:', err.message)
      }
    }

    logger.info(`Download cancelled for version ${version}`)
    res.json({ success: true })
  } catch (err) {
    logger.error('Error cancelling download:', err.message)
    res.status(500).json({ error: 'Failed to cancel download' })
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
app.listen(PORT, HOST, () => {
  const config = readConfig()
  logger.info(`Task Manager server started in ${NODE_ENV} mode`)
  logger.info(`Server running at http://localhost:${PORT}`)
  logger.info(`Data file: ${config.dataFilePath}`)
  logger.info(`Network access: http://${HOST}:${PORT}`)
})
