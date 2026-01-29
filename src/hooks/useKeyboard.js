import { useEffect, useCallback } from 'react'

export function useKeyboard(shortcuts) {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target
    const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable

    for (const shortcut of shortcuts) {
      const { key, ctrl, alt, shift, action, allowInInput } = shortcut

      // Skip if in input and not allowed
      if (isInput && !allowInInput) continue

      // Check modifiers
      if (ctrl && !event.ctrlKey && !event.metaKey) continue
      if (alt && !event.altKey) continue
      if (shift && !event.shiftKey) continue

      // Check key
      if (event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault()
        action(event)
        return
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Commonly used shortcuts helper
export function createShortcuts(handlers) {
  const shortcuts = []

  if (handlers.newTask) {
    shortcuts.push({
      key: 'n',
      action: handlers.newTask,
      allowInInput: false,
    })
  }

  if (handlers.closeModal) {
    shortcuts.push({
      key: 'Escape',
      action: handlers.closeModal,
      allowInInput: true,
    })
  }

  if (handlers.focusSearch) {
    shortcuts.push({
      key: '/',
      action: handlers.focusSearch,
      allowInInput: false,
    })
  }

  return shortcuts
}
