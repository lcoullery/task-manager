import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Globe, Plus, Trash2, ChevronDown, ChevronRight, FolderOpen, Pencil, Check, X } from 'lucide-react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function ProjectItem({ project, activeNoteId, onSelectNote, onDeleteProject, onRenameProject, onCreatePage, onDeletePage, currentUserId }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const inputRef = useRef(null);

  const isOwner = project.created_by === currentUserId;
  const isPersonal = project.is_personal === 1;

  const startRename = () => {
    setNameInput(project.name);
    setRenaming(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== project.name) onRenameProject(project.id, trimmed);
    setRenaming(false);
  };

  const cancelRename = () => {
    setNameInput(project.name);
    setRenaming(false);
  };

  return (
    <div className="mb-1">
      {/* Project header */}
      <div className="group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer select-none">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          }
          {isPersonal
            ? <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            : <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          }
          {renaming ? (
            <input
              ref={inputRef}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename(); }}
              onClick={e => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs font-semibold bg-white dark:bg-gray-800 border border-blue-400 rounded px-1 outline-none"
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate text-left">
              {project.name}
            </span>
          )}
        </button>

        {/* Project actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {renaming ? (
            <>
              <button onClick={commitRename} className="p-0.5 text-green-600 hover:text-green-700" title={t('common.save', 'Save')}>
                <Check className="w-3 h-3" />
              </button>
              <button onClick={cancelRename} className="p-0.5 text-gray-400 hover:text-gray-600" title={t('common.cancel', 'Cancel')}>
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              {isOwner && !isPersonal && (
                <button
                  onClick={e => { e.stopPropagation(); startRename(); }}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={t('notebook.renameProject', 'Rename')}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onCreatePage(project.id); }}
                className="p-0.5 text-gray-400 hover:text-blue-600"
                title={t('notebook.newPage', 'New page')}
              >
                <Plus className="w-3 h-3" />
              </button>
              {isOwner && !isPersonal && (
                <button
                  onClick={e => { e.stopPropagation(); onDeleteProject(project.id); }}
                  className="p-0.5 text-gray-400 hover:text-red-500"
                  title={t('notebook.deleteProject', 'Delete project')}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pages */}
      {expanded && (
        <div className="ml-4">
          {project.pages.length === 0 ? (
            <div className="px-3 py-1 text-xs text-gray-400 italic">
              {t('notebook.noPages', 'No pages')}
            </div>
          ) : (
            project.pages.map(page => {
              const isActive = page.id === activeNoteId;
              const isPageOwner = page.created_by === currentUserId;
              return (
                <div
                  key={page.id}
                  onClick={() => onSelectNote(page.id)}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm truncate ${isActive ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                        {page.title || <span className="italic text-gray-400">{t('notebook.untitled', 'Untitled')}</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {!isPageOwner && page.author_name && (
                        <span
                          className="w-3.5 h-3.5 rounded-full text-white flex items-center justify-center text-[8px] font-bold shrink-0"
                          style={{ backgroundColor: page.author_color || '#3B82F6' }}
                          title={page.author_name}
                        >
                          {page.author_name[0].toUpperCase()}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{timeAgo(page.updated_at)}</span>
                    </div>
                  </div>

                  {isPageOwner && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeletePage(page.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                      title={t('notebook.deletePage', 'Delete page')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function NotebookSidebar({ projects, activeNoteId, onSelectNote, onCreateProject, onDeleteProject, onRenameProject, onCreatePage, onDeletePage, currentUserId }) {
  const { t } = useTranslation();
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const newProjectInputRef = useRef(null);

  const startCreateProject = () => {
    setNewProjectName('');
    setCreatingProject(true);
    setTimeout(() => newProjectInputRef.current?.focus(), 0);
  };

  const commitCreateProject = () => {
    const trimmed = newProjectName.trim();
    if (trimmed) onCreateProject(trimmed);
    setCreatingProject(false);
    setNewProjectName('');
  };

  const cancelCreateProject = () => {
    setCreatingProject(false);
    setNewProjectName('');
  };

  const personal = projects.find(p => p.is_personal === 1);
  const shared = projects.filter(p => p.is_personal === 0);

  return (
    <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4" />
          {t('notebook.title', 'Notebook')}
        </h2>
      </div>

      {/* Projects list */}
      <div className="flex-1 overflow-y-auto p-2">
        {personal && (
          <ProjectItem
            project={personal}
            activeNoteId={activeNoteId}
            onSelectNote={onSelectNote}
            onDeleteProject={onDeleteProject}
            onRenameProject={onRenameProject}
            onCreatePage={onCreatePage}
            onDeletePage={onDeletePage}
            currentUserId={currentUserId}
          />
        )}

        {shared.map(project => (
          <ProjectItem
            key={project.id}
            project={project}
            activeNoteId={activeNoteId}
            onSelectNote={onSelectNote}
            onDeleteProject={onDeleteProject}
            onRenameProject={onRenameProject}
            onCreatePage={onCreatePage}
            onDeletePage={onDeletePage}
            currentUserId={currentUserId}
          />
        ))}

        {creatingProject && (
          <div className="flex items-center gap-1 px-2 py-1.5 mt-1">
            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={newProjectInputRef}
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitCreateProject(); if (e.key === 'Escape') cancelCreateProject(); }}
              placeholder={t('notebook.projectName', 'Project name...')}
              className="flex-1 text-xs bg-white dark:bg-gray-800 border border-blue-400 rounded px-1 py-0.5 outline-none"
            />
            <button onClick={commitCreateProject} className="p-0.5 text-green-600 hover:text-green-700">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={cancelCreateProject} className="p-0.5 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={startCreateProject}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('notebook.newProject', 'New project')}
        </button>
      </div>
    </div>
  );
}
