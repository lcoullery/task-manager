/**
 * Database Initialization
 *
 * This file:
 * 1. Connects to the SQLite database
 * 2. Creates all tables if they don't exist
 * 3. Exports the database connection for use in other files
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Get database path from environment variable or use default
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/taskmanager.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`✓ Created data directory: ${dataDir}`);
}

// Connect to database
// Options:
// - verbose: Log SQL queries (useful for debugging)
// - fileMustExist: false (create if doesn't exist)
const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable foreign key constraints (important for data integrity!)
// This ensures you can't delete a user if they have tasks, for example
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
// WAL = Write-Ahead Logging (multiple readers, one writer)
db.pragma('journal_mode = WAL');

console.log(`✓ Connected to database: ${DB_PATH}`);

/**
 * Initialize database schema
 * Reads schema.sql and executes it
 */
function initializeSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema SQL
  // This creates all tables, indexes, etc.
  db.exec(schema);

  console.log('✓ Database schema initialized');
}

/**
 * Check if database is initialized (has tables)
 */
function isDatabaseInitialized() {
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM sqlite_master
    WHERE type='table' AND name='users'
  `).get();

  return result.count > 0;
}

/**
 * Get database statistics
 * Useful for debugging and monitoring
 */
function getDatabaseStats() {
  const tables = [
    'users',
    'refresh_tokens',
    'user_invitations',
    'profiles',
    'tasks',
    'labels',
    'comments',
    'columns',
    'connections'
  ];

  const stats = {};

  for (const table of tables) {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    stats[table] = result.count;
  }

  return stats;
}

/**
 * Close database connection
 * Call this when shutting down the server
 */
function closeDatabase() {
  db.close();
  console.log('✓ Database connection closed');
}

// Always run schema to ensure new tables are created
// (CREATE TABLE IF NOT EXISTS is safe to run multiple times)
initializeSchema();

// Add new columns to notebooks if they don't exist (safe migration)
try { db.exec('ALTER TABLE notebooks ADD COLUMN project_id TEXT REFERENCES notebook_projects(id) ON DELETE CASCADE'); } catch (e) {}
try { db.exec('ALTER TABLE notebooks ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_notebooks_project_id ON notebooks(project_id)'); } catch (e) {}
try { db.exec('ALTER TABLE notebooks ADD COLUMN folder_id TEXT REFERENCES notebook_folders(id) ON DELETE SET NULL'); } catch (e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_notebooks_folder_id ON notebooks(folder_id)'); } catch (e) {}
try { db.exec('ALTER TABLE notebook_projects ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE bug_reports ADD COLUMN route TEXT'); } catch (e) {}

// Export database connection and utilities
module.exports = {
  db,
  initializeSchema,
  isDatabaseInitialized,
  getDatabaseStats,
  closeDatabase
};
