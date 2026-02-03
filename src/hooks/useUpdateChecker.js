import { useEffect, useRef, useState, useCallback } from 'react'

export function useUpdateChecker(enabled) {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [justUpdated, setJustUpdated] = useState(null)
  const timeoutRef = useRef(null)
  const hasCheckedRef = useRef(null)
  const eventSourceRef = useRef(null)
  const abortControllerRef = useRef(null)

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
      // Create abort controller
      abortControllerRef.current = new AbortController()

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

      // Start download with abort signal
      const response = await fetch('/api/update/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadUrl: updateInfo.downloadUrl,
          commitSha: updateInfo.commitSha,
          version: updateInfo.latestVersion,
        }),
        signal: abortControllerRef.current.signal,
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
      // Check if error is due to abort
      if (err.name === 'AbortError') {
        return { success: false, error: 'Download cancelled', cancelled: true }
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

  // Cancel ongoing download
  const cancelDownload = useCallback(async () => {
    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Abort fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Reset progress
    setDownloadProgress(null)

    // Call server to cleanup
    try {
      await fetch('/api/update/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: updateInfo?.latestVersion || 'unknown'
        })
      })
    } catch (err) {
      console.error('Failed to notify server of cancellation:', err.message)
    }
  }, [updateInfo])

  // Dismiss the update notification
  const dismissUpdate = useCallback(() => {
    setUpdateInfo(null)
    setDownloadProgress(null)
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Check for completed update on mount
  const checkForCompletedUpdate = useCallback(async () => {
    try {
      const res = await fetch('/api/update/status')
      if (!res.ok) return null
      const data = await res.json()
      return data.pending ? data : null
    } catch (err) {
      console.error('Failed to check update status:', err)
      return null
    }
  }, [])

  const clearCompletedUpdate = useCallback(async () => {
    try {
      await fetch('/api/update/clear-status', { method: 'POST' })
    } catch (err) {
      console.error('Failed to clear update status:', err)
    }
  }, [])

  // Check for completed update on mount
  useEffect(() => {
    const checkCompleted = async () => {
      const pendingUpdate = await checkForCompletedUpdate()
      if (pendingUpdate) {
        setJustUpdated({ version: pendingUpdate.version })
        await clearCompletedUpdate()
      }
    }
    checkCompleted()
  }, [checkForCompletedUpdate, clearCompletedUpdate])

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
    justUpdated,
    checkForUpdates,
    downloadUpdate,
    applyUpdateAndRestart,
    dismissUpdate,
    cancelDownload,
  }
}
