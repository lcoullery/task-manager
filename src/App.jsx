import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Layout/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Profiles } from './pages/Profiles'
import { Settings } from './pages/Settings'
import { ListView } from './pages/ListView'
import { GanttView } from './pages/GanttView'
import { WorkloadView } from './pages/WorkloadView'
import { BugReportButton } from './components/BugReport/BugReportButton'
import { Toast } from './components/common/Toast'
import { useApp } from './context/AppContext'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import Login from './pages/Login'

function App() {
  const { settings } = useApp()
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, variant = 'success', duration = 5000) => {
    setToast({ message, variant, duration })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

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
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="flex-1 p-6 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/list" element={<ListView />} />
                <Route path="/gantt" element={<GanttView />} />
                <Route path="/workload" element={<WorkloadView />} />
                <Route path="/profiles" element={<Profiles />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
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
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
