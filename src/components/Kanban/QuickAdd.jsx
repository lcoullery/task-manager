import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function QuickAdd({ columnId }) {
  const { addTask } = useApp()
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (title.trim()) {
      addTask({ title: title.trim(), status: columnId })
      setTitle('')
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setTitle('')
      setIsAdding(false)
    }
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add task
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setIsAdding(false)
          }
        }}
        placeholder="Task title..."
        className="input text-sm"
        autoFocus
      />
      <div className="flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary text-sm px-3 py-1">
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setTitle('')
            setIsAdding(false)
          }}
          className="btn btn-secondary text-sm px-3 py-1"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
