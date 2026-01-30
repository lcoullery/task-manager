import { useTranslation } from 'react-i18next'
import { daysBetween, VIEW_CONFIGS } from '../../utils/gantt'
import { PRIORITY_COLORS, getInitials, generateAvatarColor } from '../../utils/colors'
import { GanttBar } from './GanttBar'

export function GanttRow({
  task,
  timelineStart,
  pxPerDay,
  totalDays,
  taskListWidth,
  onTaskClick,
  onUpdateDates,
  getProfile,
  isEven,
}) {
  const { t } = useTranslation()
  const priorityColors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
  const assignee = task.assignedTo ? getProfile(task.assignedTo) : null
  const totalWidth = totalDays * pxPerDay

  const hasBothDates = task.startDate && task.endDate
  const hasSingleDate = (task.startDate || task.endDate) && !hasBothDates

  let barLeft = 0
  let barWidth = 0

  if (hasBothDates) {
    barLeft = daysBetween(timelineStart, task.startDate) * pxPerDay
    barWidth = Math.max(daysBetween(task.startDate, task.endDate) * pxPerDay, 8)
  }

  let markerLeft = 0
  if (hasSingleDate) {
    const singleDate = task.startDate || task.endDate
    markerLeft = daysBetween(timelineStart, singleDate) * pxPerDay
  }

  return (
    <div className={`flex h-10 border-b border-gray-100 dark:border-gray-700/50
      ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}>
      {/* Left cell: task info (sticky) */}
      <div
        className="flex-shrink-0 sticky left-0 z-10 flex items-center gap-2 px-3
          border-r border-gray-200 dark:border-gray-700
          bg-inherit cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50
          transition-colors"
        style={{ width: `${taskListWidth}px`, minWidth: `${taskListWidth}px` }}
        onClick={() => onTaskClick(task)}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors.dot}`}
          title={t('ganttRow.priorityLabel', { priority: t('filters.' + task.priority) })} />
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
          {task.title}
        </span>
        {assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center
              text-white text-[9px] font-bold flex-shrink-0"
            style={{ backgroundColor: assignee.color || generateAvatarColor(assignee.name) }}
            title={assignee.name}
          >
            {getInitials(assignee.name)}
          </div>
        )}
      </div>

      {/* Right area: timeline bar */}
      <div className="relative" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
        {hasBothDates && (
          <GanttBar
            task={task}
            left={barLeft}
            width={barWidth}
            pxPerDay={pxPerDay}
            onUpdateDates={onUpdateDates}
          />
        )}
        {hasSingleDate && (
          <div
            className={`absolute top-2.5 w-3 h-3 rotate-45 ${
              task.priority === 'high' ? 'bg-red-400' :
              task.priority === 'low' ? 'bg-gray-400' : 'bg-blue-400'
            }`}
            style={{ left: `${markerLeft - 6}px` }}
            title={`${task.startDate ? t('ganttRow.start') : t('ganttRow.end')}: ${task.startDate || task.endDate}`}
          />
        )}
      </div>
    </div>
  )
}
