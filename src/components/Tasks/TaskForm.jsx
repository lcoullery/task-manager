import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { Input, Textarea, Select } from '../common/Input'
import { Button } from '../common/Button'
import { LabelPicker } from './LabelPicker'

export function TaskForm({ task, onSubmit, onCancel }) {
  const { profiles, columns } = useApp()
  const { t } = useTranslation()
  const isEditing = !!task

  const PRIORITY_OPTIONS = [
    { value: 'low', label: t('taskForm.priorityLow') },
    { value: 'medium', label: t('taskForm.priorityMedium') },
    { value: 'high', label: t('taskForm.priorityHigh') },
  ]

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: columns[0]?.id || '',
    priority: 'medium',
    assignedTo: '',
    startDate: '',
    endDate: '',
    labels: [],
  })

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || columns[0]?.id || '',
        priority: task.priority || 'medium',
        assignedTo: task.assignedTo || '',
        startDate: task.startDate || '',
        endDate: task.endDate || '',
        labels: task.labels || [],
      })
    }
  }, [task?.id])

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleLabelsChange = (labels) => {
    setFormData((prev) => ({ ...prev, labels }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    onSubmit({
      ...formData,
      title: formData.title.trim(),
      assignedTo: formData.assignedTo || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
    })
  }

  const profileOptions = profiles.map((p) => ({ value: p.id, label: p.name }))
  const columnOptions = columns.map((c) => ({ value: c.id, label: c.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('taskForm.title')}
        value={formData.title}
        onChange={handleChange('title')}
        placeholder={t('taskForm.titlePlaceholder')}
        required
        autoFocus
      />

      <Textarea
        label={t('taskForm.description')}
        value={formData.description}
        onChange={handleChange('description')}
        placeholder={t('taskForm.descriptionPlaceholder')}
        rows={3}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('taskForm.status')}
          value={formData.status}
          onChange={handleChange('status')}
          options={columnOptions}
        />

        <Select
          label={t('taskForm.priority')}
          value={formData.priority}
          onChange={handleChange('priority')}
          options={PRIORITY_OPTIONS}
        />
      </div>

      <Select
        label={t('taskForm.assignee')}
        value={formData.assignedTo}
        onChange={handleChange('assignedTo')}
        options={profileOptions}
        placeholder={t('taskForm.unassigned')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('taskForm.startDate')}
          type="date"
          value={formData.startDate}
          onChange={handleChange('startDate')}
        />

        <Input
          label={t('taskForm.endDate')}
          type="date"
          value={formData.endDate}
          onChange={handleChange('endDate')}
        />
      </div>

      <LabelPicker
        selectedLabels={formData.labels}
        onChange={handleLabelsChange}
      />

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          {t('taskForm.cancel')}
        </Button>
        <Button type="submit">
          {isEditing ? t('taskForm.saveChanges') : t('taskForm.createTask')}
        </Button>
      </div>
    </form>
  )
}
