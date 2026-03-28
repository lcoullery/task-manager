/**
 * Database operations for all task manager data
 * Maps between JSON structure (frontend) and database tables
 */

const logger = require('../utils/logger.cjs');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to camelCase for JSON compatibility
 */
function toCamelCase(row) {
  if (!row) return null;

  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Convert JSON object to snake_case for database
 */
function toSnakeCase(obj) {
  if (!obj) return null;

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// ============================================================================
// READ OPERATIONS (Get all data in JSON format)
// ============================================================================

/**
 * Get all data from database in JSON format (compatible with old structure)
 * @param {Database} db - SQLite database instance
 * @returns {Object} All data in JSON format
 */
function getAllData(db) {
  try {
    // Get profiles (mapped from users table for backward compatibility)
    // Only include id, name, color, createdAt - exclude sensitive fields
    const profiles = db.prepare(`
      SELECT id, name, color, created_at
      FROM users
      WHERE is_active = 1
      ORDER BY created_at
    `).all().map(user => ({
      id: user.id,
      name: user.name,
      color: user.color,
      createdAt: user.created_at
    }));

    // Get labels
    const labels = db.prepare('SELECT * FROM labels ORDER BY created_at').all().map(toCamelCase);

    // Get columns
    const columns = db.prepare('SELECT * FROM columns ORDER BY order_index').all().map(row => ({
      id: row.id,
      name: row.name,
      order: row.order_index,
      color: row.color,
      autoArchive: row.auto_archive === 1
    }));

    // Get tasks with labels and comments
    const tasks = db.prepare(`
      SELECT * FROM tasks
      WHERE archived = 0
      ORDER BY order_index, created_at
    `).all().map(task => {
      // Get labels for this task
      const taskLabels = db.prepare(`
        SELECT label_id FROM task_labels WHERE task_id = ?
      `).all(task.id).map(row => row.label_id);

      // Get comments for this task
      const comments = db.prepare(`
        SELECT * FROM comments WHERE task_id = ? ORDER BY created_at
      `).all(task.id).map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        userId: comment.user_id
      }));

      // Convert to JSON format
      return {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignedTo: task.assigned_to,
        startDate: task.start_date,
        endDate: task.end_date,
        workloadHours: task.workload_hours || 0,
        weekendTask: task.weekend_task === 1,
        labels: taskLabels,
        comments: comments,
        archived: task.archived === 1,
        createdAt: task.created_at,
        order: task.order_index
      };
    });

    // Get archived tasks
    const archivedTasks = db.prepare(`
      SELECT * FROM tasks
      WHERE archived = 1
      ORDER BY updated_at DESC
    `).all().map(task => {
      const taskLabels = db.prepare(`
        SELECT label_id FROM task_labels WHERE task_id = ?
      `).all(task.id).map(row => row.label_id);

      const comments = db.prepare(`
        SELECT * FROM comments WHERE task_id = ? ORDER BY created_at
      `).all(task.id).map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        userId: comment.user_id
      }));

      return {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignedTo: task.assigned_to,
        startDate: task.start_date,
        endDate: task.end_date,
        workloadHours: task.workload_hours || 0,
        weekendTask: task.weekend_task === 1,
        labels: taskLabels,
        comments: comments,
        archived: true,
        createdAt: task.created_at,
        order: task.order_index
      };
    });

    // Combine active and archived tasks
    const allTasks = [...tasks, ...archivedTasks];

    // Get connections
    const connections = db.prepare('SELECT * FROM connections ORDER BY created_at').all().map(row => ({
      id: row.id,
      fromTaskId: row.source_id,
      toTaskId: row.target_id,
      createdAt: row.created_at
    }));

    // Get settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (err) {
        settings[row.key] = row.value;
      }
    });

    // Return in old JSON format
    return {
      profiles,
      tasks: allTasks,
      labels,
      columns,
      settings,
      connections
    };

  } catch (err) {
    logger.error('Error reading data from database:', err);
    throw err;
  }
}

// ============================================================================
// WRITE OPERATIONS (Save all data from JSON format)
// ============================================================================

/**
 * Save all data from JSON format to database
 * @param {Database} db - SQLite database instance
 * @param {Object} data - Data in JSON format
 * @param {string} userId - ID of user making changes
 */
function saveAllData(db, data, userId) {
  try {
    // Start transaction
    db.prepare('BEGIN').run();

    // Note: Profiles are now managed via the users table
    // They should be updated through the /api/users endpoints, not here
    // Skip saving profiles in saveAllData to prevent issues

    // Save labels
    if (data.labels) {
      db.prepare('DELETE FROM labels').run();

      const insertLabel = db.prepare(`
        INSERT INTO labels (id, name, color, created_at)
        VALUES (?, ?, ?, ?)
      `);

      for (const label of data.labels) {
        insertLabel.run(
          label.id,
          label.name,
          label.color,
          label.createdAt || new Date().toISOString()
        );
      }
    }

    // Save columns
    if (data.columns) {
      db.prepare('DELETE FROM columns').run();

      const insertColumn = db.prepare(`
        INSERT INTO columns (id, name, color, order_index, auto_archive, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const column of data.columns) {
        insertColumn.run(
          column.id,
          column.name,
          column.color || null,
          column.order || 0,
          column.autoArchive ? 1 : 0,
          new Date().toISOString()
        );
      }
    }

    // Save tasks
    if (data.tasks) {
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM task_labels').run();
      db.prepare('DELETE FROM comments').run();

      const insertTask = db.prepare(`
        INSERT INTO tasks (
          id, title, description, status, priority,
          assigned_to, start_date, end_date,
          workload_hours, weekend_task, archived,
          order_index, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertTaskLabel = db.prepare(`
        INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)
      `);

      const insertComment = db.prepare(`
        INSERT INTO comments (id, task_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const task of data.tasks) {
        // Insert task
        insertTask.run(
          task.id,
          task.title,
          task.description || '',
          task.status,
          task.priority || 'medium',
          task.assignedTo || null,
          task.startDate || null,
          task.endDate || null,
          task.workloadHours || 0,
          task.weekendTask ? 1 : 0,
          task.archived ? 1 : 0,
          task.order || 0,
          task.createdAt || new Date().toISOString(),
          new Date().toISOString(),
          userId
        );

        // Insert task labels
        if (task.labels && task.labels.length > 0) {
          for (const labelId of task.labels) {
            insertTaskLabel.run(task.id, labelId);
          }
        }

        // Insert comments
        if (task.comments && task.comments.length > 0) {
          for (const comment of task.comments) {
            insertComment.run(
              comment.id || require('crypto').randomUUID(),
              task.id,
              comment.userId || userId,
              comment.content,
              comment.createdAt || new Date().toISOString()
            );
          }
        }
      }
    }

    // Save connections
    if (data.connections) {
      db.prepare('DELETE FROM connections').run();

      const insertConnection = db.prepare(`
        INSERT INTO connections (id, source_id, target_id, type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const conn of data.connections) {
        insertConnection.run(
          conn.id,
          conn.fromTaskId,
          conn.toTaskId,
          'finish_to_start',
          conn.createdAt || new Date().toISOString()
        );
      }
    }

    // Save settings
    if (data.settings) {
      db.prepare('DELETE FROM settings').run();

      const insertSetting = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `);

      for (const [key, value] of Object.entries(data.settings)) {
        insertSetting.run(
          key,
          JSON.stringify(value),
          new Date().toISOString()
        );
      }
    }

    // Commit transaction
    db.prepare('COMMIT').run();

    logger.info('Data saved successfully to database');

  } catch (err) {
    // Rollback on error
    try {
      db.prepare('ROLLBACK').run();
    } catch (rollbackErr) {
      logger.error('Error rolling back transaction:', rollbackErr);
    }

    logger.error('Error saving data to database:', err);
    throw err;
  }
}

module.exports = {
  getAllData,
  saveAllData
};
