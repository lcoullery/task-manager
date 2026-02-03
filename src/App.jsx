import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Layout/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Profiles } from './pages/Profiles'
import { Settings } from './pages/Settings'
import { ListView } from './pages/ListView'
import { GanttView } from './pages/GanttView'
import { UpdateNotification } from './components/Updates/UpdateNotification'
import { useUpdateChecker } from './hooks/useUpdateChecker'
import { useApp } from './context/AppContext'

function App() {
  const { settings } = useApp()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)

  const { updateInfo, downloadProgress, downloadUpdate, applyUpdateAndRestart, dismissUpdate } =
    useUpdateChecker(settings.autoUpdateEnabled)

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

  const handleRestart = async () => {
    await applyUpdateAndRestart()
    setDownloadError(true)
  }

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
        />
      )}
    </div>
  )
}

export default App
