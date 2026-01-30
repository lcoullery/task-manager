import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { LabelBadge, LabelColorDot } from './LabelBadge'
import { LABEL_COLOR_OPTIONS } from '../../utils/colors'
import { ConfirmModal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'

export function LabelManager() {
  const { labels, addLabel, updateLabel, deleteLabel } = useApp()
  const { t } = useTranslation()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [newLabel, setNewLabel] = useState({ name: '', color: 'blue' })
  const [editLabel, setEditLabel] = useState({ name: '', color: 'blue' })

  const handleAdd = () => {
    if (newLabel.name.trim()) {
      addLabel(newLabel.name.trim(), newLabel.color)
      setNewLabel({ name: '', color: 'blue' })
      setIsAdding(false)
    }
  }

  const handleStartEdit = (label) => {
    setEditingId(label.id)
    setEditLabel({ name: label.name, color: label.color })
  }

  const handleSaveEdit = () => {
    if (editLabel.name.trim()) {
      updateLabel(editingId, { name: editLabel.name.trim(), color: editLabel.color })
      setEditingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteLabel(deleteConfirm.id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('labelManager.title')}
        </h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} icon={Plus} size="sm">
            {t('labelManager.addLabel')}
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="card p-4 space-y-3">
          <Input
            placeholder={t('labelManager.labelNamePlaceholder')}
            value={newLabel.name}
            onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">{t('labelManager.color')}</span>
            {LABEL_COLOR_OPTIONS.map((color) => (
              <LabelColorDot
                key={color}
                color={color}
                selected={newLabel.color === color}
                onClick={(c) => setNewLabel({ ...newLabel, color: c })}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm">
              {t('labelManager.create')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsAdding(false)
                setNewLabel({ name: '', color: 'blue' })
              }}
              size="sm"
            >
              {t('labelManager.cancel')}
            </Button>
          </div>
        </div>
      )}

      {labels.length === 0 && !isAdding ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          {t('labelManager.emptyState')}
        </p>
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="card p-3 flex items-center gap-3"
            >
              {editingId === label.id ? (
                <>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editLabel.name}
                      onChange={(e) => setEditLabel({ ...editLabel, name: e.target.value })}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      {LABEL_COLOR_OPTIONS.map((color) => (
                        <LabelColorDot
                          key={color}
                          color={color}
                          selected={editLabel.color === color}
                          onClick={(c) => setEditLabel({ ...editLabel, color: c })}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                    title={t('labelManager.save')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title={t('labelManager.cancelEdit')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <LabelBadge label={label} size="md" />
                  <div className="flex-1" />
                  <button
                    onClick={() => handleStartEdit(label)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={t('labelManager.editLabel')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(label)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={t('labelManager.deleteLabel')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title={t('labelManager.deleteTitle')}
        message={t('labelManager.deleteMessage', { name: deleteConfirm?.name })}
      />
    </div>
  )
}
