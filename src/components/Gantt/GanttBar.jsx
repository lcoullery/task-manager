import { useState, useRef, useCallback } from 'react'
import { addDays } from '../../utils/gantt'

const PRIORITY_BAR_COLORS = {
  high: 'bg-red-400 dark:bg-red-500',
  medium: 'bg-blue-400 dark:bg-blue-500',
  low: 'bg-gray-400 dark:bg-gray-500',
}

export function GanttBar({ task, left, width, pxPerDay, onUpdateDates }) {
  const [dragOffset, setDragOffset] = useState({ left: 0, width: 0 })
  const dragRef = useRef(null)
  const offsetRef = useRef({ left: 0, width: 0 })

  const handleMouseDown = useCallback((e, type) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      type,
      startX: e.clientX,
      origWidth: width,
    }
    offsetRef.current = { left: 0, width: 0 }
    setDragOffset({ left: 0, width: 0 })

    const handleMouseMove = (moveEvent) => {
      if (!dragRef.current) return
      const { type: dragType, startX, origWidth: origW } = dragRef.current
      const deltaX = moveEvent.clientX - startX

      let newOffset
      if (dragType === 'move') {
        newOffset = { left: deltaX, width: 0 }
      } else if (dragType === 'resize-left') {
        const clampedDelta = Math.min(deltaX, origW - 8)
        newOffset = { left: clampedDelta, width: -clampedDelta }
      } else {
        const clampedDelta = Math.max(deltaX, -(origW - 8))
        newOffset = { left: 0, width: clampedDelta }
      }
      offsetRef.current = newOffset
      setDragOffset(newOffset)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (!dragRef.current) return
      const { type: dragType } = dragRef.current
      const finalOffset = offsetRef.current
      dragRef.current = null
      offsetRef.current = { left: 0, width: 0 }
      setDragOffset({ left: 0, width: 0 })

      if (dragType === 'move') {
        const deltaDays = Math.round(finalOffset.left / pxPerDay)
        if (deltaDays === 0) return
        const newStart = task.startDate ? addDays(task.startDate, deltaDays) : null
        const newEnd = task.endDate ? addDays(task.endDate, deltaDays) : null
        onUpdateDates(task.id, newStart, newEnd)
      } else if (dragType === 'resize-left') {
        const deltaDays = Math.round(finalOffset.left / pxPerDay)
        if (deltaDays === 0) return
        const newStart = addDays(task.startDate, deltaDays)
        if (task.endDate && newStart > task.endDate) return
        onUpdateDates(task.id, newStart, task.endDate)
      } else if (dragType === 'resize-right') {
        const deltaDays = Math.round(finalOffset.width / pxPerDay)
        if (deltaDays === 0) return
        const newEnd = addDays(task.endDate, deltaDays)
        if (task.startDate && newEnd < task.startDate) return
        onUpdateDates(task.id, task.startDate, newEnd)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, pxPerDay, task, onUpdateDates])

  const displayLeft = left + dragOffset.left
  const displayWidth = Math.max(width + dragOffset.width, 8)
  const colorClass = PRIORITY_BAR_COLORS[task.priority] || PRIORITY_BAR_COLORS.medium
  const isDragging = dragOffset.left !== 0 || dragOffset.width !== 0
  const showTitle = displayWidth > 80

  return (
    <div
      className={`absolute top-1 bottom-1 rounded ${colorClass} flex items-center group
        ${isDragging ? 'opacity-80 shadow-lg' : 'shadow-sm hover:shadow-md'}
        transition-shadow`}
      style={{
        left: `${displayLeft}px`,
        width: `${displayWidth}px`,
      }}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10
          hover:bg-black/20 dark:hover:bg-white/20 rounded-l"
        onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
      />

      {/* Bar body */}
      <div
        className={`flex-1 h-full flex items-center px-2 overflow-hidden
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {showTitle && (
          <span className="text-xs text-white truncate select-none font-medium">
            {task.title}
          </span>
        )}
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10
          hover:bg-black/20 dark:hover:bg-white/20 rounded-r"
        onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
      />
    </div>
  )
}
