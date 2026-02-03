import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Layout/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Profiles } from './pages/Profiles'
import { Settings } from './pages/Settings'
import { ListView } from './pages/ListView'
import { GanttView } from './pages/GanttView'
import { UpdateNotification } from './components/Updates/UpdateNotification'
import { BugReportButton } from './components/BugReport/BugReportButton'
import { Toast } from './components/common/Toast'
import { useUpdateChecker } from './hooks/useUpdateChecker'
import { useApp } from './context/AppContext'

function App() {
  const { settings } = useApp()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, variant = 'success', duration = 5000) => {
    setToast({ message, variant, duration })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const {
    updateInfo,
    downloadProgress,
    downloadUpdate,
    applyUpdateAndRestart,
    dismissUpdate,
    justUpdated,
    cancelDownload
  } = useUpdateChecker(settings.autoUpdateEnabled)

  const handleUpdateAndRestart = async () => {
    setIsDownloading(true)
    setDownloadError(false)
    setDownloadComplete(false)
    const downloadResult = await downloadUpdate()
    if (!downloadResult.success) {
      setDownloadError(true)
      setIsDownloading(false)
      return
    }
    setIsDownloading(false)
    setDownloadComplete(true)
  }

  const handleCancelDownload = async () => {
    await cancelDownload()
    setIsDownloading(false)
    setDownloadComplete(false)
    setDownloadError(false)
  }

  const handleRestart = async () => {
    setIsRestarting(true)
    await applyUpdateAndRestart()
  }

  // Show "successfully updated" toast on first launch after update
  useEffect(() => {
    if (justUpdated) {
      showToast(
        `Successfully updated to v${justUpdated.version}!`,
        'success',
        5000
      )
    }
  }, [justUpdated, showToast])

  // Listen for toast requests from Settings page
  useEffect(() => {
    const handleShowToast = (event) => {
      const { message, variant, duration } = event.detail
      showToast(message, variant, duration || 3000)
    }

    window.addEventListener('show-update-toast', handleShowToast)
    return () => window.removeEventListener('show-update-toast', handleShowToast)
  }, [showToast])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 p-6 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/gantt" element={<GanttView />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      {updateInfo && (
        <UpdateNotification
          updateInfo={updateInfo}
          onUpdateAndRestart={handleUpdateAndRestart}
          onRestart={handleRestart}
          onClose={dismissUpdate}
          isDownloading={isDownloading}
          downloadComplete={downloadComplete}
          downloadProgress={downloadProgress}
          downloadError={downloadError}
          isRestarting={isRestarting}
          onCancelDownload={handleCancelDownload}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
      {settings.bugReportEnabled && <BugReportButton />}
    </div>
  )
}

export default App
