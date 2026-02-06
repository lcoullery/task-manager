import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'

export function UpdateNotification({
  updateInfo,
  onUpdateAndRestart,
  onClose,
  isDownloading,
  downloadComplete,
  downloadProgress,
  downloadError,
  onCancelDownload,
}) {
  const { t } = useTranslation()
  const [showError, setShowError] = useState(false)

  if (!updateInfo) return null

  const handleUpdateClick = async () => {
    setShowError(false)
    await onUpdateAndRestart()
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] z-50 animate-in slide-in-from-right-4">
      <div className="bg-white dark:bg-gray-800 border-l-4 border-blue-500 rounded-lg shadow-xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('updates.newVersionAvailable')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={isDownloading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Info */}
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>{t('updates.currentVersion')}:</span>
            <span className="font-mono text-gray-900 dark:text-white">
              {updateInfo.currentVersion}
            </span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>{t('updates.latestVersion')}:</span>
            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
              {updateInfo.latestVersion}
            </span>
          </div>
        </div>

        {/* Release Notes */}
        {updateInfo.releaseNotes && !isDownloading && !downloadComplete && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
              Release Notes:
            </p>
            <div className="max-h-24 overflow-y-auto text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {updateInfo.releaseNotes}
            </div>
          </div>
        )}

        {/* Download Progress Bar */}
        {isDownloading && downloadProgress && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{t('updates.downloadingProgress')}</span>
              <span>
                {formatBytes(downloadProgress.downloaded)} / {formatBytes(downloadProgress.total)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.progress}%` }}
              />
            </div>
            <div className="text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
              {downloadProgress.progress}%
            </div>
          </div>
        )}

        {/* Download Complete Message */}
        {downloadComplete && !downloadError && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded">
            <p className="text-sm font-semibold text-green-700 dark:text-green-200 mb-1">
              {t('updates.downloadCompleteTitle')}
            </p>
            <p className="text-xs text-green-600 dark:text-green-300">
              {t('updates.downloadCompleteMessage')}
            </p>
          </div>
        )}

        {/* Download Error Message */}
        {downloadError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded">
            <p className="text-sm text-red-700 dark:text-red-200">
              {t('updates.downloadErrorMessage')}
            </p>
          </div>
        )}

        {/* Security Note */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <p className="text-xs text-blue-700 dark:text-blue-200">
            {t('updates.securityNote')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!downloadComplete ? (
            <>
              {isDownloading ? (
                <>
                  {/* Show progress in button text */}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                    loading
                    className="flex-1"
                  >
                    {t('updates.downloading')} {downloadProgress?.progress || 0}%
                  </Button>
                  {/* Cancel button during download */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onCancelDownload}
                    className="flex-1"
                  >
                    {t('updates.cancel')}
                  </Button>
                </>
              ) : (
                <>
                  {/* Initial state: Download Update button */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleUpdateClick}
                    className="flex-1"
                  >
                    {t('updates.downloadUpdate')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    className="flex-1"
                  >
                    {t('updates.close')}
                  </Button>
                </>
              )}
            </>
          ) : (
            /* Download complete: Only Close button */
            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              {t('updates.close')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
