// Default data structure
export const DEFAULT_DATA = {
  profiles: [],
  tasks: [],
  labels: [
    { id: 'label-1', name: 'Bug', color: 'red' },
    { id: 'label-2', name: 'Feature', color: 'blue' },
    { id: 'label-3', name: 'Urgent', color: 'orange' },
  ],
  columns: [
    { id: 'col-plan', name: 'Plan', order: 0 },
    { id: 'col-execute', name: 'Execute', order: 1 },
    { id: 'col-blocked', name: 'Blocked', order: 2 },
    { id: 'col-done', name: 'Done', order: 3 },
  ],
  settings: {
    theme: 'light',
    dataFilePath: './data/tasks.json',
    autoRefreshEnabled: true,
    autoRefreshInterval: 5000,
    language: 'en',
  },
}

// Local storage keys
const STORAGE_KEY = 'task-manager-data'
const SETTINGS_KEY = 'task-manager-settings'

// Load data from localStorage
export function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_DATA,
        ...data,
        settings: { ...DEFAULT_DATA.settings, ...data.settings },
      }
    }
  } catch (error) {
    console.error('Error loading data:', error)
  }
  return DEFAULT_DATA
}

// Save data to localStorage (and push to server fire-and-forget)
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    // Fire-and-forget push to server
    saveDataToServer(data).catch(() => {})
    return true
  } catch (error) {
    console.error('Error saving data:', error)
    return false
  }
}

// Load data from the Express server, updating localStorage cache
export async function loadDataFromServer() {
  try {
    const res = await fetch('/api/data')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // Merge with defaults
    const merged = {
      ...DEFAULT_DATA,
      ...data,
      settings: { ...DEFAULT_DATA.settings, ...data.settings },
    }
    // Cache in localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    return merged
  } catch (error) {
    console.warn('Server unreachable, falling back to localStorage:', error.message)
    return loadData()
  }
}

// Push data to the Express server
export async function saveDataToServer(data) {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Load server config (dataFilePath)
export async function loadConfig() {
  const res = await fetch('/api/config')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Save server config (dataFilePath)
export async function saveConfig(config) {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Export data as JSON file
export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tasks.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Import data from JSON file
export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        // Validate basic structure
        if (data && typeof data === 'object') {
          resolve({
            ...DEFAULT_DATA,
            ...data,
            settings: { ...DEFAULT_DATA.settings, ...data.settings },
          })
        } else {
          reject(new Error('Invalid data format'))
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// Generate unique ID
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
}
