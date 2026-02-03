import { useEffect, useRef, useState, useCallback } from 'react'

export function useUpdateChecker(enabled) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(null)
  const timeoutRef = useRef(null)
  const hasCheckedRef = useRef(null)
  const eventSourceRef = useRef(null)

  // Check for updates from GitHub API
  const checkForUpdates = useCallback(async () => {
    try {
      setIsChecking(true)
      setError(null)

      const response = await fetch('/api/update/check')

      // Handle rate limiting specifically
      if (response.status === 429) {
        const data = await response.json()
        throw new Error(data.error || 'Too many requests. Please try again later.')
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check for updates')
      }

      const data = await response.json()

      if (data.hasUpdate) {
        setUpdateInfo(data)
      } else {
        // Clear update info when no updates or no releases available
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
      // Open SSE connection for progress
      const eventSource = new EventSource('/api/update/progress')
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        const progress = JSON.parse(event.data)
        setDownloadProgress(progress)

        if (progress.status === 'complete') {
          eventSource.close()
          eventSourceRef.current = null
        }
      }

      eventSource.onerror = () => {
        console.error('SSE connection error')
        eventSource.close()
        eventSourceRef.current = null
      }

      // Start download
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
        eventSource.close()
        eventSourceRef.current = null
        const data = await response.json()
        return { success: false, error: data.error || 'Download failed' }
      }

      return { success: true }
    } catch (err) {
      console.error('Download error:', err.message)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
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
    setDownloadProgress(null)
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Check for updates once at startup with a 5 second delay
  useEffect(() => {
    if (enabled && !hasCheckedRef.current) {
      timeoutRef.current = setTimeout(() => {
        checkForUpdates()
        hasCheckedRef.current = true
      }, 5000)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [enabled, checkForUpdates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  return {
    updateInfo,
    isChecking,
    error,
    downloadProgress,
    checkForUpdates,
    downloadUpdate,
    applyUpdateAndRestart,
    dismissUpdate,
  }
}
