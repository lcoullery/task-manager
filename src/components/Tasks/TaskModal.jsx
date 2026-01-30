import { useState } from 'react'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { Modal, ConfirmModal } from '../common/Modal'
import { TaskForm } from './TaskForm'
import { CommentList } from './CommentList'

export function TaskModal({ isOpen, onClose, task }) {
  const { updateTask, deleteTask, archiveTask, unarchiveTask } = useApp()
  const { t } = useTranslation()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showForm, setShowForm] = useState(!task)

  const handleSubmit = (data) => {
    if (task) {
      updateTask(task.id, data)
      setShowForm(false)
    }
  }

  const handleDelete = () => {
    deleteTask(task.id)
    onClose()
  }

  const handleArchiveToggle = () => {
    if (task.archived) {
      unarchiveTask(task.id)
    } else {
      archiveTask(task.id)
    }
  }

  if (!task) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('taskModal.taskDetails')} size="lg">
        <div className="space-y-6">
          {showForm ? (
            <TaskForm
              task={task}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-secondary text-sm"
                >
                  {t('taskModal.edit')}
                </button>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <CommentList taskId={task.id} comments={task.comments} />

              <hr className="border-gray-200 dark:border-gray-700" />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleArchiveToggle}
                  className="btn btn-secondary text-sm"
                >
                  {task.archived ? (
                    <>
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      {t('taskModal.unarchive')}
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-2" />
                      {t('taskModal.archive')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="btn btn-danger text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('taskModal.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('taskModal.deleteTitle')}
        message={t('taskModal.deleteMessage', { title: task.title })}
      />
    </>
  )
}

export function CreateTaskModal({ isOpen, onClose, defaultStatus }) {
  const { addTask } = useApp()
  const { t } = useTranslation()

  const handleSubmit = (data) => {
    addTask({ ...data, status: defaultStatus || data.status })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('taskModal.createTask')} size="lg">
      <TaskForm onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  )
}
