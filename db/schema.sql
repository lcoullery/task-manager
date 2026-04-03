-- Task Manager Database Schema
-- This file defines all tables for the task manager application

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Users table: Stores user accounts for authentication
-- NOTE: Users handle both authentication AND task assignment (profiles merged)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- Unique user ID (UUID)
  email TEXT UNIQUE NOT NULL,             -- Email (used for login)
  password_hash TEXT NOT NULL,            -- Hashed password (never store plain text!)
  role TEXT NOT NULL CHECK(role IN ('admin', 'member')), -- User role
  name TEXT NOT NULL,                     -- Display name (shown in task assignment)
  color TEXT NOT NULL DEFAULT '#3B82F6',  -- Avatar color (hex)
  created_at TEXT NOT NULL,               -- When account was created
  last_login_at TEXT,                     -- Last login timestamp
  is_active INTEGER DEFAULT 1             -- 1 = active, 0 = disabled
);

-- Refresh tokens: Stores long-lived tokens for authentication
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,                    -- Token ID
  user_id TEXT NOT NULL,                  -- Which user owns this token
  token_hash TEXT NOT NULL,               -- Hashed token value
  expires_at TEXT NOT NULL,               -- Expiration timestamp
  created_at TEXT NOT NULL,               -- When token was created
  revoked INTEGER DEFAULT 0,              -- 1 = revoked (logged out)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User invitations: Temporary tokens for inviting new users
CREATE TABLE IF NOT EXISTS user_invitations (
  id TEXT PRIMARY KEY,                    -- Invitation ID
  email TEXT NOT NULL,                    -- Invited user's email
  name TEXT NOT NULL,                     -- Invited user's name
  color TEXT NOT NULL DEFAULT '#3B82F6',  -- Avatar color (hex)
  role TEXT NOT NULL CHECK(role IN ('admin', 'member')), -- Role to assign
  token_hash TEXT NOT NULL,               -- Invite token (sent via email)
  invited_by TEXT NOT NULL,               -- Admin who sent invite
  created_at TEXT NOT NULL,               -- When invite was created
  expires_at TEXT NOT NULL,               -- Expiration (48 hours)
  used INTEGER DEFAULT 0,                 -- 1 = invite accepted
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- PASSWORD RESETS
-- ============================================================================

-- Password Resets: Admin-triggered password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- NOTEBOOKS
-- ============================================================================

-- Notebook Projects: Groups of pages (Personal = private, others = shared)
CREATE TABLE IF NOT EXISTS notebook_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_personal INTEGER NOT NULL DEFAULT 0,   -- 1 = personal project (private, undeletable)
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notebook_projects_user ON notebook_projects(created_by);

-- Notebooks: Rich text pages within a project
CREATE TABLE IF NOT EXISTS notebooks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,                              -- Tiptap JSON stored as TEXT
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'shared')),
  project_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES notebook_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notebooks_created_by ON notebooks(created_by);

-- ============================================================================
-- TASKS
-- ============================================================================

-- Tasks: Main task data
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,                    -- Task ID
  title TEXT NOT NULL,                    -- Task title
  description TEXT,                       -- Task description (markdown)
  status TEXT NOT NULL,                   -- Status (todo, in-progress, done, etc.)
  priority TEXT NOT NULL DEFAULT 'medium', -- Priority (low, medium, high)
  assigned_to TEXT,                       -- User ID (who's assigned)
  start_date TEXT,                        -- Start date (ISO 8601)
  end_date TEXT,                          -- End date (ISO 8601)
  workload_hours REAL DEFAULT 0,          -- Estimated hours
  weekend_task INTEGER DEFAULT 0,         -- 1 = can work on weekends
  archived INTEGER DEFAULT 0,             -- 1 = archived
  order_index INTEGER DEFAULT 0,          -- Order in lists
  created_at TEXT NOT NULL,               -- When task was created
  updated_at TEXT NOT NULL,               -- Last update timestamp
  created_by TEXT,                        -- User who created task
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- LABELS & TAGS
-- ============================================================================

-- Labels: Tags/categories for tasks
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,                    -- Label ID
  name TEXT NOT NULL,                     -- Label name
  color TEXT NOT NULL,                    -- Label color (hex)
  created_at TEXT NOT NULL                -- When label was created
);

-- Task-Label relationship: Many-to-many (tasks can have multiple labels)
CREATE TABLE IF NOT EXISTS task_labels (
  task_id TEXT NOT NULL,                  -- Task ID
  label_id TEXT NOT NULL,                 -- Label ID
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Comments: Task comments/notes
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,                    -- Comment ID
  task_id TEXT NOT NULL,                  -- Which task
  user_id TEXT,                           -- Who wrote it
  content TEXT NOT NULL,                  -- Comment text (markdown)
  created_at TEXT NOT NULL,               -- When comment was created
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- FILE LINKS
-- ============================================================================

-- File links: External files/links attached to tasks
CREATE TABLE IF NOT EXISTS file_links (
  id TEXT PRIMARY KEY,                    -- File link ID
  task_id TEXT NOT NULL,                  -- Which task
  name TEXT NOT NULL,                     -- File name
  url TEXT NOT NULL,                      -- File URL
  type TEXT,                              -- File type (pdf, image, etc.)
  created_at TEXT NOT NULL,               -- When link was added
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- KANBAN COLUMNS
-- ============================================================================

-- Columns: Kanban board columns (todo, in-progress, done, etc.)
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,                    -- Column ID
  name TEXT NOT NULL,                     -- Column name
  color TEXT,                             -- Column color (hex)
  order_index INTEGER DEFAULT 0,          -- Display order
  auto_archive INTEGER DEFAULT 0,         -- Auto-archive tasks in this column
  created_at TEXT NOT NULL                -- When column was created
);

-- ============================================================================
-- CONNECTIONS (TASK DEPENDENCIES)
-- ============================================================================

-- Connections: Task dependencies/relationships (for Gantt chart)
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,                    -- Connection ID
  source_id TEXT NOT NULL,                -- From task ID
  target_id TEXT NOT NULL,                -- To task ID
  type TEXT DEFAULT 'finish_to_start',    -- Dependency type
  created_at TEXT NOT NULL,               -- When connection was created
  FOREIGN KEY (source_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- SETTINGS
-- ============================================================================

-- Settings: Application settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,                   -- Setting key
  value TEXT NOT NULL,                    -- Setting value (JSON)
  updated_at TEXT NOT NULL                -- Last update timestamp
);

-- ============================================================================
-- BUG REPORTS
-- ============================================================================

-- Bug reports: User-submitted bug reports
CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY,                    -- Report ID
  user_id TEXT,                           -- Who reported it
  description TEXT NOT NULL,              -- Bug description
  steps_to_reproduce TEXT,                -- How to reproduce
  severity TEXT,                          -- Severity level
  status TEXT DEFAULT 'open',             -- Status (open, closed, etc.)
  created_at TEXT NOT NULL,               -- When reported
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- Audit log: Track all changes (who did what, when)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- Log entry ID
  user_id TEXT,                           -- Who made the change
  action TEXT NOT NULL,                   -- Action type (create, update, delete)
  entity_type TEXT NOT NULL,              -- What was changed (task, user, etc.)
  entity_id TEXT,                         -- ID of changed entity
  changes TEXT,                           -- JSON of what changed
  created_at TEXT NOT NULL,               -- When change occurred
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES (Speed up queries)
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Token indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Invitation indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON user_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON user_invitations(expires_at);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- File link indexes
CREATE INDEX IF NOT EXISTS idx_file_links_task_id ON file_links(task_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
