import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Layout/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { ListView } from './pages/ListView'
import { GanttView } from './pages/GanttView'
import { WorkloadView } from './pages/WorkloadView'
import Users from './pages/Users'
import { BugReportButton } from './components/BugReport/BugReportButton'
import { Toast } from './components/common/Toast'
import { useApp } from './context/AppContext'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import Login from './pages/Login'
import AcceptInvite from './pages/AcceptInvite'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'

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
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

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
                <Route path="/profiles" element={<Navigate to="/users" replace />} />
                <Route path="/users" element={<Users />} />
                <Route path="/profile" element={<Profile />} />
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
