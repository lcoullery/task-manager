import { useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { ProfileAvatar } from '../Profiles/ProfileCard'

export function CommentList({ taskId, comments = [] }) {
  const { profiles, getProfile, addComment, deleteComment } = useApp()
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [authorId, setAuthorId] = useState(profiles[0]?.id || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (text.trim() && authorId) {
      addComment(taskId, text.trim(), authorId)
      setText('')
    }
  }

  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('comments.title', { count: comments.length })}
      </h4>

      {sortedComments.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {sortedComments.map((comment) => {
            const author = getProfile(comment.authorId)
            return (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <ProfileAvatar profile={author} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {author?.name || t('comments.unknown')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
                <button
                  onClick={() => deleteComment(taskId, comment.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                  title={t('comments.deleteComment')}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        {profiles.length > 1 && (
          <select
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            className="input text-sm py-1"
          >
            <option value="">{t('comments.postAs')}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={profiles.length === 0 ? t('comments.createProfileToComment') : t('comments.addComment')}
            className="input flex-1"
            disabled={profiles.length === 0}
          />
          <button
            type="submit"
            disabled={!text.trim() || !authorId}
            className="btn btn-primary px-3"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
