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

// ── Drop indicator line ───────────────────────────────────────────────────────
function DropLine({ visible }) {
  if (!visible) return null;
  return <div className="h-0.5 bg-blue-500 rounded mx-2 my-0.5" />;
}

// ── Page item ─────────────────────────────────────────────────────────────────
function PageItem({ page, activeNoteId, onSelectNote, onDeletePage, currentUserId, dragRef, dropState, setDropState, onDrop }) {
  const { t } = useTranslation();
  const isActive = page.id === activeNoteId;
  const isOwner = page.created_by === currentUserId;
  const ref = useRef(null);

  const getPosition = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 'after';
    return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  };

  const isDropBefore = dropState?.type === 'page' && dropState.pageId === page.id && dropState.position === 'before';
  const isDropAfter  = dropState?.type === 'page' && dropState.pageId === page.id && dropState.position === 'after';

  return (
    <>
      <DropLine visible={isDropBefore} />
      <div
        ref={ref}
        draggable={isOwner}
        onDragStart={e => { e.stopPropagation(); dragRef.current = { type: 'page', page }; }}
        onDragOver={e => {
          if (!dragRef.current) return;
          e.preventDefault(); e.stopPropagation();
          setDropState({ type: 'page', pageId: page.id, position: getPosition(e) });
        }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropState(null); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop({ type: 'page', pageId: page.id, position: getPosition(e) }); }}
        onClick={() => onSelectNote(page.id)}
        className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-colors select-none ${
          isActive ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
                   : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
        } ${isOwner ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        <div className="flex-1 min-w-0">
          <span className={`text-sm truncate block ${isActive ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
            {page.title || <span className="italic text-gray-400">{t('notebook.untitled', 'Untitled')}</span>}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {!isOwner && page.author_name && (
              <span className="w-3.5 h-3.5 rounded-full text-white flex items-center justify-center text-[8px] font-bold shrink-0" style={{ backgroundColor: page.author_color || '#3B82F6' }} title={page.author_name}>
                {page.author_name[0].toUpperCase()}
              </span>
            )}
            <span className="text-xs text-gray-400">{timeAgo(page.updated_at)}</span>
          </div>
        </div>
        {isOwner && (
          <button onClick={e => { e.stopPropagation(); onDeletePage(page.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-opacity shrink-0" title={t('notebook.deletePage')}>
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <DropLine visible={isDropAfter} />
    </>
  );
}

// ── Folder item ───────────────────────────────────────────────────────────────
function FolderItem({ folder, projectId, activeNoteId, onSelectNote, onDeleteFolder, onRenameFolder, onCreatePage, onDeletePage, currentUserId, dragRef, dropState, setDropState, onDrop }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(folder.name);
  const inputRef = useRef(null);
  const headerRef = useRef(null);
  const isOwner = folder.created_by === currentUserId;

  const startRename = () => { setNameInput(folder.name); setRenaming(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const commitRename = () => { const v = nameInput.trim(); if (v && v !== folder.name) onRenameFolder(folder.id, v); setRenaming(false); };
  const cancelRename = () => { setNameInput(folder.name); setRenaming(false); };

  const isDropTarget = dropState?.type === 'folder' && dropState.folderId === folder.id;
  const isReorderBefore = dropState?.type === 'folder-reorder' && dropState.folderId === folder.id && dropState.position === 'before';
  const isReorderAfter  = dropState?.type === 'folder-reorder' && dropState.folderId === folder.id && dropState.position === 'after';

  const getPosition = (e) => {
    const rect = headerRef.current?.getBoundingClientRect();
    if (!rect) return 'after';
    return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  };

  return (
    <div className="mb-0.5">
      <DropLine visible={isReorderBefore} />
      <div
        ref={headerRef}
        draggable
        onDragStart={e => { e.stopPropagation(); dragRef.current = { type: 'folder', folder, projectId }; }}
        onDragOver={e => {
          if (!dragRef.current) return;
          e.preventDefault(); e.stopPropagation();
          if (dragRef.current.type === 'page') {
            setDropState({ type: 'folder', folderId: folder.id, projectId });
          } else if (dragRef.current.type === 'folder' && dragRef.current.folder.id !== folder.id) {
            setDropState({ type: 'folder-reorder', folderId: folder.id, position: getPosition(e) });
          }
        }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropState(null); }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation();
          if (dragRef.current?.type === 'page') {
            onDrop({ type: 'folder', folderId: folder.id, projectId });
          } else if (dragRef.current?.type === 'folder') {
            onDrop({ type: 'folder-reorder', folderId: folder.id, position: getPosition(e), projectId });
          }
        }}
        className={`group flex items-center gap-1 px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none transition-colors ${
          isDropTarget ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-400 border-dashed' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
        }`}
      >
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1.5 flex-1 min-w-0">
          {expanded ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
          <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isDropTarget ? 'text-blue-500' : 'text-yellow-500'}`} />
          {renaming ? (
            <input ref={inputRef} value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename(); }}
              onClick={e => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs bg-white dark:bg-gray-800 border border-blue-400 rounded px-1 outline-none"
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs text-gray-600 dark:text-gray-400 truncate text-left">{folder.name}</span>
          )}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {renaming ? (
            <><button onClick={commitRename} className="p-0.5 text-green-600"><Check className="w-3 h-3" /></button><button onClick={cancelRename} className="p-0.5 text-gray-400"><X className="w-3 h-3" /></button></>
          ) : (
            <>
              {isOwner && <button onClick={e => { e.stopPropagation(); startRename(); }} className="p-0.5 text-gray-400 hover:text-gray-600" title={t('notebook.renameFolder')}><Pencil className="w-3 h-3" /></button>}
              <button onClick={e => { e.stopPropagation(); onCreatePage(projectId, folder.id); }} className="p-0.5 text-gray-400 hover:text-blue-600" title={t('notebook.newPage')}><Plus className="w-3 h-3" /></button>
              {isOwner && <button onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id, projectId); }} className="p-0.5 text-gray-400 hover:text-red-500" title={t('notebook.deleteFolder')}><Trash2 className="w-3 h-3" /></button>}
            </>
          )}
        </div>
      </div>
      <DropLine visible={isReorderAfter} />

      {expanded && (
        <div className="ml-5">
          {folder.pages.length === 0 && !(isDropTarget) ? (
            <div className={`px-3 py-0.5 text-xs italic rounded ${isDropTarget ? 'text-blue-500' : 'text-gray-400'}`}>{t('notebook.noPages', 'No pages')}</div>
          ) : (
            folder.pages.map(page => (
              <PageItem key={page.id} page={page} activeNoteId={activeNoteId} onSelectNote={onSelectNote} onDeletePage={onDeletePage} currentUserId={currentUserId}
                dragRef={dragRef} dropState={dropState} setDropState={setDropState}
                onDrop={drop => onDrop({ ...drop, inFolderId: folder.id, projectId })}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Project item ──────────────────────────────────────────────────────────────
function ProjectItem({ project, activeNoteId, onSelectNote, onDeleteProject, onRenameProject, onCreateFolder, onDeleteFolder, onRenameFolder, onCreatePage, onDeletePage, currentUserId, dragRef, dropState, setDropState, onDrop }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const inputRef = useRef(null);
  const isOwner = project.created_by === currentUserId;
  const isPersonal = project.is_personal === 1;

  const startRename = () => { setNameInput(project.name); setRenaming(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const commitRename = () => { const v = nameInput.trim(); if (v && v !== project.name) onRenameProject(project.id, v); setRenaming(false); };
  const cancelRename = () => { setNameInput(project.name); setRenaming(false); };

  const isRootDrop = dropState?.type === 'root' && dropState.projectId === project.id;

  return (
    <div className="mb-1">
      <div className="group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer select-none">
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1.5 flex-1 min-w-0">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
          {isPersonal ? <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
          {renaming ? (
            <input ref={inputRef} value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename(); }}
              onClick={e => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs font-semibold bg-white dark:bg-gray-800 border border-blue-400 rounded px-1 outline-none"
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate text-left">{project.name}</span>
          )}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {renaming ? (
            <><button onClick={commitRename} className="p-0.5 text-green-600 hover:text-green-700"><Check className="w-3 h-3" /></button><button onClick={cancelRename} className="p-0.5 text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button></>
          ) : (
            <>
              {isOwner && !isPersonal && <button onClick={e => { e.stopPropagation(); startRename(); }} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={t('notebook.renameProject')}><Pencil className="w-3 h-3" /></button>}
              <button onClick={e => { e.stopPropagation(); onCreatePage(project.id); }} className="p-0.5 text-gray-400 hover:text-blue-600" title={t('notebook.newPage')}><Plus className="w-3 h-3" /></button>
              <button onClick={e => { e.stopPropagation(); onCreateFolder(project.id, t('notebook.newFolderName', 'New folder')); }} className="p-0.5 text-gray-400 hover:text-yellow-600" title={t('notebook.newFolder')}><FolderOpen className="w-3 h-3" /></button>
              {isOwner && !isPersonal && <button onClick={e => { e.stopPropagation(); onDeleteProject(project.id); }} className="p-0.5 text-gray-400 hover:text-red-500" title={t('notebook.deleteProject')}><Trash2 className="w-3 h-3" /></button>}
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="ml-4">
          {/* Root drop zone (to move out of folder) */}
          {dragRef.current?.type === 'page' && dragRef.current?.page?.folder_id && (
            <div
              onDragOver={e => { e.preventDefault(); setDropState({ type: 'root', projectId: project.id }); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropState(null); }}
              onDrop={e => { e.preventDefault(); onDrop({ type: 'root', projectId: project.id }); }}
              className={`mb-1 px-2 py-1 text-xs rounded border border-dashed transition-colors ${
                isRootDrop ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'border-gray-300 dark:border-gray-600 text-gray-400'
              }`}
            >
              {t('notebook.dropHereRoot', 'Drop here to remove from folder')}
            </div>
          )}

          {/* Loose pages */}
          {project.pages.map(page => (
            <PageItem key={page.id} page={page} activeNoteId={activeNoteId} onSelectNote={onSelectNote} onDeletePage={onDeletePage} currentUserId={currentUserId}
              dragRef={dragRef} dropState={dropState} setDropState={setDropState}
              onDrop={drop => onDrop({ ...drop, inFolderId: null, projectId: project.id })}
            />
          ))}

          {/* Folders */}
          {(project.folders || []).map(folder => (
            <FolderItem key={folder.id} folder={folder} projectId={project.id} activeNoteId={activeNoteId}
              onSelectNote={onSelectNote} onDeleteFolder={onDeleteFolder} onRenameFolder={onRenameFolder}
              onCreatePage={onCreatePage} onDeletePage={onDeletePage} currentUserId={currentUserId}
              dragRef={dragRef} dropState={dropState} setDropState={setDropState} onDrop={onDrop}
            />
          ))}

          {project.pages.length === 0 && (project.folders || []).length === 0 && (
            <div className="px-3 py-1 text-xs text-gray-400 italic">{t('notebook.noPages', 'No pages')}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function NotebookSidebar({ projects, activeNoteId, onSelectNote, onCreateProject, onDeleteProject, onRenameProject, onCreateFolder, onDeleteFolder, onRenameFolder, onCreatePage, onDeletePage, onMovePage, onReorderPages, onReorderFolders, currentUserId }) {
  const { t } = useTranslation();
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [dropState, setDropState] = useState(null);
  const newProjectInputRef = useRef(null);
  const dragRef = useRef(null);

  const startCreateProject = () => { setNewProjectName(''); setCreatingProject(true); setTimeout(() => newProjectInputRef.current?.focus(), 0); };
  const commitCreateProject = () => { const v = newProjectName.trim(); if (v) onCreateProject(v); setCreatingProject(false); setNewProjectName(''); };
  const cancelCreateProject = () => { setCreatingProject(false); setNewProjectName(''); };

  const handleDrop = (drop) => {
    setDropState(null);
    const dragged = dragRef.current;
    dragRef.current = null;
    if (!dragged) return;

    if (dragged.type === 'page') {
      const page = dragged.page;

      if (drop.type === 'folder') {
        // Move page into folder
        if (page.folder_id !== drop.folderId) {
          onMovePage(page.id, drop.folderId, drop.projectId);
        }
      } else if (drop.type === 'root') {
        // Move page out of folder to project root
        if (page.folder_id) {
          onMovePage(page.id, null, drop.projectId);
        }
      } else if (drop.type === 'page') {
        // Reorder: insert before/after target page
        onReorderPages(page, drop.pageId, drop.position, drop.inFolderId, drop.projectId);
      }
    } else if (dragged.type === 'folder') {
      if (drop.type === 'folder-reorder') {
        onReorderFolders(dragged.folder, drop.folderId, drop.position, drop.projectId);
      }
    }
  };

  const personal = projects.find(p => p.is_personal === 1);
  const shared = projects.filter(p => p.is_personal === 0);
  const commonProps = { activeNoteId, onSelectNote, onDeleteProject, onRenameProject, onCreateFolder, onDeleteFolder, onRenameFolder, onCreatePage, onDeletePage, currentUserId, dragRef, dropState, setDropState, onDrop: handleDrop };

  return (
    <div
      className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50"
      onDragEnd={() => { dragRef.current = null; setDropState(null); }}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4" />
          {t('notebook.title', 'Notebook')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {personal && <ProjectItem key={personal.id} project={personal} {...commonProps} />}
        {shared.map(project => <ProjectItem key={project.id} project={project} {...commonProps} />)}

        {creatingProject && (
          <div className="flex items-center gap-1 px-2 py-1.5 mt-1">
            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input ref={newProjectInputRef} value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitCreateProject(); if (e.key === 'Escape') cancelCreateProject(); }}
              placeholder={t('notebook.projectName', 'Project name...')}
              className="flex-1 text-xs bg-white dark:bg-gray-800 border border-blue-400 rounded px-1 py-0.5 outline-none"
            />
            <button onClick={commitCreateProject} className="p-0.5 text-green-600 hover:text-green-700"><Check className="w-3 h-3" /></button>
            <button onClick={cancelCreateProject} className="p-0.5 text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button onClick={startCreateProject} className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {t('notebook.newProject', 'New project')}
        </button>
      </div>
    </div>
  );
}
