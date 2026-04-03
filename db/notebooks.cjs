const { db } = require('./init.cjs');
const crypto = require('crypto');

// ============================================================================
// PROJECTS
// ============================================================================

function ensurePersonalProject(userId) {
  const existing = db.prepare(`
    SELECT id FROM notebook_projects
    WHERE created_by = ? AND is_personal = 1
  `).get(userId);

  if (existing) return existing.id;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notebook_projects (id, name, is_personal, created_by, created_at, updated_at)
    VALUES (?, 'Personal', 1, ?, ?, ?)
  `).run(id, userId, now, now);

  return id;
}

function createProject({ name, createdBy }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notebook_projects (id, name, is_personal, created_by, created_at, updated_at)
    VALUES (?, ?, 0, ?, ?, ?)
  `).run(id, name, createdBy, now, now);

  return { id, name, is_personal: 0, created_by: createdBy, created_at: now, updated_at: now, pages: [] };
}

function getProjectsForUser(userId) {
  // Personal project of the current user + all shared projects (is_personal = 0)
  const projects = db.prepare(`
    SELECT p.*, u.name as author_name, u.color as author_color
    FROM notebook_projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE (p.created_by = ? AND p.is_personal = 1)
       OR p.is_personal = 0
    ORDER BY p.is_personal DESC, p.created_at ASC
  `).all(userId);

  const pages = db.prepare(`
    SELECT n.*, u.name as author_name, u.color as author_color
    FROM notebooks n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.project_id IN (
      SELECT id FROM notebook_projects
      WHERE (created_by = ? AND is_personal = 1) OR is_personal = 0
    )
    ORDER BY n.order_index ASC, n.created_at ASC
  `).all(userId);

  // Group pages into projects
  const pagesByProject = {};
  for (const page of pages) {
    if (!pagesByProject[page.project_id]) pagesByProject[page.project_id] = [];
    pagesByProject[page.project_id].push(page);
  }

  return projects.map(p => ({ ...p, pages: pagesByProject[p.id] || [] }));
}

function getProjectById(id) {
  return db.prepare('SELECT * FROM notebook_projects WHERE id = ?').get(id);
}

function updateProject(id, { name }) {
  const result = db.prepare(`
    UPDATE notebook_projects SET name = ?, updated_at = ? WHERE id = ?
  `).run(name, new Date().toISOString(), id);
  return result.changes > 0;
}

function deleteProject(id) {
  const result = db.prepare('DELETE FROM notebook_projects WHERE id = ? AND is_personal = 0').run(id);
  return result.changes > 0;
}

// ============================================================================
// PAGES (notes)
// ============================================================================

function createNote({ title, content, projectId, createdBy }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const maxOrder = db.prepare(`
    SELECT COALESCE(MAX(order_index), -1) as max FROM notebooks WHERE project_id = ?
  `).get(projectId);
  const orderIndex = maxOrder.max + 1;

  db.prepare(`
    INSERT INTO notebooks (id, title, content, visibility, project_id, order_index, created_by, created_at, updated_at)
    VALUES (?, ?, ?, 'private', ?, ?, ?, ?, ?)
  `).run(id, title || 'Untitled', content || null, projectId, orderIndex, createdBy, now, now);

  return { id, title: title || 'Untitled', content: content || null, project_id: projectId, order_index: orderIndex, created_by: createdBy, created_at: now, updated_at: now };
}

function getNoteById(id) {
  return db.prepare(`
    SELECT n.*, u.name as author_name, u.color as author_color
    FROM notebooks n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.id = ?
  `).get(id);
}

function updateNote(id, updates) {
  const allowedFields = ['title', 'content', 'order_index', 'project_id'];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const result = db.prepare(`UPDATE notebooks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return result.changes > 0;
}

function deleteNote(id) {
  const result = db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  ensurePersonalProject,
  createProject,
  getProjectsForUser,
  getProjectById,
  updateProject,
  deleteProject,
  createNote,
  getNoteById,
  updateNote,
  deleteNote
};
