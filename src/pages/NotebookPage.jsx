import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import NotebookSidebar from '../components/Notebook/NotebookSidebar';
import NotebookEditor from '../components/Notebook/NotebookEditor';

export default function NotebookPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const activeNoteIdRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  // Load notes
  useEffect(() => {
    async function load() {
      try {
        const data = await api.get('/api/notebooks');
        setNotes(data.notes || []);
        if (data.notes?.length > 0 && !activeNoteId) {
          setActiveNoteId(data.notes[0].id);
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Create note
  const handleCreate = useCallback(async () => {
    try {
      const data = await api.post('/api/notebooks', { title: '', visibility: 'private' });
      const newNote = { ...data.note, author_name: user.name, author_color: user.color };
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  }, [user]);

  // Update note (debounced)
  const handleUpdate = useCallback((updates) => {
    const noteId = activeNoteIdRef.current;
    if (!noteId) return;

    // Update local state immediately
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
    ));

    // Debounced save to server
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.put(`/api/notebooks/${noteId}`, updates);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) {
        console.error('Failed to save note:', err);
        setSaveStatus(null);
      }
    }, 500);
  }, []);

  // Delete note
  const handleDelete = useCallback(async (noteId) => {
    if (!confirm(t('notebook.confirmDelete', 'Delete this note? This cannot be undone.'))) return;

    try {
      await api.delete(`/api/notebooks/${noteId}`);
      setNotes(prev => {
        const remaining = prev.filter(n => n.id !== noteId);
        if (activeNoteId === noteId) {
          setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }, [activeNoteId, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId);

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
        notes={notes}
        activeId={activeNoteId}
        onSelect={setActiveNoteId}
        onCreate={handleCreate}
        onDelete={handleDelete}
        currentUserId={user?.id}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <NotebookEditor
            key={activeNote.id}
            note={{ ...activeNote, currentUserId: user?.id }}
            onUpdate={handleUpdate}
            saveStatus={saveStatus}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('notebook.noNotes', 'No notes yet')}
              </p>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 mx-auto bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('notebook.newNote', 'New Note')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
