/**
 * Task Manager Server with JWT Authentication
 *
 * This server provides:
 * - JWT-based authentication
 * - User management (admin only)
 * - SQLite database storage
 * - Legacy file-based storage (during migration)
 * - Email invitations
 * - Rate limiting & security
 */

const express = require('express');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { dirname, resolve, join } = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger.cjs');

// Load environment variables
dotenv.config();

// __dirname is automatically available in CommonJS

// ============================================================================
// ENVIRONMENT & CONFIGURATION
// ============================================================================

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || '4173', 10);
const HOST = process.env.HOST || '0.0.0.0';

const CONFIG_PATH = resolve(__dirname, 'config.json');
const DEFAULT_DATA_PATH = './data/tasks.json';
const DEFAULT_BUG_REPORT_PATH = './data/bugReports.json';

// Check if SQLite database exists (migration status)
const DATABASE_PATH = process.env.DATABASE_PATH || resolve(__dirname, 'data/taskmanager.db');
const IS_MIGRATED = existsSync(DATABASE_PATH);

console.log(`🗄️  Database migrated: ${IS_MIGRATED ? 'YES' : 'NO'}`);
console.log(`   Database path: ${DATABASE_PATH}`);

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db = null;

if (IS_MIGRATED) {
  // Initialize database connection
  const { db: dbConnection, closeDatabase } = require('./db/init.cjs');
  db = dbConnection;

  // Initialize email service
  const { initializeEmailService } = require('./utils/email.cjs');
  initializeEmailService();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down...');
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n⏹️  Shutting down...');
    closeDatabase();
    process.exit(0);
  });
}

// ============================================================================
// HELPER FUNCTIONS (Legacy file-based storage)
// ============================================================================

function readConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } else {
      const defaultConfig = {
        dataFilePath: DEFAULT_DATA_PATH,
        bugReportFilePath: DEFAULT_BUG_REPORT_PATH
      };

      const dataDir = resolve(__dirname, 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      logger.info('Created config.json with default paths');

      return defaultConfig;
    }
  } catch (err) {
    logger.error('Error reading config.json:', err.message);
  }
  return { dataFilePath: DEFAULT_DATA_PATH };
}

function writeConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function convertWindowsPathToWSL(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return filePath;
  }

  const isLinux = process.platform === 'linux';

  if (!isLinux) {
    return filePath.replace(/\\/g, '/');
  }

  const windowsPathMatch = filePath.match(/^([A-Za-z]):[\\/](.*)/);

  if (windowsPathMatch) {
    const driveLetter = windowsPathMatch[1].toLowerCase();
    const restOfPath = windowsPathMatch[2];
    return `/mnt/${driveLetter}/${restOfPath}`;
  }

  return filePath;
}

function resolveDataPath() {
  const config = readConfig();
  let filePath = config.dataFilePath || DEFAULT_DATA_PATH;
  filePath = filePath.trim();
  filePath = convertWindowsPathToWSL(filePath);

  if (filePath.startsWith('/') || /^[A-Za-z]:\//.test(filePath)) {
    return filePath;
  }

  return resolve(__dirname, filePath);
}

function resolveBugReportPath(configPath) {
  if (!configPath) {
    return resolve(__dirname, 'data', 'bugReports.json');
  }

  let filePath = configPath.trim();
  filePath = convertWindowsPathToWSL(filePath);

  if (filePath.startsWith('/') || /^[A-Za-z]:\//.test(filePath)) {
    return filePath;
  }

  return resolve(__dirname, filePath);
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

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
    { id: 'col-done', name: 'Done', order: 3, autoArchive: true },
  ],
  settings: {
    theme: 'light',
    dataFilePath: './data/tasks.json',
    bugReportFilePath: './data/bugReports.json',
    bugReportEnabled: true,
    autoRefreshEnabled: true,
    autoRefreshInterval: 3000,
    language: 'en',
    maxHoursPerDay: 8,
  },
};

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
app.use(express.json({ limit: '10mb' }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000', 10),
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  const dataFileExists = existsSync(resolveDataPath());
  res.status(dataFileExists ? 200 : 503).json({
    status: dataFileExists ? 'healthy' : 'unhealthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    dataFileExists,
    databaseMigrated: IS_MIGRATED,
  });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
    res.json({
      version: packageJson.version,
      name: packageJson.name
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read version' });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES (if migrated to SQLite)
// ============================================================================

if (IS_MIGRATED) {
  const authController = require('./controllers/authController.cjs');
  const { authRateLimiter } = require('./middleware/jwt.cjs');

  // Public auth endpoints (no JWT required, but rate limited)
  app.post('/api/auth/login', authRateLimiter, authController.login);
  app.post('/api/auth/accept-invite', authRateLimiter, authController.acceptInvite);
  app.post('/api/auth/first-admin', authController.createFirstAdmin); // Only works if no users exist

  // Authenticated auth endpoints (JWT required)
  const { authenticateJWT } = require('./middleware/jwt.cjs');
  app.get('/api/auth/me', authenticateJWT, authController.getCurrentUser);
  app.post('/api/auth/refresh', authController.refresh);
  app.post('/api/auth/logout', authenticateJWT, authController.logout);
  app.post('/api/auth/logout-all', authenticateJWT, authController.logoutAll);
  app.put('/api/auth/profile', authenticateJWT, authController.updateProfile);
  app.put('/api/auth/password', authenticateJWT, authController.changePassword);

  console.log('✓ Authentication routes enabled');
}

// ============================================================================
// USER MANAGEMENT ROUTES (Admin only, if migrated)
// ============================================================================

if (IS_MIGRATED) {
  const userController = require('./controllers/userController.cjs');
  const { authenticateJWT, requireAdmin } = require('./middleware/jwt.cjs');

  // User management (admin only)
  app.get('/api/users', authenticateJWT, requireAdmin, userController.listUsers);
  app.post('/api/users/invite', authenticateJWT, requireAdmin, userController.inviteUser);
  app.get('/api/users/invitations', authenticateJWT, requireAdmin, userController.listInvitations);
  app.put('/api/users/:id', authenticateJWT, requireAdmin, userController.updateUserById);
  app.delete('/api/users/:id', authenticateJWT, requireAdmin, userController.deleteUserById);

  console.log('✓ User management routes enabled');
}

// ============================================================================
// DATA ROUTES
// ============================================================================

if (IS_MIGRATED) {
  // Use database controllers
  const { authenticateJWT } = require('./middleware/jwt.cjs');
  const dataController = require('./controllers/dataController.cjs');

  // Middleware to attach database to request
  app.use('/api/data', (req, res, next) => {
    req.db = db;
    next();
  });

  // Authenticated data endpoints
  app.get('/api/data', authenticateJWT, dataController.getData);
  app.post('/api/data', authenticateJWT, dataController.saveData);

  console.log('✓ Database data endpoints enabled');
} else {
  // Legacy file-based storage (before migration)
  const { createAuthMiddleware } = require('./middleware/auth.js');
  const auth = createAuthMiddleware();

  // Apply old basic auth
  app.use('/api', auth);

  // GET /api/data — read JSON data file
  app.get('/api/data', (req, res) => {
    try {
      const filePath = resolveDataPath();
      if (!existsSync(filePath)) {
        return res.json(DEFAULT_DATA);
      }
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      res.json(data);
    } catch (err) {
      logger.error('Error reading data file:', err.message);
      res.status(500).json({ error: 'Failed to read data file' });
    }
  });

  // POST /api/data — write JSON data file
  app.post('/api/data', (req, res) => {
    try {
      const filePath = resolveDataPath();
      ensureDir(filePath);
      writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
      res.json({ ok: true });
    } catch (err) {
      logger.error('Error writing data file:', err.message);
      res.status(500).json({ error: 'Failed to write data file' });
    }
  });
}

// ============================================================================
// CONFIG ROUTES (Legacy)
// ============================================================================

app.get('/api/config', (req, res) => {
  try {
    const config = readConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const config = readConfig();

    if (req.body.dataFilePath) {
      let filePath = req.body.dataFilePath.trim();
      if (!filePath) {
        return res.status(400).json({ error: 'Path cannot be empty' });
      }
      filePath = filePath.replace(/\\/g, '/');
      filePath = convertWindowsPathToWSL(filePath);
      req.body.dataFilePath = filePath;
    }

    if (req.body.bugReportFilePath) {
      let filePath = req.body.bugReportFilePath.trim();
      if (!filePath) {
        return res.status(400).json({ error: 'Bug report path cannot be empty' });
      }
      filePath = filePath.replace(/\\/g, '/');
      filePath = convertWindowsPathToWSL(filePath);
      req.body.bugReportFilePath = filePath;
    }

    const newConfig = { ...config, ...req.body };
    writeConfig(newConfig);

    const filePath = newConfig.dataFilePath || DEFAULT_DATA_PATH;
    let resolved;

    if (filePath.startsWith('/') || /^[A-Za-z]:\//.test(filePath)) {
      resolved = filePath;
    } else {
      resolved = resolve(__dirname, filePath);
    }

    logger.info(`Saving to path: ${resolved}`);

    try {
      if (!existsSync(resolved)) {
        ensureDir(resolved);
        writeFileSync(resolved, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
        logger.info(`Created new data file at: ${resolved}`);
      }
    } catch (fileErr) {
      logger.error('Error creating data file:', fileErr);
      return res.status(500).json({
        error: `Failed to create file: ${fileErr.message}`,
        details: `Path: ${resolved}, Code: ${fileErr.code}`
      });
    }

    res.json({ ok: true, path: resolved });
  } catch (err) {
    logger.error('Error writing config:', err);
    res.status(500).json({
      error: `Failed to save config: ${err.message}`
    });
  }
});

// ============================================================================
// BUG REPORT ROUTES (Legacy)
// ============================================================================

app.get('/api/bug-reports', (req, res) => {
  try {
    const config = readConfig();
    const bugReportPath = resolveBugReportPath(config.bugReportFilePath || './data/bugReports.json');

    if (!existsSync(bugReportPath)) {
      const dir = dirname(bugReportPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(bugReportPath, JSON.stringify({ bugReports: [] }, null, 2), 'utf-8');
    }

    const data = JSON.parse(readFileSync(bugReportPath, 'utf-8'));
    res.json(data);
  } catch (err) {
    logger.error('Error reading bug reports:', err.message);
    res.status(500).json({ error: 'Failed to read bug reports' });
  }
});

app.post('/api/bug-reports', (req, res) => {
  try {
    const config = readConfig();
    const bugReportPath = resolveBugReportPath(config.bugReportFilePath || './data/bugReports.json');
    const { bugReport } = req.body;

    if (!bugReport || !bugReport.profileId || !bugReport.message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let data = { bugReports: [] };
    if (existsSync(bugReportPath)) {
      data = JSON.parse(readFileSync(bugReportPath, 'utf-8'));
    } else {
      const dir = dirname(bugReportPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    data.bugReports.push(bugReport);
    writeFileSync(bugReportPath, JSON.stringify(data, null, 2), 'utf-8');

    res.json({ success: true });
  } catch (err) {
    logger.error('Error saving bug report:', err.message);
    res.status(500).json({ error: 'Failed to save bug report' });
  }
});

// ============================================================================
// STATIC FILES & SPA FALLBACK
// ============================================================================

const distPath = resolve(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(resolve(distPath, 'index.html'));
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, HOST, () => {
  const config = readConfig();
  logger.info(`Task Manager server started in ${NODE_ENV} mode`);
  logger.info(`Server running at http://localhost:${PORT}`);
  logger.info(`Data file: ${config.dataFilePath}`);
  logger.info(`Network access: http://${HOST}:${PORT}`);

  if (IS_MIGRATED) {
    logger.info('✓ Using SQLite database with JWT authentication');
  } else {
    logger.warn('⚠️  Using legacy file-based storage. Run migration script to enable authentication.');
    logger.warn('   Command: node scripts/migrate-to-sqlite.js');
  }
});
