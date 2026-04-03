import { useTranslation } from 'react-i18next';
import { Plus, Lock, Globe, Trash2, BookOpen } from 'lucide-react';
import { getInitials } from '../../utils/colors';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function NotebookSidebar({ notes, activeId, onSelect, onCreate, onDelete, currentUserId }) {
  const { t } = useTranslation();

  return (
    <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('notebook.title', 'Notebook')}</h2>
        </div>
        <button
          onClick={onCreate}
          className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          title={t('notebook.newNote', 'New Note')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('notebook.noNotes', 'No notes yet')}
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              onClick={() => onSelect(note.id)}
              className={`group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors ${
                activeId === note.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {note.visibility === 'private' ? (
                    <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 text-green-500 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {note.title || t('notebook.untitled', 'Untitled')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {/* Author avatar for shared notes */}
                  {note.visibility === 'shared' && note.created_by !== currentUserId && (
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: note.author_color || '#3B82F6' }}
                      title={note.author_name}
                    >
                      {getInitials(note.author_name).charAt(0)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {timeAgo(note.updated_at)}
                  </span>
                </div>
              </div>

              {/* Delete button (only for own notes) */}
              {note.created_by === currentUserId && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                  className="p-1 rounded text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title={t('notebook.delete', 'Delete note')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
