import { useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'

export function FileLinks({ taskId, fileLinks = [] }) {
  const { addFileLink, deleteFileLink } = useApp()
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  const handleAdd = () => {
    if (url.trim()) {
      addFileLink(taskId, url.trim(), title.trim())
      setUrl('')
      setTitle('')
    }
  }

  const sortedLinks = [...fileLinks].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('fileLinks.title', { count: fileLinks.length })}
      </h4>

      {sortedLinks.length > 0 && (
        <div className="space-y-2">
          {sortedLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group"
            >
              <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
                title={link.url}
              >
                {link.title || link.url}
              </a>
              <button
                type="button"
                onClick={() => deleteFileLink(taskId, link.id)}
                className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('fileLinks.deleteLink')}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder={t('fileLinks.urlPlaceholder')}
          className="input flex-1"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder={t('fileLinks.titlePlaceholder')}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!url.trim()}
          className="btn btn-primary px-3"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
