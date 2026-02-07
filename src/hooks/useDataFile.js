import { useState, useCallback } from 'react'
import { loadData, saveData, loadDataFromServer } from '../utils/storage'

export function useDataFile() {
  const [data, setData] = useState(() => loadData())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)

  // Save data to storage
  const save = useCallback((newData) => {
    const dataToSave = newData || data
    const success = saveData(dataToSave)
    if (success) {
      setLastSaved(new Date())
      setError(null)
    } else {
      setError('Failed to save data')
    }
    return success
  }, [data])

  // Update data and save
  const updateData = useCallback((updater) => {
    setData((prevData) => {
      const newData = typeof updater === 'function' ? updater(prevData) : updater
      saveData(newData)
      setLastSaved(new Date())
      return newData
    })
  }, [])

  // Reload data from storage
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const freshData = await loadDataFromServer()
      setData(freshData)
      setError(null)
    } catch (err) {
      setError('Failed to reload data from server')
      console.error('Reload error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    lastSaved,
    save,
    updateData,
    reload,
  }
}
