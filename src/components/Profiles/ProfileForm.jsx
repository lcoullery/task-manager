import { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { Input } from '../common/Input'
import { Button } from '../common/Button'

export function ProfileForm({ isOpen, onClose, onSubmit, profile }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const isEditing = !!profile

  useEffect(() => {
    if (isOpen) {
      setName(profile?.name || '')
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

    onSubmit({ name: trimmedName })
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
