const {
  createNote,
  getNoteById,
  getNotesForUser,
  updateNote,
  deleteNote
} = require('../db/notebooks.cjs');

function listNotes(req, res) {
  try {
    const notes = getNotesForUser(req.user.id);
    res.json({ notes });
  } catch (error) {
    console.error('List notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
}

function createNoteHandler(req, res) {
  try {
    const { title, content, visibility } = req.body;
    const note = createNote({
      title,
      content,
      visibility,
      createdBy: req.user.id
    });
    res.status(201).json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
}

function getNote(req, res) {
  try {
    const note = getNoteById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check permission: private notes only visible to author
    if (note.visibility === 'private' && note.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ note });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
}

function updateNoteHandler(req, res) {
  try {
    const note = getNoteById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only author can edit
    if (note.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can edit this note' });
    }

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.content !== undefined) updates.content = req.body.content;
    if (req.body.visibility !== undefined) updates.visibility = req.body.visibility;
    updateNote(req.params.id, updates);

    res.json({ message: 'Note updated' });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
}

function deleteNoteHandler(req, res) {
  try {
    const note = getNoteById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only author can delete
    if (note.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can delete this note' });
    }

    deleteNote(req.params.id);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
}

module.exports = {
  listNotes,
  createNote: createNoteHandler,
  getNote,
  updateNote: updateNoteHandler,
  deleteNote: deleteNoteHandler
};
