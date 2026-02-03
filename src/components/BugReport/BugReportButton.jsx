import { useState } from 'react'
import { Bug } from 'lucide-react'
import { BugReportModal } from './BugReportModal'
import { useTranslation } from 'react-i18next'

export function BugReportButton() {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        title={t('bugReport.reportBug')}
        aria-label={t('bugReport.reportBug')}
      >
        <Bug className="w-6 h-6" />
      </button>

      {isModalOpen && (
        <BugReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
