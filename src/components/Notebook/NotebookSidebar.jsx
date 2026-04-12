import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Lock, Globe, Plus, Trash2, ChevronDown, ChevronRight,
  ChevronLeft, FolderOpen, Pencil, Check, X
} from 'lucide-react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function DropLine({ visible }) {
  return (
    <div className="relative h-0 pointer-events-none">
      <div className={`absolute inset-x-2 h-0.5 rounded z-10 ${visible ? 'bg-blue-500' : 'bg-transparent'}`} />
    </div>
  );
}

// ── Page item ─────────────────────────────────────────────────────────────────
function PageItem({ page, activeNoteId, onSelectNote, onDeletePage, currentUserId, dragRef, dropState, setDropState, onDrop }) {
  const { t } = useTranslation();
  const isActive = page.id === activeNoteId;
  const isOwner = page.created_by === currentUserId;
  const ref = useRef(null);

  const getPosition = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    return rect && e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
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
              <span className="w-3.5 h-3.5 rounded-full text-white flex items-center justify-center text-[8px] font-bold shrink-0"
                style={{ backgroundColor: page.author_color || '#3B82F6' }} title={page.author_name}>
                {page.author_name[0].toUpperCase()}
              </span>
            )}
            <span className="text-xs text-gray-400">{timeAgo(page.updated_at)}</span>
          </div>
        </div>
        {isOwner && (
          <button onClick={e => { e.stopPropagation(); onDeletePage(page.id); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
            title={t('notebook.deletePage')}>
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

  const isDropTarget   = dropState?.type === 'folder'         && dropState.folderId === folder.id;
  const isReorderBefore = dropState?.type === 'folder-reorder' && dropState.folderId === folder.id && dropState.position === 'before';
  const isReorderAfter  = dropState?.type === 'folder-reorder' && dropState.folderId === folder.id && dropState.position === 'after';

  const getPosition = (e) => {
    const rect = headerRef.current?.getBoundingClientRect();
    return rect && e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
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
          isDropTarget ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-400 border-dashed'
                       : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
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
            <><button onClick={commitRename} className="p-0.5 text-green-600"><Check className="w-3 h-3" /></button>
              <button onClick={cancelRename} className="p-0.5 text-gray-400"><X className="w-3 h-3" /></button></>
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
          {folder.pages.length === 0 && !isDropTarget ? (
            <div className="px-3 py-0.5 text-xs text-gray-400 italic">{t('notebook.noPages', 'No pages')}</div>
          ) : (
            folder.pages.map(page => (
              <PageItem key={page.id} page={page} activeNoteId={activeNoteId} onSelectNote={onSelectNote}
                onDeletePage={onDeletePage} currentUserId={currentUserId}
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

// ── Project view (drill-down level 2) ────────────────────────────────────────
function ProjectView({ project, activeNoteId, onSelectNote, onDeleteProject, onRenameProject, onCreateFolder, onDeleteFolder, onRenameFolder, onCreatePage, onDeletePage, currentUserId, dragRef, dropState, setDropState, onDrop }) {
  const { t } = useTranslation();
  const isOwner = project.created_by === currentUserId;
  const isPersonal = project.is_personal === 1;
  const isRootDrop = dropState?.type === 'root' && dropState.projectId === project.id;

  return (
    <div className="flex flex-col h-full">
      {/* Loose pages root drop zone */}
      {dragRef.current?.type === 'page' && dragRef.current?.page?.folder_id && (
        <div
          onDragOver={e => { e.preventDefault(); setDropState({ type: 'root', projectId: project.id }); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropState(null); }}
          onDrop={e => { e.preventDefault(); onDrop({ type: 'root', projectId: project.id }); }}
          className={`mx-2 mb-1 px-2 py-1 text-xs rounded border border-dashed transition-colors ${
            isRootDrop ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                       : 'border-gray-300 dark:border-gray-600 text-gray-400'
          }`}
        >
          {t('notebook.dropHereRoot', 'Drop here to remove from folder')}
        </div>
      )}

      {/* Loose pages */}
      {project.pages.map(page => (
        <PageItem key={page.id} page={page} activeNoteId={activeNoteId} onSelectNote={onSelectNote}
          onDeletePage={onDeletePage} currentUserId={currentUserId}
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
        <div className="px-3 py-2 text-xs text-gray-400 italic">{t('notebook.noPages', 'No pages')}</div>
      )}

      {/* Actions footer */}
      <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2 flex flex-col gap-0.5">
        <button onClick={() => onCreatePage(project.id)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" />{t('notebook.newPage', 'New page')}
        </button>
        <button onClick={() => onCreateFolder(project.id, t('notebook.newFolderName', 'New folder'))}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 hover:text-yellow-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
          <FolderOpen className="w-3.5 h-3.5" />{t('notebook.newFolder', 'New folder')}
        </button>
        {isOwner && !isPersonal && (
          <button onClick={() => onDeleteProject(project.id)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />{t('notebook.deleteProject', 'Delete project')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Projects list (drill-down level 1) ───────────────────────────────────────
function ProjectsList({ projects, activeNoteId, onSelectProject, onCreateProject, onReorderProjects }) {
  const { t } = useTranslation();
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [dropState, setDropState] = useState(null);
  const dragRef = useRef(null);
  const rowRefs = useRef({});
  const inputRef = useRef(null);

  const startCreate = () => { setNewProjectName(''); setCreatingProject(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const commit = () => { const v = newProjectName.trim(); if (v) onCreateProject(v); setCreatingProject(false); setNewProjectName(''); };
  const cancel = () => { setCreatingProject(false); setNewProjectName(''); };

  const countPages = (p) => p.pages.length + (p.folders || []).reduce((s, f) => s + f.pages.length, 0);
  const hasActive = (p) => p.pages.some(n => n.id === activeNoteId) ||
    (p.folders || []).some(f => f.pages.some(n => n.id === activeNoteId));

  const personal = projects.find(p => p.is_personal === 1);
  const shared = projects.filter(p => p.is_personal === 0);

  const getPosition = (e, id) => {
    const rect = rowRefs.current[id]?.getBoundingClientRect();
    return rect && e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  };

  const handleDrop = (targetId, position) => {
    const dragged = dragRef.current;
    dragRef.current = null;
    setDropState(null);
    if (!dragged || dragged.id === targetId) return;
    onReorderProjects(dragged, targetId, position);
  };

  const renderProject = (p) => {
    const isShared = p.is_personal === 0;
    const isDropBefore = dropState?.projectId === p.id && dropState.position === 'before';
    const isDropAfter  = dropState?.projectId === p.id && dropState.position === 'after';

    return (
      <div key={p.id} ref={el => rowRefs.current[p.id] = el}>
        <DropLine visible={isDropBefore} />
        <button
          draggable={isShared}
          onDragStart={isShared ? e => { e.stopPropagation(); dragRef.current = p; } : undefined}
          onDragOver={isShared ? e => {
            if (!dragRef.current || !dragRef.current.is_personal === 0) return;
            e.preventDefault(); e.stopPropagation();
            setDropState({ projectId: p.id, position: getPosition(e, p.id) });
          } : undefined}
          onDragLeave={isShared ? e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropState(null); } : undefined}
          onDrop={isShared ? e => { e.preventDefault(); e.stopPropagation(); handleDrop(p.id, getPosition(e, p.id)); } : undefined}
          onDragEnd={isShared ? () => { dragRef.current = null; setDropState(null); } : undefined}
          onClick={() => onSelectProject(p)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors group ${
            hasActive(p)
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
          } ${isShared ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          {p.is_personal === 1
            ? <Lock className="w-4 h-4 shrink-0 text-gray-400" />
            : <Globe className="w-4 h-4 shrink-0 text-gray-400" />
          }
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{p.name}</div>
            <div className="text-xs text-gray-400">{countPages(p)} {t('notebook.pages', 'pages')}</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <DropLine visible={isDropAfter} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {personal && renderProject(personal)}

        {shared.length > 0 && (
          <div className="mt-2 mb-1 px-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {t('notebook.shared', 'Shared')}
            </span>
          </div>
        )}
        {shared.map(renderProject)}

        {creatingProject && (
          <div className="flex items-center gap-1 px-2 py-1.5 mt-1">
            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input ref={inputRef} value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
              placeholder={t('notebook.projectName', 'Project name...')}
              className="flex-1 text-xs bg-white dark:bg-gray-800 border border-blue-400 rounded px-1 py-0.5 outline-none"
            />
            <button onClick={commit} className="p-0.5 text-green-600 hover:text-green-700"><Check className="w-3 h-3" /></button>
            <button onClick={cancel} className="p-0.5 text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button onClick={startCreate}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" />{t('notebook.newProject', 'New project')}
        </button>
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function NotebookSidebar({ projects, activeNoteId, onSelectNote, onCreateProject, onDeleteProject, onRenameProject, onCreateFolder, onDeleteFolder, onRenameFolder, onCreatePage, onDeletePage, onMovePage, onReorderPages, onReorderFolders, onReorderProjects, currentUserId }) {
  const { t } = useTranslation();
  const [selectedProject, setSelectedProject] = useState(null);
  const [dropState, setDropState] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const renameInputRef = useRef(null);
  const dragRef = useRef(null);

  // Keep selectedProject in sync if projects update
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
      else setSelectedProject(null);
    }
  }, [projects]);

  // Auto-navigate to the project of the active note
  useEffect(() => {
    if (!activeNoteId || selectedProject) return;
    const project = projects.find(p =>
      p.pages.some(n => n.id === activeNoteId) ||
      (p.folders || []).some(f => f.pages.some(n => n.id === activeNoteId))
    );
    if (project) setSelectedProject(project);
  }, [activeNoteId]);

  const handleDrop = (drop) => {
    setDropState(null);
    const dragged = dragRef.current;
    dragRef.current = null;
    if (!dragged) return;

    if (dragged.type === 'page') {
      const page = dragged.page;
      if (drop.type === 'folder') {
        if (page.folder_id !== drop.folderId) onMovePage(page.id, drop.folderId, drop.projectId);
      } else if (drop.type === 'root') {
        if (page.folder_id) onMovePage(page.id, null, drop.projectId);
      } else if (drop.type === 'page') {
        onReorderPages(page, drop.pageId, drop.position, drop.inFolderId, drop.projectId);
      }
    } else if (dragged.type === 'folder') {
      if (drop.type === 'folder-reorder') {
        onReorderFolders(dragged.folder, drop.folderId, drop.position, drop.projectId);
      }
    }
  };

  const startRename = () => {
    setRenameInput(selectedProject.name);
    setRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };
  const commitRename = () => {
    const v = renameInput.trim();
    if (v && v !== selectedProject.name) onRenameProject(selectedProject.id, v);
    setRenaming(false);
  };
  const cancelRename = () => setRenaming(false);

  const isPersonal = selectedProject?.is_personal === 1;
  const isOwner = selectedProject?.created_by === currentUserId;

  const commonProps = {
    activeNoteId, onSelectNote, onDeleteProject, onRenameProject,
    onCreateFolder, onDeleteFolder, onRenameFolder,
    onCreatePage, onDeletePage, currentUserId,
    dragRef, dropState, setDropState, onDrop: handleDrop
  };

  return (
    <div
      className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50"
      onDragEnd={() => { dragRef.current = null; setDropState(null); }}
    >
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-2.5 border-b border-gray-200 dark:border-gray-700 min-h-[44px]">
        {selectedProject ? (
          <>
            <button
              onClick={() => { setSelectedProject(null); setRenaming(false); }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
              title={t('notebook.back', 'Back')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-1">
              {isPersonal ? <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              {renaming ? (
                <input
                  ref={renameInputRef}
                  value={renameInput}
                  onChange={e => setRenameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename(); }}
                  className="flex-1 min-w-0 text-xs font-semibold bg-white dark:bg-gray-800 border border-blue-400 rounded px-1 outline-none"
                />
              ) : (
                <span className="flex-1 min-w-0 text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                  {selectedProject.name}
                </span>
              )}
            </div>
            {isOwner && !isPersonal && (
              renaming ? (
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={commitRename} className="p-1 text-green-600"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={cancelRename} className="p-1 text-gray-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={startRename} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </>
        ) : (
          <h2 className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4" />
            {t('notebook.title', 'Notebook')}
          </h2>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedProject ? (
          <div className="p-2">
            <ProjectView
              project={selectedProject}
              {...commonProps}
            />
          </div>
        ) : (
          <ProjectsList
            projects={projects}
            activeNoteId={activeNoteId}
            onSelectProject={setSelectedProject}
            onCreateProject={onCreateProject}
            onReorderProjects={onReorderProjects}
          />
        )}
      </div>
    </div>
  );
}
