import { useEffect, useRef, useCallback } from 'react'

export function useAutoRefresh(enabled, interval, onRefresh) {
  const intervalRef = useRef(null)
  const onRefreshRef = useRef(onRefresh)

  // Keep callback reference updated
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  // Start/stop auto refresh
  useEffect(() => {
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        onRefreshRef.current?.()
      }, interval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval])

  // Manual refresh trigger
  const refresh = useCallback(() => {
    onRefreshRef.current?.()
  }, [])

  return { refresh }
}
