import { useState, useRef } from 'react'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { Modal, ConfirmModal } from '../common/Modal'
import { TaskForm } from './TaskForm'
import { CommentList } from './CommentList'
import { Button } from '../common/Button'

export function TaskModal({ isOpen, onClose, task }) {
  const { updateTask, deleteTask, archiveTask, unarchiveTask } = useApp()
  const { t } = useTranslation()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const taskFormRef = useRef()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Trigger TaskForm's submit via ref
    if (taskFormRef.current) {
      taskFormRef.current.submit()
    }
  }

  const handleTaskUpdate = (data) => {
    if (task) {
      updateTask(task.id, data)
    }
    onClose()
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form fields only - no buttons */}
          <TaskForm
            ref={taskFormRef}
            task={task}
            onSubmit={handleTaskUpdate}
            onCancel={onClose}
            hideButtons={true}
          />

          {/* Comment section above buttons */}
          <hr className="border-gray-200 dark:border-gray-700" />
          <CommentList taskId={task.id} comments={task.comments} />
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* All action buttons at the bottom */}
          <div className="flex justify-between">
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleArchiveToggle}
                type="button"
              >
                {task.archived ? (
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
