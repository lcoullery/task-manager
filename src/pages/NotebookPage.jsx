import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import NotebookSidebar from '../components/Notebook/NotebookSidebar';
import NotebookEditor from '../components/Notebook/NotebookEditor';

export default function NotebookPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const activeNoteIdRef = useRef(null);

  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  // Load projects with their pages, then restore last active note
  useEffect(() => {
    async function load() {
      try {
        const data = await api.get('/api/notebooks/projects');
        const loadedProjects = data.projects || [];
        setProjects(loadedProjects);

        const lastNoteId = localStorage.getItem(`notebook_last_note_${user?.id}`);
        if (lastNoteId) {
          const allPages = loadedProjects.flatMap(p => [...p.pages, ...(p.folders || []).flatMap(f => f.pages)]);
          if (allPages.some(n => n.id === lastNoteId)) {
            setActiveNoteId(lastNoteId);
          }
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Persist last active note per user
  useEffect(() => {
    if (activeNoteId && user?.id) {
      localStorage.setItem(`notebook_last_note_${user.id}`, activeNoteId);
    }
  }, [activeNoteId, user?.id]);

  // Find active note across all projects and folders
  const allPages = projects.flatMap(p => [...p.pages, ...(p.folders || []).flatMap(f => f.pages)]);
  const activeNote = allPages.find(n => n.id === activeNoteId);
  const activeProject = activeNote ? projects.find(p => p.id === activeNote.project_id) : null;
  const activeFolder = activeNote?.folder_id
    ? activeProject?.folders?.find(f => f.id === activeNote.folder_id)
    : null;

  // Create project
  const handleCreateProject = useCallback(async (name) => {
    try {
      const data = await api.post('/api/notebooks/projects', { name });
      setProjects(prev => [...prev, { ...data.project, pages: [] }]);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }, []);

  // Delete project
  const handleDeleteProject = useCallback(async (projectId) => {
    if (!confirm(t('notebook.confirmDeleteProject', 'Delete this project and all its pages? This cannot be undone.'))) return;
    try {
      await api.delete(`/api/notebooks/projects/${projectId}`);
      setProjects(prev => {
        const remaining = prev.filter(p => p.id !== projectId);
        // If active note was in this project, deselect
        const deletedProject = prev.find(p => p.id === projectId);
        if (deletedProject?.pages.some(n => n.id === activeNoteId)) {
          setActiveNoteId(null);
        }
        return remaining;
      });
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }, [activeNoteId, t]);

  // Rename project
  const handleRenameProject = useCallback(async (projectId, name) => {
    try {
      await api.put(`/api/notebooks/projects/${projectId}`, { name });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name } : p));
    } catch (err) {
      console.error('Failed to rename project:', err);
    }
  }, []);

  // Create folder in a project
  const handleCreateFolder = useCallback(async (projectId, name) => {
    try {
      const data = await api.post('/api/notebooks/folders', { name, projectId });
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, folders: [...(p.folders || []), { ...data.folder, pages: [] }] } : p
      ));
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  }, []);

  // Delete folder
  const handleDeleteFolder = useCallback(async (folderId, projectId) => {
    if (!confirm(t('notebook.confirmDeleteFolder', 'Delete this folder and all its pages? This cannot be undone.'))) return;
    try {
      await api.delete(`/api/notebooks/folders/${folderId}`);
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        const deletedFolder = p.folders.find(f => f.id === folderId);
        if (deletedFolder?.pages.some(n => n.id === activeNoteId)) setActiveNoteId(null);
        return { ...p, folders: p.folders.filter(f => f.id !== folderId) };
      }));
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  }, [activeNoteId, t]);

  // Move page (drag & drop)
  const handleMovePage = useCallback(async (pageId, toFolderId, toProjectId) => {
    setProjects(prev => {
      let movedPage = null;
      const without = prev.map(p => ({
        ...p,
        pages: p.pages.filter(n => { if (n.id === pageId) { movedPage = n; return false; } return true; }),
        folders: (p.folders || []).map(f => ({
          ...f,
          pages: f.pages.filter(n => { if (n.id === pageId) { movedPage = n; return false; } return true; })
        }))
      }));
      if (!movedPage) return prev;
      return without.map(p => {
        if (p.id !== toProjectId) return p;
        if (toFolderId) {
          return { ...p, folders: p.folders.map(f => f.id === toFolderId ? { ...f, pages: [...f.pages, { ...movedPage, folder_id: toFolderId }] } : f) };
        }
        return { ...p, pages: [...p.pages, { ...movedPage, folder_id: null }] };
      });
    });
    try {
      await api.put(`/api/notebooks/${pageId}`, { folder_id: toFolderId || null, project_id: toProjectId });
    } catch (err) {
      console.error('Failed to move page:', err);
    }
  }, []);

  // Reorder pages (handles same-project reorder, cross-folder, and cross-project moves)
  const handleReorderPages = useCallback(async (page, targetPageId, position, inFolderId, projectId) => {
    const fromFolderId = page.folder_id || null;
    const fromProjectId = page.project_id;
    const toFolderId = inFolderId || null;
    const crossProject = fromProjectId !== projectId;

    const insertInto = (pages) => {
      const idx = pages.findIndex(n => n.id === targetPageId);
      if (idx === -1) return [...pages, { ...page, folder_id: toFolderId, project_id: projectId }];
      const list = [...pages];
      list.splice(position === 'before' ? idx : idx + 1, 0, { ...page, folder_id: toFolderId, project_id: projectId });
      return list;
    };

    setProjects(prev => prev.map(p => {
      // Remove from source project (if cross-project)
      if (crossProject && p.id === fromProjectId) {
        if (fromFolderId) {
          return { ...p, folders: p.folders.map(f => f.id === fromFolderId ? { ...f, pages: f.pages.filter(n => n.id !== page.id) } : f) };
        }
        return { ...p, pages: p.pages.filter(n => n.id !== page.id) };
      }

      if (p.id !== projectId) return p;

      // Remove from same-project source
      let updated = p;
      if (!crossProject) {
        if (fromFolderId) {
          updated = { ...updated, folders: updated.folders.map(f => f.id === fromFolderId ? { ...f, pages: f.pages.filter(n => n.id !== page.id) } : f) };
        } else {
          updated = { ...updated, pages: updated.pages.filter(n => n.id !== page.id) };
        }
      }

      // Insert at target
      if (toFolderId) {
        return { ...updated, folders: updated.folders.map(f => f.id === toFolderId ? { ...f, pages: insertInto(f.pages) } : f) };
      }
      return { ...updated, pages: insertInto(updated.pages) };
    }));

    // Persist to backend if location changed
    if (fromFolderId !== toFolderId || crossProject) {
      try {
        await api.put(`/api/notebooks/${page.id}`, { folder_id: toFolderId, project_id: projectId });
      } catch (err) {
        console.error('Failed to move page:', err);
      }
    }
  }, []);

  // Reorder shared projects
  const handleReorderProjects = useCallback(async (project, targetProjectId, position) => {
    setProjects(prev => {
      const shared = prev.filter(p => p.is_personal === 0);
      const list = shared.filter(p => p.id !== project.id);
      const idx = list.findIndex(p => p.id === targetProjectId);
      if (idx === -1) return prev;
      list.splice(position === 'before' ? idx : idx + 1, 0, project);
      const personal = prev.filter(p => p.is_personal === 1);
      return [...personal, ...list];
    });
    // Persist order_index for each shared project after reorder
    setProjects(current => {
      const shared = current.filter(p => p.is_personal === 0);
      shared.forEach((p, i) => {
        api.put(`/api/notebooks/projects/${p.id}`, { order_index: i }).catch(console.error);
      });
      return current;
    });
  }, []);

  // Reorder folders within a project
  const handleReorderFolders = useCallback(async (folder, targetFolderId, position, projectId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const list = (p.folders || []).filter(f => f.id !== folder.id);
      const idx = list.findIndex(f => f.id === targetFolderId);
      if (idx === -1) return p;
      const insertAt = position === 'before' ? idx : idx + 1;
      list.splice(insertAt, 0, folder);
      return { ...p, folders: list };
    }));
  }, []);

  // Rename folder
  const handleRenameFolder = useCallback(async (folderId, name) => {
    try {
      await api.put(`/api/notebooks/folders/${folderId}`, { name });
      setProjects(prev => prev.map(p => ({
        ...p,
        folders: (p.folders || []).map(f => f.id === folderId ? { ...f, name } : f)
      })));
    } catch (err) {
      console.error('Failed to rename folder:', err);
    }
  }, []);

  // Create page in a project (optionally in a folder)
  const handleCreatePage = useCallback(async (projectId, folderId = null) => {
    try {
      const data = await api.post('/api/notebooks', { title: '', projectId, folderId });
      const newPage = { ...data.note, author_name: user.name, author_color: user.color };
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        if (folderId) {
          return { ...p, folders: (p.folders || []).map(f => f.id === folderId ? { ...f, pages: [...f.pages, newPage] } : f) };
        }
        return { ...p, pages: [...p.pages, newPage] };
      }));
      setActiveNoteId(newPage.id);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  }, [user]);

  // Update page (debounced auto-save)
  const handleUpdate = useCallback((updates) => {
    const noteId = activeNoteIdRef.current;
    if (!noteId) return;

    setProjects(prev => prev.map(p => ({
      ...p,
      pages: p.pages.map(n => n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n),
      folders: (p.folders || []).map(f => ({
        ...f,
        pages: f.pages.map(n => n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)
      }))
    })));

    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.put(`/api/notebooks/${noteId}`, updates);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) {
        console.error('Failed to save page:', err);
        setSaveStatus(null);
      }
    }, 500);
  }, []);

  // Delete page
  const handleDeletePage = useCallback(async (noteId) => {
    if (!confirm(t('notebook.confirmDelete', 'Delete this page? This cannot be undone.'))) return;
    try {
      await api.delete(`/api/notebooks/${noteId}`);
      setProjects(prev => prev.map(p => ({
        ...p,
        pages: p.pages.filter(n => n.id !== noteId),
        folders: (p.folders || []).map(f => ({ ...f, pages: f.pages.filter(n => n.id !== noteId) }))
      })));
      if (activeNoteId === noteId) setActiveNoteId(null);
    } catch (err) {
      console.error('Failed to delete page:', err);
    }
  }, [activeNoteId, t]);

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      <NotebookSidebar
        projects={projects}
        activeNoteId={activeNoteId}
        onSelectNote={setActiveNoteId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameFolder={handleRenameFolder}
        onMovePage={handleMovePage}
        onReorderPages={handleReorderPages}
        onReorderFolders={handleReorderFolders}
        onReorderProjects={handleReorderProjects}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        currentUserId={user?.id}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <NotebookEditor
            key={activeNote.id}
            note={{ ...activeNote, currentUserId: user?.id }}
            projectName={activeProject?.name}
            folderName={activeFolder?.name}
            onUpdate={handleUpdate}
            saveStatus={saveStatus}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('notebook.selectOrCreate', 'Select a page or create a new one')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
