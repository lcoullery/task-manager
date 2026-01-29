import { useState, useCallback } from 'react'
import { loadData, saveData, exportData, importData, DEFAULT_DATA } from '../utils/storage'

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
  const reload = useCallback(() => {
    setLoading(true)
    try {
      const freshData = loadData()
      setData(freshData)
      setError(null)
    } catch (err) {
      setError('Failed to reload data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Export data to file
  const exportToFile = useCallback(() => {
    exportData(data)
  }, [data])

  // Import data from file
  const importFromFile = useCallback(async (file) => {
    setLoading(true)
    try {
      const importedData = await importData(file)
      setData(importedData)
      saveData(importedData)
      setLastSaved(new Date())
      setError(null)
      return true
    } catch (err) {
      setError(`Failed to import: ${err.message}`)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset to default data
  const reset = useCallback(() => {
    setData(DEFAULT_DATA)
    saveData(DEFAULT_DATA)
    setLastSaved(new Date())
  }, [])

  return {
    data,
    loading,
    error,
    lastSaved,
    save,
    updateData,
    reload,
    exportToFile,
    importFromFile,
    reset,
  }
}
