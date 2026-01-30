import { useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { VIEW_CONFIGS, getTimelineRange, getHeaderCells, daysBetween, getTodayStr } from '../../utils/gantt'
import { GanttHeader } from './GanttHeader'
import { GanttRow } from './GanttRow'
import { TaskModal } from '../Tasks/TaskModal'

const VIEW_MODES = ['week', 'month', 'quarter', 'year']
const TASK_LIST_WIDTH = 240

export function GanttChart() {
  const { tasks, updateTask, getProfile } = useApp()
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState('month')
  const [selectedTask, setSelectedTask] = useState(null)
  const scrollRef = useRef(null)

  const VIEW_MODE_LABELS = {
    week: t('ganttChart.week'),
    month: t('ganttChart.month'),
    quarter: t('ganttChart.quarter'),
    year: t('ganttChart.year'),
  }

  // Filter out archived tasks
  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks])

  // Split tasks into those with dates vs without
  const { datedTasks, hiddenCount } = useMemo(() => {
    const dated = []
    let hidden = 0
    for (const t of activeTasks) {
      if (t.startDate || t.endDate) {
        dated.push(t)
      } else {
        hidden++
      }
    }
    return { datedTasks: dated, hiddenCount: hidden }
  }, [activeTasks])

  // Compute timeline range and header cells
  const { pxPerDay } = VIEW_CONFIGS[viewMode]
  const { start: timelineStart, end: timelineEnd, totalDays } = useMemo(
    () => getTimelineRange(datedTasks, viewMode),
    [datedTasks, viewMode]
  )
  const { topCells, bottomCells } = useMemo(
    () => getHeaderCells(timelineStart, timelineEnd, viewMode),
    [timelineStart, timelineEnd, viewMode]
  )

  const totalWidth = totalDays * pxPerDay

  // Today marker position
  const todayStr = getTodayStr()
  const todayOffset = daysBetween(timelineStart, todayStr) * pxPerDay

  const handleUpdateDates = useCallback((taskId, newStart, newEnd) => {
    const updates = {}
    if (newStart !== undefined) updates.startDate = newStart
    if (newEnd !== undefined) updates.endDate = newEnd
    updateTask(taskId, updates)
  }, [updateTask])

  // Keep selectedTask in sync with latest task data
  const currentSelectedTask = useMemo(() => {
    if (!selectedTask) return null
    return tasks.find((t) => t.id === selectedTask.id) || null
  }, [selectedTask, tasks])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800
        border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
        <div className="flex items-center gap-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                ${viewMode === mode
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
            >
              {VIEW_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        {hiddenCount > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('ganttChart.hiddenTasks', { count: hiddenCount })}
          </span>
        )}
      </div>

      {/* Scrollable chart area */}
      {datedTasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900
          rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {t('ganttChart.emptyState')}
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto bg-white dark:bg-gray-900
            rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700"
        >
          <div style={{ minWidth: `${TASK_LIST_WIDTH + totalWidth}px` }}>
            <GanttHeader
              topCells={topCells}
              bottomCells={bottomCells}
              viewMode={viewMode}
              taskListWidth={TASK_LIST_WIDTH}
            />

            <div className="relative">
              {/* Today marker */}
              {todayOffset >= 0 && todayOffset <= totalWidth && (
                <div
                  className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-red-400 z-10 pointer-events-none"
                  style={{ left: `${TASK_LIST_WIDTH + todayOffset}px` }}
                />
              )}

              {/* Task rows */}
              {datedTasks.map((task, i) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  timelineStart={timelineStart}
                  pxPerDay={pxPerDay}
                  totalDays={totalDays}
                  taskListWidth={TASK_LIST_WIDTH}
                  onTaskClick={setSelectedTask}
                  onUpdateDates={handleUpdateDates}
                  getProfile={getProfile}
                  isEven={i % 2 === 0}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={!!currentSelectedTask}
        onClose={() => setSelectedTask(null)}
        task={currentSelectedTask}
      />
    </div>
  )
}
