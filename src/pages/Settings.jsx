import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useApp } from '../context/AppContext'
import { ColumnEditor } from '../components/Kanban/ColumnEditor'
import { LabelManager } from '../components/Labels/LabelManager'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

export function Settings() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings } = useApp()
  const { t, i18n } = useTranslation()
  const [currentVersion, setCurrentVersion] = useState(null)

  // Fetch current version on mount
  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setCurrentVersion(data.version))
      .catch(err => console.error('Failed to fetch version:', err))
  }, [])

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

      {/* Column Editor */}
      <section className="card p-6">
        <ColumnEditor />
      </section>

      {/* Label Manager */}
      <section className="card p-6">
        <LabelManager />
      </section>

      {/* Bug Report Settings */}
      <section className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.bugReports')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.bugReportsDesc')}
        </p>
        <div className="flex items-center justify-between">
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

      {/* Software Version */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.softwareVersion')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          v{currentVersion || '...'}
        </p>
      </section>
    </div>
  )
}
