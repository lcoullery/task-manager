import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useApp } from '../context/AppContext'
import { ColumnEditor } from '../components/Kanban/ColumnEditor'
import { LabelManager } from '../components/Labels/LabelManager'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { loadConfig, saveConfig } from '../utils/storage'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

export function Settings() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings, reload } = useApp()
  const { t, i18n } = useTranslation()
  const [dataFilePath, setDataFilePath] = useState('')
  const [filePathStatus, setFilePathStatus] = useState(null)
  const [bugReportFilePath, setBugReportFilePath] = useState('')
  const [bugReportFilePathStatus, setBugReportFilePathStatus] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)

  // Load current file path on mount
  useEffect(() => {
    loadConfig().then(config => {
      setDataFilePath(config.dataFilePath || './data/tasks.json')
      setBugReportFilePath(config.bugReportFilePath || './data/bugReports.json')
    }).catch(() => {
      setDataFilePath('./data/tasks.json')
      setBugReportFilePath('./data/bugReports.json')
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

  const handleSaveBugReportFilePath = async () => {
    try {
      setBugReportFilePathStatus('saving')
      const trimmedPath = bugReportFilePath.trim()
      if (!trimmedPath) {
        setBugReportFilePathStatus('error')
        setTimeout(() => setBugReportFilePathStatus(null), 3000)
        return
      }
      await saveConfig({ bugReportFilePath: trimmedPath })
      setBugReportFilePathStatus('success')
      setTimeout(() => setBugReportFilePathStatus(null), 3000)
      reload()
    } catch (err) {
      console.error('Failed to save bug report path:', err)
      setBugReportFilePathStatus('error')
      setTimeout(() => setBugReportFilePathStatus(null), 3000)
    }
  }

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    updateSettings({ language: langCode })
  }

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

      {/* Software Version */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.softwareVersion')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          v{currentVersion || '...'}
        </p>
      </section>

      {/* Column Editor */}
      <section className="card p-6">
        <ColumnEditor />
      </section>

      {/* Label Manager */}
      <section className="card p-6">
        <LabelManager />
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

      {/* Bug Report Settings */}
      <section className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.bugReports')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.bugReportsDesc')}
        </p>

        {/* Enable/Disable Bug Report Button */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings.enableBugReports')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('settings.enableBugReportsDesc')}
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.bugReportEnabled ?? true}
            onChange={(e) => updateSettings({ bugReportEnabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        {/* Bug Report File Path */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.bugReportFilePath')}
          </label>
          <div className="flex gap-3 items-start">
            <Input
              type="text"
              value={bugReportFilePath}
              onChange={(e) => setBugReportFilePath(e.target.value)}
              placeholder="./data/bugReports.json"
              className="flex-1"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveBugReportFilePath}
              disabled={bugReportFilePathStatus === 'saving'}
            >
              {t('settings.saveFilePath')}
            </Button>
          </div>
          {bugReportFilePathStatus === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              {t('settings.filePathSaved')}
            </p>
          )}
          {bugReportFilePathStatus === 'error' && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {t('settings.filePathError')}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('settings.bugReportPathHelp')}
          </p>
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
    </div>
  )
}
