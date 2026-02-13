import { useState, useMemo, useCallback, useRef } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { Plus, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { useKeyboard, createShortcuts } from '../../hooks/useKeyboard'
import { Column } from './Column'
import { Filters, ActiveFilterTags } from '../Tasks/Filters'
import { TaskModal, CreateTaskModal } from '../Tasks/TaskModal'
import { Button } from '../common/Button'
import { ConfirmModal } from '../common/Modal'

export function Board() {
  const { columns, tasks, moveTask, archiveAllDone } = useApp()
  const { t } = useTranslation()
  const [selectedTask, setSelectedTask] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    assignee: '',
    priority: '',
    labelId: '',
    showArchived: false,
  })

  const searchRef = useRef(null)

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Archive filter
      if (!filters.showArchived && task.archived) return false

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !task.title.toLowerCase().includes(searchLower) &&
          !(task.description || '').toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Assignee filter
      if (filters.assignee) {
        if (filters.assignee === 'unassigned') {
          if (task.assignedTo) return false
        } else if (task.assignedTo !== filters.assignee) {
          return false
        }
      }

      // Priority filter
      if (filters.priority && task.priority !== filters.priority) {
        return false
      }

      // Label filter
      if (filters.labelId && !task.labels?.includes(filters.labelId)) {
        return false
      }

      return true
    })
  }, [tasks, filters])

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped = {}
    columns.forEach((col) => {
      grouped[col.id] = filteredTasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => (a.archived ? 1 : 0) - (b.archived ? 1 : 0) || (a.order || 0) - (b.order || 0))
    })
    return grouped
  }, [columns, filteredTasks])

  // Count done tasks for archive button
  const doneTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'col-done' && !t.archived).length
  }, [tasks])

  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) return

      const { draggableId, destination } = result
      const targetColumn = columns.find((c) => c.id === destination.droppableId)
      moveTask(draggableId, destination.droppableId, destination.index)

      // Show toast when task is auto-archived
      if (targetColumn?.autoArchive) {
        const task = tasks.find((t) => t.id === draggableId)
        window.dispatchEvent(
          new CustomEvent('show-update-toast', {
            detail: {
              message: t('board.autoArchived', { title: task?.title || '' }),
              variant: 'info',
              duration: 3000,
            },
          })
        )
      }
    },
    [moveTask, columns, tasks, t]
  )

  // Keyboard shortcuts
  useKeyboard(
    createShortcuts({
      newTask: () => setCreateModalOpen(true),
      closeModal: () => {
        setSelectedTask(null)
        setCreateModalOpen(false)
      },
      focusSearch: () => {
        document.getElementById('task-search')?.focus()
      },
    })
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Filters filters={filters} onChange={setFilters} />
        <div className="flex items-center gap-2 flex-shrink-0">
          {doneTasksCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => setArchiveConfirm(true)}
              icon={Archive}
              size="sm"
            >
              {t('board.archiveDone', { count: doneTasksCount })}
            </Button>
          )}
          <Button onClick={() => setCreateModalOpen(true)} icon={Plus}>
            {t('board.newTask')}
          </Button>
        </div>
      </div>

      <ActiveFilterTags filters={filters} onChange={setFilters} />

      <div className="flex-1 overflow-x-auto mt-4 min-h-0">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
                onTaskClick={setSelectedTask}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      <TaskModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />

      <CreateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <ConfirmModal
        isOpen={archiveConfirm}
        onClose={() => setArchiveConfirm(false)}
        onConfirm={archiveAllDone}
        title={t('board.archiveAllTitle')}
        message={t('board.archiveAllMessage', { count: doneTasksCount })}
        confirmText={t('board.archiveConfirm')}
        confirmVariant="primary"
      />
    </div>
  )
}
