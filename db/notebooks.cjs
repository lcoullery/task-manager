const { db } = require('./init.cjs');
const crypto = require('crypto');

function createNote({ title, content, visibility, createdBy }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO notebooks (id, title, content, visibility, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, title || 'Untitled', content || null, visibility || 'private', createdBy, now, now);

  return {
    id,
    title: title || 'Untitled',
    content: content || null,
    visibility: visibility || 'private',
    created_by: createdBy,
    created_at: now,
    updated_at: now
  };
}

function getNoteById(id) {
  const stmt = db.prepare(`
    SELECT n.*, u.name as author_name, u.color as author_color
    FROM notebooks n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.id = ?
  `);

  return stmt.get(id);
}

function getNotesForUser(userId) {
  const stmt = db.prepare(`
    SELECT n.*, u.name as author_name, u.color as author_color
    FROM notebooks n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.created_by = ? OR n.visibility = 'shared'
    ORDER BY n.updated_at DESC
  `);

  return stmt.all(userId);
}

function updateNote(id, updates) {
  const allowedFields = ['title', 'content', 'visibility'];
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

  const stmt = db.prepare(`UPDATE notebooks SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

function deleteNote(id) {
  const stmt = db.prepare('DELETE FROM notebooks WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

module.exports = {
  createNote,
  getNoteById,
  getNotesForUser,
  updateNote,
  deleteNote
};
