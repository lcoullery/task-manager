import { Draggable } from '@hello-pangea/dnd'
import { Calendar, MessageSquare, Link } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { ProfileAvatar } from '../Profiles/ProfileCard'
import { LabelBadge } from '../Labels/LabelBadge'
import { PRIORITY_COLORS } from '../../utils/colors'
import { AssigneeQuickPicker } from './AssigneeQuickPicker'

export function TaskCard({ task, index, onClick }) {
  const { getProfile, getLabel } = useApp()
  const assignee = task.assignedTo ? getProfile(task.assignedTo) : null
  const priorityColors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium

  const isOverdue = task.endDate && new Date(task.endDate) < new Date() && task.status !== 'col-done'

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`card p-3 cursor-pointer hover:shadow-md transition-shadow ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          } ${task.archived ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full mt-1.5 ${priorityColors.dot}`} title={`${task.priority} priority`} />
            <h4 className="flex-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
              {task.title}
            </h4>
          </div>

          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.labels.slice(0, 3).map((labelId) => {
                const label = getLabel(labelId)
                return label ? <LabelBadge key={labelId} label={label} size="xs" /> : null
              })}
              {task.labels.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{task.labels.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-3">
              {task.endDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                  <Calendar className="w-3 h-3" />
                  {new Date(task.endDate).toLocaleDateString()}
                </span>
              )}
              {task.fileLinks && task.fileLinks.length > 0 && (
                <button
                  className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    task.fileLinks.forEach((l) => window.open(l.url, '_blank', 'noopener,noreferrer'))
                  }}
                  title={task.fileLinks.map((l) => l.title || l.url).join(', ')}
                >
                  <Link className="w-3 h-3" />
                  {task.fileLinks.length}
                </button>
              )}
              {task.comments && task.comments.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {task.comments.length}
                </span>
              )}
            </div>
            {assignee ? (
              <ProfileAvatar profile={assignee} size="sm" />
            ) : (
              <AssigneeQuickPicker taskId={task.id} />
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}
