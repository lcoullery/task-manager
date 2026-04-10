import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { useTranslation } from 'react-i18next';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, CheckSquare,
  Code, Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Save, Check, ChevronRight
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

function ToolbarButton({ onClick, isActive, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={title}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, readOnly }) {
  const { t } = useTranslation();

  if (!editor || readOnly) return null;

  const addLink = () => {
    const url = prompt('URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = prompt('Image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const iconSize = 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5 p-2 border-b border-gray-200 dark:border-gray-700 flex-wrap">
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
        <Bold className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
        <Italic className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
        <UnderlineIcon className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough className={iconSize} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 className={iconSize} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
        <List className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">
        <ListOrdered className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="Task List">
        <CheckSquare className={iconSize} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">
        <Code className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote">
        <Quote className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus className={iconSize} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Link">
        <LinkIcon className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Image">
        <ImageIcon className={iconSize} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo className={iconSize} />
      </ToolbarButton>
    </div>
  );
}

export default function NotebookEditor({ note, projectName, folderName, onUpdate, saveStatus }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(note.title);
  const readOnly = note.created_by !== note.currentUserId;
  const titleTimeoutRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: t('notebook.placeholder', 'Start writing...') }),
    ],
    content: note.content ? JSON.parse(note.content) : null,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onUpdate({ content: JSON.stringify(editor.getJSON()) });
    },
  });

  // Update title state when note changes
  useEffect(() => {
    setTitle(note.title);
  }, [note.id, note.title]);

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      onUpdate({ title: newTitle || 'Untitled' });
    }, 500);
  }, [onUpdate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      {projectName && (
        <div className="flex items-center gap-1 px-6 pt-3 text-xs text-gray-400 dark:text-gray-500">
          <span>{projectName}</span>
          {folderName && <><ChevronRight className="w-3 h-3" /><span>{folderName}</span></>}
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-500 dark:text-gray-400">{note.title || t('notebook.untitled', 'Untitled')}</span>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          readOnly={readOnly}
          className="flex-1 text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
          placeholder={t('notebook.untitled', 'Untitled')}
        />
        {saveStatus && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            {saveStatus === 'saving' ? (
              <><Save className="w-3.5 h-3.5 animate-pulse" /> {t('notebook.saving', 'Saving...')}</>
            ) : (
              <><Check className="w-3.5 h-3.5 text-green-500" /> {t('notebook.saved', 'Saved')}</>
            )}
          </span>
        )}
      </div>

      {/* Read-only banner */}
      {readOnly && (
        <div className="px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          {t('notebook.sharedBy', { name: note.author_name })} — {t('notebook.readOnly', 'Read only')}
        </div>
      )}

      {/* Toolbar */}
      <Toolbar editor={editor} readOnly={readOnly} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <EditorContent
          editor={editor}
          className="prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none
            [&_.tiptap]:outline-none [&_.tiptap]:min-h-[200px]
            [&_.tiptap_p]:my-0.5 [&_.tiptap_p]:leading-5
            [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400
            [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
            [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
            [&_.tiptap_p.is-editor-empty:first-child::before]:h-0
            [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
            [&_.tiptap_ul[data-type=taskList]]:list-none
            [&_.tiptap_ul[data-type=taskList]]:pl-0
            [&_.tiptap_ul[data-type=taskList]_li]:flex
            [&_.tiptap_ul[data-type=taskList]_li]:items-center
            [&_.tiptap_ul[data-type=taskList]_li]:gap-2
            [&_.tiptap_ul[data-type=taskList]_li]:my-0.5
            [&_.tiptap_ul[data-type=taskList]_li_label]:flex
            [&_.tiptap_ul[data-type=taskList]_li_label]:items-center
            [&_.tiptap_ul[data-type=taskList]_li_label]:mt-0
            [&_.tiptap_ul[data-type=taskList]_li_>div]:flex-1
            [&_.tiptap_ul[data-type=taskList]_li_>div_p]:my-0
          "
        />
      </div>
    </div>
  );
}
