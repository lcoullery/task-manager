import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Input, Textarea, Select } from '../common/Input'
import { Button } from '../common/Button'
import { LabelPicker } from './LabelPicker'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function TaskForm({ task, onSubmit, onCancel }) {
  const { profiles, columns } = useApp()
  const isEditing = !!task

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: columns[0]?.id || '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
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
        dueDate: task.dueDate || '',
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
      dueDate: formData.dueDate || null,
    })
  }

  const profileOptions = profiles.map((p) => ({ value: p.id, label: p.name }))
  const columnOptions = columns.map((c) => ({ value: c.id, label: c.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={formData.title}
        onChange={handleChange('title')}
        placeholder="Task title"
        required
        autoFocus
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={handleChange('description')}
        placeholder="Add a description..."
        rows={3}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Status"
          value={formData.status}
          onChange={handleChange('status')}
          options={columnOptions}
        />

        <Select
          label="Priority"
          value={formData.priority}
          onChange={handleChange('priority')}
          options={PRIORITY_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Assignee"
          value={formData.assignedTo}
          onChange={handleChange('assignedTo')}
          options={profileOptions}
          placeholder="Unassigned"
        />

        <Input
          label="Due Date"
          type="date"
          value={formData.dueDate}
          onChange={handleChange('dueDate')}
        />
      </div>

      <LabelPicker
        selectedLabels={formData.labels}
        onChange={handleLabelsChange}
      />

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Save Changes' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}
