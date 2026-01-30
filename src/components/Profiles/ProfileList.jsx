import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { ProfileCard } from './ProfileCard'
import { ProfileForm } from './ProfileForm'
import { ConfirmModal } from '../common/Modal'
import { Button } from '../common/Button'

export function ProfileList() {
  const { profiles, addProfile, updateProfile, deleteProfile } = useApp()
  const { t } = useTranslation()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const handleCreate = () => {
    setEditingProfile(null)
    setFormOpen(true)
  }

  const handleEdit = (profile) => {
    setEditingProfile(profile)
    setFormOpen(true)
  }

  const handleDelete = (profile) => {
    setDeleteConfirm(profile)
  }

  const handleSubmit = (data) => {
    if (editingProfile) {
      updateProfile(editingProfile.id, { name: data.name, color: data.color })
    } else {
      addProfile(data.name, data.color)
    }
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteProfile(deleteConfirm.id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('profileList.title')}
        </h2>
        <Button onClick={handleCreate} icon={Plus} size="sm">
          {t('profileList.addProfile')}
        </Button>
      </div>

      {profiles.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('profileList.emptyState')}
          </p>
          <Button onClick={handleCreate} icon={Plus}>
            {t('profileList.createProfile')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProfileForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        profile={editingProfile}
      />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title={t('profileList.deleteTitle')}
        message={t('profileList.deleteMessage', { name: deleteConfirm?.name })}
      />
    </div>
  )
}
