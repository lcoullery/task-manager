import { Circle, CheckCircle2, Calendar, MessageSquare } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { ProfileAvatar } from '../Profiles/ProfileCard'
import { LabelBadge } from '../Labels/LabelBadge'
import { PRIORITY_COLORS } from '../../utils/colors'

export function TaskRow({ task, onClick }) {
  const { columns, getProfile, getLabel, archiveTask, unarchiveTask } = useApp()

  const column = columns.find((c) => c.id === task.status)
  const assignee = task.assignedTo ? getProfile(task.assignedTo) : null
  const priorityColors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'col-done'

  const handleArchiveToggle = (e) => {
    e.stopPropagation()
    if (task.archived) {
      unarchiveTask(task.id)
    } else {
      archiveTask(task.id)
    }
  }

  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        task.archived ? 'opacity-60' : ''
      }`}
    >
      {/* Archive toggle circle */}
      <td className="px-3 py-3 w-10">
        <button
          onClick={handleArchiveToggle}
          className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          title={task.archived ? 'Unarchive task' : 'Archive task'}
        >
          {task.archived ? (
            <CheckCircle2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
      </td>

      {/* Title */}
      <td className="px-3 py-3">
        <span
          className={`text-sm font-medium text-gray-900 dark:text-white ${
            task.archived ? 'line-through' : ''
          }`}
        >
          {task.title}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {column?.name || 'Unknown'}
        </span>
      </td>

      {/* Priority */}
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${priorityColors.dot}`} />
          <span className={priorityColors.text}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        </span>
      </td>

      {/* Assignee */}
      <td className="px-3 py-3">
        {assignee ? (
          <div className="flex items-center gap-2">
            <ProfileAvatar profile={assignee} size="sm" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Unassigned
          </span>
        )}
      </td>

      {/* Due Date */}
      <td className="px-3 py-3">
        {task.dueDate ? (
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              isOverdue
                ? 'text-red-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>

      {/* Labels */}
      <td className="px-3 py-3">
        {task.labels && task.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {task.labels.slice(0, 3).map((labelId) => {
              const label = getLabel(labelId)
              return label ? (
                <LabelBadge key={labelId} label={label} size="xs" />
              ) : null
            })}
            {task.labels.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>

      {/* Comments */}
      <td className="px-3 py-3">
        {task.comments && task.comments.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <MessageSquare className="w-3 h-3" />
            {task.comments.length}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
    </tr>
  )
}
