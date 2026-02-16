import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { Input, Textarea, Select } from '../common/Input'
import { Button } from '../common/Button'
import { LabelPicker } from './LabelPicker'

export const TaskForm = forwardRef(function TaskForm({ task, onSubmit, onCancel, hideButtons = false }, ref) {
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
  const [duration, setDuration] = useState('')

  const computeDuration = (start, end) => {
    if (!start || !end) return ''
    const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))
    return diff >= 0 ? String(diff + 1) : ''
  }

  const addDaysToDate = (dateStr, days) => {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days - 1)
    return d.toISOString().split('T')[0]
  }

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
      setDuration(computeDuration(task.startDate, task.endDate))
    }
  }, [task?.id])

  const handleChange = (field) => (e) => {
    const value = e.target.value
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'startDate' && duration && value) {
        next.endDate = addDaysToDate(value, Number(duration))
      } else if (field === 'startDate' || field === 'endDate') {
        setDuration(computeDuration(
          field === 'startDate' ? value : prev.startDate,
          field === 'endDate' ? value : prev.endDate
        ))
      }
      return next
    })
  }

  const handleDurationChange = (e) => {
    const val = e.target.value
    setDuration(val)
    if (val && formData.startDate && Number(val) > 0) {
      setFormData((prev) => ({ ...prev, endDate: addDaysToDate(prev.startDate, Number(val)) }))
    }
  }

  const handleLabelsChange = (labels) => {
    setFormData((prev) => ({ ...prev, labels }))
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    if (!formData.title.trim()) return

    onSubmit({
      ...formData,
      title: formData.title.trim(),
      assignedTo: formData.assignedTo || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
    })
  }

  // Expose submit handler to parent via ref
  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit()
  }))

  const profileOptions = profiles.map((p) => ({ value: p.id, label: p.name }))
  const columnOptions = columns.map((c) => ({ value: c.id, label: c.name }))

  const formFields = (
    <>
      <Input
        label={t('taskForm.title')}
        value={formData.title}
        onChange={handleChange('title')}
        placeholder={t('taskForm.titlePlaceholder')}
        required
        autoFocus
        name="title"
      />

      <Textarea
        label={t('taskForm.description')}
        value={formData.description}
        onChange={handleChange('description')}
        placeholder={t('taskForm.descriptionPlaceholder')}
        rows={3}
        name="description"
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('taskForm.status')}
          value={formData.status}
          onChange={handleChange('status')}
          options={columnOptions}
          name="status"
        />

        <Select
          label={t('taskForm.priority')}
          value={formData.priority}
          onChange={handleChange('priority')}
          options={PRIORITY_OPTIONS}
          name="priority"
        />
      </div>

      <Select
        label={t('taskForm.assignee')}
        value={formData.assignedTo}
        onChange={handleChange('assignedTo')}
        options={profileOptions}
        placeholder={t('taskForm.unassigned')}
        name="assignedTo"
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label={t('taskForm.startDate')}
          type="date"
          value={formData.startDate}
          onChange={handleChange('startDate')}
          name="startDate"
        />

        <Input
          label={t('taskForm.endDate')}
          type="date"
          value={formData.endDate}
          onChange={handleChange('endDate')}
          name="endDate"
        />

        <Input
          label={t('taskForm.duration')}
          type="number"
          value={duration}
          onChange={handleDurationChange}
          name="duration"
          min="1"
        />
      </div>

      <LabelPicker
        selectedLabels={formData.labels}
        onChange={handleLabelsChange}
      />
    </>
  )

  if (hideButtons) {
    return <div className="space-y-4">{formFields}</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formFields}
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
})
