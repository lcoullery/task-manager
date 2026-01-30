import { useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { ConfirmModal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'

export function ColumnEditor() {
  const { columns, addColumn, updateColumn, deleteColumn, reorderColumns } = useApp()
  const { t } = useTranslation()
  const [isAdding, setIsAdding] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const handleAdd = () => {
    if (newColumnName.trim()) {
      addColumn(newColumnName.trim())
      setNewColumnName('')
      setIsAdding(false)
    }
  }

  const handleStartEdit = (column) => {
    setEditingId(column.id)
    setEditName(column.name)
  }

  const handleSaveEdit = () => {
    if (editName.trim()) {
      updateColumn(editingId, { name: editName.trim() })
      setEditingId(null)
    }
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const newOrder = Array.from(columns.map((c) => c.id))
    const [removed] = newOrder.splice(result.source.index, 1)
    newOrder.splice(result.destination.index, 0, removed)
    reorderColumns(newOrder)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteColumn(deleteConfirm.id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('columnEditor.title')}
        </h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} icon={Plus} size="sm">
            {t('columnEditor.addColumn')}
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="card p-4 flex gap-2">
          <Input
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder={t('columnEditor.columnNamePlaceholder')}
            autoFocus
          />
          <Button onClick={handleAdd} size="sm">
            {t('columnEditor.add')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setIsAdding(false)
              setNewColumnName('')
            }}
            size="sm"
          >
            {t('columnEditor.cancel')}
          </Button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="columns">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {columns.map((column, index) => (
                <Draggable key={column.id} draggableId={column.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`card p-3 flex items-center gap-3 ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {editingId === column.id ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium text-gray-900 dark:text-white">
                            {column.name}
                          </span>
                          <button
                            onClick={() => handleStartEdit(column)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(column)}
                            disabled={columns.length <= 1}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title={t('columnEditor.deleteTitle')}
        message={t('columnEditor.deleteMessage', { name: deleteConfirm?.name })}
      />
    </div>
  )
}
