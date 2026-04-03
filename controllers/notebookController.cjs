const {
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
} = require('../db/notebooks.cjs');

// ============================================================================
// PROJECT HANDLERS
// ============================================================================

function listProjects(req, res) {
  try {
    // Ensure the user's personal project exists
    ensurePersonalProject(req.user.id);
    const projects = getProjectsForUser(req.user.id);
    res.json({ projects });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}

function createProjectHandler(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    const project = createProject({ name: name.trim(), createdBy: req.user.id });
    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
}

function updateProjectHandler(req, res) {
  try {
    const project = getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.created_by !== req.user.id) return res.status(403).json({ error: 'Only the author can rename this project' });
    if (project.is_personal) return res.status(403).json({ error: 'Cannot rename the personal project' });

    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });

    updateProject(req.params.id, { name: name.trim() });
    res.json({ message: 'Project updated' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
}

function deleteProjectHandler(req, res) {
  try {
    const project = getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.created_by !== req.user.id) return res.status(403).json({ error: 'Only the author can delete this project' });
    if (project.is_personal) return res.status(403).json({ error: 'Cannot delete the personal project' });

    deleteProject(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}

// ============================================================================
// PAGE (NOTE) HANDLERS
// ============================================================================

function createNoteHandler(req, res) {
  try {
    let { title, content, projectId } = req.body;

    // 'personal' is a magic value — resolve to actual personal project id
    if (!projectId || projectId === 'personal') {
      projectId = ensurePersonalProject(req.user.id);
    } else {
      const project = getProjectById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      // For shared projects, check visibility: project is_personal=0 means shared
      // Personal projects: only the owner can add pages
      if (project.is_personal && project.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Cannot add pages to another user\'s personal project' });
      }
    }

    const note = createNote({ title, content, projectId, createdBy: req.user.id });
    res.status(201).json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
}

function getNote(req, res) {
  try {
    const note = getNoteById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Check access: personal project pages are only visible to owner
    if (note.project_id) {
      const project = getProjectById(note.project_id);
      if (project && project.is_personal && project.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
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
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.created_by !== req.user.id) return res.status(403).json({ error: 'Only the author can edit this page' });

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.content !== undefined) updates.content = req.body.content;
    if (req.body.order_index !== undefined) updates.order_index = req.body.order_index;
    if (req.body.project_id !== undefined) updates.project_id = req.body.project_id;

    updateNote(req.params.id, updates);
    res.json({ message: 'Page updated' });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
}

function deleteNoteHandler(req, res) {
  try {
    const note = getNoteById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.created_by !== req.user.id) return res.status(403).json({ error: 'Only the author can delete this page' });

    deleteNote(req.params.id);
    res.json({ message: 'Page deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
}

module.exports = {
  listProjects,
  createProject: createProjectHandler,
  updateProject: updateProjectHandler,
  deleteProject: deleteProjectHandler,
  createNote: createNoteHandler,
  getNote,
  updateNote: updateNoteHandler,
  deleteNote: deleteNoteHandler
};
