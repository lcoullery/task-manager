import { useEffect, useRef, useState, useCallback } from 'react'

export function useUpdateChecker(enabled, interval) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)
  const hasCheckedRef = useRef(false)

  // Check for updates from GitHub API
  const checkForUpdates = useCallback(async () => {
    try {
      setIsChecking(true)
      setError(null)

      const response = await fetch('/api/update/check')
      if (!response.ok) {
        throw new Error('Failed to check for updates')
      }

      const data = await response.json()

      if (data.hasUpdate) {
        setUpdateInfo(data)
      } else {
        setUpdateInfo(null)
      }
    } catch (err) {
      console.error('Update check error:', err.message)
      setError(err.message)
    } finally {
      setIsChecking(false)
    }
  }, [])

  // Download update from GitHub
  const downloadUpdate = useCallback(async () => {
    if (!updateInfo) {
      return { success: false, error: 'No update information available' }
    }

    try {
      const response = await fetch('/api/update/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadUrl: updateInfo.downloadUrl,
          commitSha: updateInfo.commitSha,
          version: updateInfo.latestVersion,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data.error || 'Download failed' }
      }

      return { success: true }
    } catch (err) {
      console.error('Download error:', err.message)
      return { success: false, error: err.message }
    }
  }, [updateInfo])

  // Apply update and trigger restart
  const applyUpdateAndRestart = useCallback(async () => {
    try {
      const response = await fetch('/api/update/apply', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to apply update')
      }

      // Server will shut down, this fetch will timeout/fail
    } catch (err) {
      console.log('Update applied, server shutting down...')
    }
  }, [])

  // Dismiss the update notification
  const dismissUpdate = useCallback(() => {
    setUpdateInfo(null)
  }, [])

  // Set up auto-check interval
  useEffect(() => {
    if (enabled && interval > 0) {
      // Check immediately on first run if never checked
      if (!hasCheckedRef.current) {
        checkForUpdates()
        hasCheckedRef.current = true
      }

      // Set up periodic checks
      intervalRef.current = setInterval(() => {
        checkForUpdates()
      }, interval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, checkForUpdates])

  return {
    updateInfo,
    isChecking,
    error,
    checkForUpdates,
    downloadUpdate,
    applyUpdateAndRestart,
    dismissUpdate,
  }
}
