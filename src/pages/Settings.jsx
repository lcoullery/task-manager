import { useState, useRef, useEffect } from 'react'
import { Moon, Sun, Download, Upload, RefreshCw, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useApp } from '../context/AppContext'
import { useUpdateChecker } from '../hooks/useUpdateChecker'
import { ColumnEditor } from '../components/Kanban/ColumnEditor'
import { LabelManager } from '../components/Labels/LabelManager'
import { Button } from '../components/common/Button'
import { ConfirmModal } from '../components/common/Modal'
import { loadConfig, saveConfig } from '../utils/storage'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

export function Settings() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings, exportToFile, importFromFile, reset, reload } = useApp()
  const { t, i18n } = useTranslation()
  const [resetConfirm, setResetConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const fileInputRef = useRef(null)
  const [dataFilePath, setDataFilePath] = useState('')
  const [filePathStatus, setFilePathStatus] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [checkStatus, setCheckStatus] = useState(null) // 'checking', 'upToDate', 'updateAvailable'
  const { checkForUpdates, isChecking, updateInfo, error } = useUpdateChecker(false)

  // Load current file path on mount
  useEffect(() => {
    loadConfig().then(config => {
      setDataFilePath(config.dataFilePath || './data/tasks.json')
    }).catch(() => {
      setDataFilePath('./data/tasks.json')
    })
  }, [])

  // Fetch current version on mount
  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setCurrentVersion(data.version))
      .catch(err => console.error('Failed to fetch version:', err))
  }, [])

  const handleSaveFilePath = async () => {
    try {
      await saveConfig({ dataFilePath })
      setFilePathStatus('success')
      setTimeout(() => setFilePathStatus(null), 3000)
      // Trigger reload to load from new location
      reload()
    } catch (err) {
      // Show detailed error message
      console.error('Save path error:', err)
      const errorMsg = err.message || 'Unknown error'
      setFilePathStatus(`error: ${errorMsg}`)
      setTimeout(() => setFilePathStatus(null), 6000)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const success = await importFromFile(file)
      setImportStatus(success ? 'success' : 'error')
      setTimeout(() => setImportStatus(null), 3000)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    updateSettings({ language: langCode })
  }

  const handleManualCheck = async () => {
    setCheckStatus('checking')
    await checkForUpdates()
  }

  // Update check status based on updateInfo
  useEffect(() => {
    if (updateInfo?.hasUpdate) {
      setCheckStatus('updateAvailable')
    } else if (updateInfo !== null && !updateInfo.hasUpdate) {
      setCheckStatus('upToDate')
    } else if (!isChecking && checkStatus === 'checking') {
      setCheckStatus(null)
    }
  }, [updateInfo, isChecking, checkStatus])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>

      {/* Theme */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.appearance')}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-gray-700 dark:text-gray-300">{t('settings.theme')}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              {t('settings.light')}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              {t('settings.dark')}
            </button>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.language')}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-gray-700 dark:text-gray-300">{t('settings.languageLabel')}</span>
          <div className="flex gap-2">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                  i18n.language === code
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Auto Refresh */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.syncSettings')}
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoRefreshEnabled}
              onChange={(e) => updateSettings({ autoRefreshEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-gray-900 dark:text-white font-medium">
                {t('settings.autoRefresh')}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.autoRefreshDesc')}
              </p>
            </div>
          </label>

          {settings.autoRefreshEnabled && (
            <div className="flex items-center gap-3 ml-7">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.refreshEvery')}</span>
              <select
                value={settings.autoRefreshInterval}
                onChange={(e) =>
                  updateSettings({ autoRefreshInterval: parseInt(e.target.value) })
                }
                className="input w-auto"
              >
                <option value={3000}>{t('settings.3seconds')}</option>
                <option value={5000}>{t('settings.5seconds')}</option>
                <option value={10000}>{t('settings.10seconds')}</option>
                <option value={30000}>{t('settings.30seconds')}</option>
                <option value={60000}>{t('settings.1minute')}</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Auto Updates */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.autoUpdates')}
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoUpdateEnabled}
              onChange={(e) => updateSettings({ autoUpdateEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-gray-900 dark:text-white font-medium">
                {t('settings.enableUpdateCheck')}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.enableUpdateCheckDesc')}
              </p>
            </div>
          </label>

          {settings.autoUpdateEnabled && (
            <div className="flex items-center gap-3 ml-7">
              <span className="text-gray-700 dark:text-gray-300">{t('settings.checkEvery')}</span>
              <select
                value={settings.updateCheckInterval}
                onChange={(e) =>
                  updateSettings({ updateCheckInterval: parseInt(e.target.value) })
                }
                className="input w-auto"
              >
                <option value={3600000}>{t('settings.1hour')}</option>
                <option value={21600000}>{t('settings.6hours')}</option>
                <option value={43200000}>{t('settings.12hours')}</option>
                <option value={86400000}>{t('settings.24hours')}</option>
              </select>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {t('settings.securityInfo')}
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
              <li>{t('settings.securityPoint1')}</li>
              <li>{t('settings.securityPoint2')}</li>
              <li>{t('settings.securityPoint3')}</li>
            </ul>
          </div>

          {/* Software Version Info */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('settings.softwareVersion')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                  v{currentVersion || '...'}
                </p>
              </div>
              <Button
                onClick={handleManualCheck}
                variant="secondary"
                size="sm"
                loading={isChecking}
                icon={RefreshCw}
                disabled={isChecking}
              >
                {t('settings.checkForUpdatesNow')}
              </Button>
            </div>

            {/* Check Status Messages */}
            {checkStatus === 'upToDate' && !isChecking && (
              <div className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t('settings.upToDate')}
              </div>
            )}

            {checkStatus === 'updateAvailable' && updateInfo && (
              <div className="mt-3 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {t('settings.updateAvailable', { version: updateInfo.latestVersion })}
              </div>
            )}

            {error && !isChecking && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                {t('settings.checkFailed')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Column Editor */}
      <section className="card p-6">
        <ColumnEditor />
      </section>

      {/* Label Manager */}
      <section className="card p-6">
        <LabelManager />
      </section>

      {/* Data Management */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.dataManagement')}
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings.dataManagementDesc')}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={exportToFile} variant="secondary" icon={Download}>
              {t('settings.exportData')}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              icon={Upload}
            >
              {t('settings.importData')}
            </Button>

            <Button
              onClick={() => setResetConfirm(true)}
              variant="danger"
              icon={RotateCcw}
            >
              {t('settings.resetAllData')}
            </Button>
          </div>

          {importStatus === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('settings.importSuccess')}
            </p>
          )}
          {importStatus === 'error' && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t('settings.importError')}
            </p>
          )}
        </div>
      </section>

      {/* Data File Path */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.dataFilePath')}
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings.dataFilePathDesc')}
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="text-gray-700 dark:text-gray-300 min-w-[100px]">
                {t('settings.filePath')}
              </label>
              <input
                type="text"
                value={dataFilePath}
                onChange={(e) => setDataFilePath(e.target.value)}
                className="input flex-1 font-mono text-sm"
                placeholder="./data/tasks.json"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-[112px]">
              💡 {t('settings.pathHelp')}
            </p>
          </div>

          <div className="flex gap-3 items-start">
            <Button onClick={handleSaveFilePath} variant="primary">
              {t('settings.saveFilePath')}
            </Button>
            {filePathStatus === 'success' && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                ✓ {t('settings.filePathSaved')}
              </p>
            )}
            {filePathStatus && filePathStatus.startsWith('error:') && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-start max-w-md">
                <span className="mr-1 mt-0.5">✗</span>
                <span className="break-words">{filePathStatus.replace('error: ', '')}</span>
              </p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{t('settings.tip')}:</strong> {t('settings.multiUserTip')}
            </p>
            <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
              <li>{t('settings.tipExample1')}</li>
              <li>{t('settings.tipExample2')}</li>
              <li>{t('settings.tipExample3')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.keyboardShortcuts')}
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">{t('settings.shortcutNewTask')}</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              N
            </kbd>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">{t('settings.shortcutCloseModal')}</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              Escape
            </kbd>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600 dark:text-gray-400">{t('settings.shortcutFocusSearch')}</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              /
            </kbd>
          </div>
        </div>
      </section>

      <ConfirmModal
        isOpen={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={reset}
        title={t('settings.resetTitle')}
        message={t('settings.resetMessage')}
      />
    </div>
  )
}
