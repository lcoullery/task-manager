import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Select, Textarea } from '../common/Input'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../utils/storage'

export function BugReportModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const { profiles, getProfile } = useApp()
  const location = useLocation()

  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedProfileId || !message.trim()) {
      setError(t('bugReport.fillAllFields'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const profile = getProfile(selectedProfileId)
      const bugReport = {
        id: generateId(),
        profileId: selectedProfileId,
        profileName: profile?.name || 'Unknown',
        message: message.trim(),
        route: location.pathname,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugReport }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit bug report')
      }

      setSuccess(true)
      setMessage('')
      setSelectedProfileId('')

      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Error submitting bug report:', err)
      setError(t('bugReport.submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const profileOptions = profiles.map(p => ({
    value: p.id,
    label: p.name,
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('bugReport.reportBug')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('bugReport.reportedBy')} *
          </label>
          <Select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            options={profileOptions}
            placeholder={t('bugReport.selectProfile')}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Message Textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('bugReport.bugDescription')} *
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('bugReport.descriptionPlaceholder')}
            rows={6}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Current Page Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t('bugReport.currentPage')}: <span className="font-mono">{location.pathname}</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded">
            <p className="text-sm text-green-700 dark:text-green-200">
              {t('bugReport.submitSuccess')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            loading={isSubmitting}
            className="flex-1"
          >
            {t('bugReport.submit')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
