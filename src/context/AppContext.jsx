import { createContext, useContext, useMemo, useCallback } from 'react'
import { useDataFile } from '../hooks/useDataFile'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { generateId } from '../utils/storage'
import { generateAvatarColor } from '../utils/colors'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const {
    data,
    loading,
    error,
    lastSaved,
    updateData,
    reload,
  } = useDataFile()

  // Auto refresh for real-time multi-user sync (interval configurable in data settings)
  useAutoRefresh(
    data.settings?.autoRefreshEnabled ?? true,
    data.settings?.autoRefreshInterval ?? 3000,
    reload
  )

  // ============ PROFILES ============
  const profiles = useMemo(() => data.profiles || [], [data.profiles])

  const addProfile = useCallback((name, color) => {
    const newProfile = {
      id: generateId(),
      name,
      color: color || generateAvatarColor(name),
      createdAt: new Date().toISOString(),
    }
    updateData((prev) => ({
      ...prev,
      profiles: [...prev.profiles, newProfile],
    }))
    return newProfile
  }, [updateData])

  const updateProfile = useCallback((id, updates) => {
    updateData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }))
  }, [updateData])

  const deleteProfile = useCallback((id) => {
    updateData((prev) => ({
      ...prev,
      profiles: prev.profiles.filter((p) => p.id !== id),
      // Unassign tasks from deleted profile
      tasks: prev.tasks.map((t) =>
        t.assignedTo === id ? { ...t, assignedTo: null } : t
      ),
    }))
  }, [updateData])

  const getProfile = useCallback((id) => {
    return profiles.find((p) => p.id === id)
  }, [profiles])

  // ============ TASKS ============
  const tasks = useMemo(() => data.tasks || [], [data.tasks])

  const addTask = useCallback((task) => {
    const newTask = {
      id: generateId(),
      title: task.title,
      description: task.description || '',
      status: task.status || 'col-plan',
      priority: task.priority || 'medium',
      assignedTo: task.assignedTo || null,
      startDate: task.startDate || null,
      endDate: task.endDate || null,
      labels: task.labels || [],
      comments: [],
      archived: false,
      createdAt: new Date().toISOString(),
    }
    updateData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }))
    return newTask
  }, [updateData])

  const updateTask = useCallback((id, updates) => {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
  }, [updateData])

  const deleteTask = useCallback((id) => {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }))
  }, [updateData])

  const archiveTask = useCallback((id) => {
    updateTask(id, { archived: true })
  }, [updateTask])

  const unarchiveTask = useCallback((id) => {
    updateTask(id, { archived: false })
  }, [updateTask])

  const archiveAllDone = useCallback(() => {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.status === 'col-done' && !t.archived ? { ...t, archived: true } : t
      ),
    }))
  }, [updateData])

  const addComment = useCallback((taskId, text, authorId) => {
    const newComment = {
      id: generateId(),
      text,
      authorId,
      createdAt: new Date().toISOString(),
    }
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, comments: [...(t.comments || []), newComment] }
          : t
      ),
    }))
  }, [updateData])

  const deleteComment = useCallback((taskId, commentId) => {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) }
          : t
      ),
    }))
  }, [updateData])

  const moveTask = useCallback((taskId, newStatus, newIndex) => {
    updateData((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId)
      if (!task) return prev

      // Get tasks in the target column
      const columnTasks = prev.tasks
        .filter((t) => t.status === newStatus && t.id !== taskId && !t.archived)
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      // Insert at new position and recalculate orders
      columnTasks.splice(newIndex, 0, { ...task, status: newStatus })

      const updatedColumnTasks = columnTasks.map((t, idx) => ({
        ...t,
        order: idx,
      }))

      // Merge back
      const otherTasks = prev.tasks.filter(
        (t) => t.status !== newStatus && t.id !== taskId
      )

      return {
        ...prev,
        tasks: [...otherTasks, ...updatedColumnTasks],
      }
    })
  }, [updateData])

  // ============ LABELS ============
  const labels = useMemo(() => data.labels || [], [data.labels])

  const addLabel = useCallback((name, color) => {
    const newLabel = {
      id: generateId(),
      name,
      color,
    }
    updateData((prev) => ({
      ...prev,
      labels: [...prev.labels, newLabel],
    }))
    return newLabel
  }, [updateData])

  const updateLabel = useCallback((id, updates) => {
    updateData((prev) => ({
      ...prev,
      labels: prev.labels.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    }))
  }, [updateData])

  const deleteLabel = useCallback((id) => {
    updateData((prev) => ({
      ...prev,
      labels: prev.labels.filter((l) => l.id !== id),
      // Remove label from all tasks
      tasks: prev.tasks.map((t) => ({
        ...t,
        labels: t.labels.filter((labelId) => labelId !== id),
      })),
    }))
  }, [updateData])

  const getLabel = useCallback((id) => {
    return labels.find((l) => l.id === id)
  }, [labels])

  // ============ COLUMNS ============
  const columns = useMemo(() => {
    return [...(data.columns || [])].sort((a, b) => a.order - b.order)
  }, [data.columns])

  const addColumn = useCallback((name) => {
    const maxOrder = Math.max(...columns.map((c) => c.order), -1)
    const newColumn = {
      id: generateId(),
      name,
      order: maxOrder + 1,
    }
    updateData((prev) => ({
      ...prev,
      columns: [...prev.columns, newColumn],
    }))
    return newColumn
  }, [columns, updateData])

  const updateColumn = useCallback((id, updates) => {
    updateData((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }))
  }, [updateData])

  const deleteColumn = useCallback((id) => {
    // Move tasks from deleted column to first column
    const firstColumn = columns.find((c) => c.id !== id)
    updateData((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c.id !== id),
      tasks: prev.tasks.map((t) =>
        t.status === id ? { ...t, status: firstColumn?.id || 'col-plan' } : t
      ),
    }))
  }, [columns, updateData])

  const reorderColumns = useCallback((newOrder) => {
    updateData((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => ({
        ...c,
        order: newOrder.indexOf(c.id),
      })),
    }))
  }, [updateData])

  // ============ SETTINGS ============
  const settings = useMemo(() => data.settings || {}, [data.settings])

  const updateSettings = useCallback((updates) => {
    updateData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }))
  }, [updateData])

  const value = {
    // State
    loading,
    error,
    lastSaved,

    // Data management
    reload,

    // Profiles
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    getProfile,

    // Tasks
    tasks,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    archiveAllDone,
    addComment,
    deleteComment,
    moveTask,

    // Labels
    labels,
    addLabel,
    updateLabel,
    deleteLabel,
    getLabel,

    // Columns
    columns,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,

    // Settings
    settings,
    updateSettings,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
