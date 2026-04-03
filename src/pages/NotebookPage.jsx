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

  // Load projects with their pages
  useEffect(() => {
    async function load() {
      try {
        const data = await api.get('/api/notebooks/projects');
        setProjects(data.projects || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Find active note across all projects
  const activeNote = projects.flatMap(p => p.pages).find(n => n.id === activeNoteId);
  const activeProject = activeNote ? projects.find(p => p.id === activeNote.project_id) : null;

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

  // Create page in a project
  const handleCreatePage = useCallback(async (projectId) => {
    try {
      const data = await api.post('/api/notebooks', { title: '', projectId });
      const newPage = { ...data.note, author_name: user.name, author_color: user.color };
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, pages: [...p.pages, newPage] } : p
      ));
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
      pages: p.pages.map(n =>
        n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
      )
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
        pages: p.pages.filter(n => n.id !== noteId)
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
