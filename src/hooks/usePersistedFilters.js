import { useState, useEffect } from 'react'

const getKey = (userId, viewName) =>
  userId ? `task-manager-filters:${userId}:${viewName}` : null

export function usePersistedFilters(viewName, userId, defaults) {
  const [filters, setFilters] = useState(() => {
    const key = getKey(userId, viewName)
    if (!key) return defaults
    try {
      const stored = JSON.parse(localStorage.getItem(key))
      return stored ? { ...defaults, ...stored } : defaults
    } catch {
      return defaults
    }
  })

  useEffect(() => {
    const key = getKey(userId, viewName)
    if (!key) { setFilters(defaults); return }
    try {
      const stored = JSON.parse(localStorage.getItem(key))
      setFilters(stored ? { ...defaults, ...stored } : defaults)
    } catch {
      setFilters(defaults)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = getKey(userId, viewName)
    if (!key) return
    try {
      localStorage.setItem(key, JSON.stringify(filters))
    } catch {}
  }, [filters, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  return [filters, setFilters]
}
