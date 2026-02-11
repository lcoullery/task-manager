import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'
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
