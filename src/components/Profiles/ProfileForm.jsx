import { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { AVATAR_COLORS } from '../../utils/colors'

export function ProfileForm({ isOpen, onClose, onSubmit, profile }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [error, setError] = useState('')

  const isEditing = !!profile

  useEffect(() => {
    if (isOpen) {
      setName(profile?.name || '')
      setColor(profile?.color || AVATAR_COLORS[0])
      setError('')
    }
  }, [isOpen, profile])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Name is required')
      return
    }

    onSubmit({ name: trimmedName, color })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Profile' : 'Create Profile'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter profile name"
          error={error}
          autoFocus
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Avatar Color
          </label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${
                  color === c
                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-gray-900 dark:ring-white scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditing ? 'Save Changes' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
