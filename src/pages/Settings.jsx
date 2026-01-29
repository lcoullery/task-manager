import { useState, useRef } from 'react'
import { Moon, Sun, Download, Upload, RefreshCw, RotateCcw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useApp } from '../context/AppContext'
import { ColumnEditor } from '../components/Kanban/ColumnEditor'
import { LabelManager } from '../components/Labels/LabelManager'
import { Button } from '../components/common/Button'
import { ConfirmModal } from '../components/common/Modal'

export function Settings() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings, exportToFile, importFromFile, reset } = useApp()
  const [resetConfirm, setResetConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const fileInputRef = useRef(null)

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Theme */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Appearance
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-gray-700 dark:text-gray-300">Theme:</span>
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
              Light
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
              Dark
            </button>
          </div>
        </div>
      </section>

      {/* Auto Refresh */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sync Settings
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
                Auto-refresh
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically reload data to sync with other users
              </p>
            </div>
          </label>

          {settings.autoRefreshEnabled && (
            <div className="flex items-center gap-3 ml-7">
              <span className="text-gray-700 dark:text-gray-300">Refresh every:</span>
              <select
                value={settings.autoRefreshInterval}
                onChange={(e) =>
                  updateSettings({ autoRefreshInterval: parseInt(e.target.value) })
                }
                className="input w-auto"
              >
                <option value={3000}>3 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
              </select>
            </div>
          )}
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
          Data Management
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Export your data to share with your team via OneDrive, or import data from a shared file.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={exportToFile} variant="secondary" icon={Download}>
              Export Data
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
              Import Data
            </Button>

            <Button
              onClick={() => setResetConfirm(true)}
              variant="danger"
              icon={RotateCcw}
            >
              Reset All Data
            </Button>
          </div>

          {importStatus === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Data imported successfully!
            </p>
          )}
          {importStatus === 'error' && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to import data. Please check the file format.
            </p>
          )}
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Keyboard Shortcuts
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Create new task</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              N
            </kbd>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Close modal</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              Escape
            </kbd>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600 dark:text-gray-400">Focus search</span>
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
        title="Reset All Data"
        message="Are you sure you want to reset all data? This will delete all profiles, tasks, and custom settings. This action cannot be undone."
      />
    </div>
  )
}
