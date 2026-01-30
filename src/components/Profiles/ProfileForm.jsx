import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { AVATAR_COLORS } from '../../utils/colors'

export function ProfileForm({ isOpen, onClose, onSubmit, profile }) {
  const { t } = useTranslation()
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
      setError(t('profileForm.nameRequired'))
      return
    }

    onSubmit({ name: trimmedName, color })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('profileForm.editProfile') : t('profileForm.createProfile')}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('profileForm.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('profileForm.namePlaceholder')}
          error={error}
          autoFocus
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profileForm.avatarColor')}
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
            {t('profileForm.cancel')}
          </Button>
          <Button type="submit">
            {isEditing ? t('profileForm.saveChanges') : t('profileForm.createProfile')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
