import { useState, useRef } from 'react'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { Modal, ConfirmModal } from '../common/Modal'
import { TaskForm } from './TaskForm'
import { CommentList } from './CommentList'
import { Button } from '../common/Button'

export function TaskModal({ isOpen, onClose, task }) {
  const { tasks, updateTask, deleteTask, archiveTask, unarchiveTask } = useApp()
  const { t } = useTranslation()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const taskFormRef = useRef()

  // Get fresh task data from context to reflect real-time updates (e.g., comments)
  const currentTask = tasks.find(t => t.id === task?.id) || task

  const handleSubmit = (e) => {
    e.preventDefault()
    // Trigger TaskForm's submit via ref
    if (taskFormRef.current) {
      taskFormRef.current.submit()
    }
  }

  const handleTaskUpdate = (data) => {
    if (currentTask) {
      updateTask(currentTask.id, data)
    }
    onClose()
  }

  const handleDelete = () => {
    deleteTask(currentTask.id)
    onClose()
  }

  const handleArchiveToggle = () => {
    if (currentTask.archived) {
      unarchiveTask(currentTask.id)
    } else {
      archiveTask(currentTask.id)
    }
  }

  if (!currentTask) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('taskModal.taskDetails')} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form fields only - no buttons */}
          <TaskForm
            ref={taskFormRef}
            task={currentTask}
            onSubmit={handleTaskUpdate}
            onCancel={onClose}
            hideButtons={true}
          />

          {/* Comment section above buttons */}
          <hr className="border-gray-200 dark:border-gray-700" />
          <CommentList taskId={currentTask.id} comments={currentTask.comments} />
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* All action buttons at the bottom */}
          <div className="flex justify-between">
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleArchiveToggle}
                type="button"
              >
                {currentTask.archived ? (
                  <>
                    <ArchiveRestore className="w-4 h-4" />
                    {t('taskModal.unarchive')}
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    {t('taskModal.archive')}
                  </>
                )}
              </Button>
              <Button
                variant="danger"
                onClick={() => setDeleteConfirm(true)}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                {t('taskModal.delete')}
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} type="button">
                {t('modal.cancel')}
              </Button>
              <Button type="submit">
                {t('taskForm.saveChanges')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('taskModal.deleteTitle')}
        message={t('taskModal.deleteMessage', { title: currentTask.title })}
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
