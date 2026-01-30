import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { useKeyboard, createShortcuts } from '../../hooks/useKeyboard'
import { Filters, ActiveFilterTags } from '../Tasks/Filters'
import { TaskModal, CreateTaskModal } from '../Tasks/TaskModal'
import { Button } from '../common/Button'
import { TaskRow } from './TaskRow'

export function TaskListView() {
  const { tasks } = useApp()
  const { t } = useTranslation()
  const [selectedTask, setSelectedTask] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    assignee: '',
    priority: '',
    labelId: '',
    showArchived: true,
  })

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!filters.showArchived && task.archived) return false

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !task.title.toLowerCase().includes(searchLower) &&
          !(task.description || '').toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      if (filters.assignee) {
        if (filters.assignee === 'unassigned') {
          if (task.assignedTo) return false
        } else if (task.assignedTo !== filters.assignee) {
          return false
        }
      }

      if (filters.priority && task.priority !== filters.priority) {
        return false
      }

      if (filters.labelId && !task.labels?.includes(filters.labelId)) {
        return false
      }

      return true
    })
  }, [tasks, filters])

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
          <Button onClick={() => setCreateModalOpen(true)} icon={Plus}>
            {t('taskListView.newTask')}
          </Button>
        </div>
      </div>

      <ActiveFilterTags filters={filters} onChange={setFilters} />

      <div className="flex-1 overflow-auto mt-4">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 w-10" />
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('taskListView.headerTitle')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('taskListView.headerStatus')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('taskListView.headerPriority')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('taskListView.headerAssignee')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('taskListView.headerDueDate')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('taskListView.headerLabels')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('taskListView.headerComments')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </tbody>
          </table>

          {filteredTasks.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              {t('taskListView.emptyState')}
            </div>
          )}
        </div>
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
    </div>
  )
}
