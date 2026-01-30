import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { LabelBadge, LabelColorDot } from '../Labels/LabelBadge'
import { LABEL_COLOR_OPTIONS } from '../../utils/colors'

export function LabelPicker({ selectedLabels = [], onChange }) {
  const { labels, addLabel } = useApp()
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')

  const toggleLabel = (labelId) => {
    if (selectedLabels.includes(labelId)) {
      onChange(selectedLabels.filter((id) => id !== labelId))
    } else {
      onChange([...selectedLabels, labelId])
    }
  }

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      const label = addLabel(newLabelName.trim(), newLabelColor)
      onChange([...selectedLabels, label.id])
      setNewLabelName('')
      setNewLabelColor('blue')
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('labelPicker.labels')}
      </label>

      <div className="flex flex-wrap gap-2">
        {labels.map((label) => {
          const isSelected = selectedLabels.includes(label.id)
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => toggleLabel(label.id)}
              className={`inline-flex items-center gap-1 rounded-full transition-all ${
                isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
              }`}
            >
              <LabelBadge label={label} size="md" />
              {isSelected && (
                <Check className="w-3 h-3 -ml-1 mr-1 text-blue-600" />
              )}
            </button>
          )
        })}
      </div>

      {isCreating ? (
        <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder={t('labelPicker.labelNamePlaceholder')}
            className="input"
            autoFocus
          />
          <div className="flex items-center gap-2">
            {LABEL_COLOR_OPTIONS.map((color) => (
              <LabelColorDot
                key={color}
                color={color}
                selected={newLabelColor === color}
                onClick={setNewLabelColor}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateLabel}
              className="btn btn-primary text-sm px-3 py-1"
            >
              {t('labelPicker.add')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setNewLabelName('')
              }}
              className="btn btn-secondary text-sm px-3 py-1"
            >
              {t('labelPicker.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Plus className="w-3 h-3" />
          {t('labelPicker.createNewLabel')}
        </button>
      )}
    </div>
  )
}
