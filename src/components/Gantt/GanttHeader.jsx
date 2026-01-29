import { VIEW_CONFIGS } from '../../utils/gantt'

export function GanttHeader({ topCells, bottomCells, viewMode, taskListWidth }) {
  const { pxPerDay } = VIEW_CONFIGS[viewMode]

  const getCellWidth = (cell) => {
    if (viewMode === 'year') {
      return (cell.days || 30) * pxPerDay
    }
    if (viewMode === 'quarter') {
      return 7 * pxPerDay
    }
    return pxPerDay
  }

  const getTopCellWidth = (cell) => {
    if (viewMode === 'year') {
      return cell.span * 30 * pxPerDay // approximate month width
    }
    if (viewMode === 'quarter') {
      return cell.span * 7 * pxPerDay
    }
    return cell.span * pxPerDay
  }

  // For year view, recalculate top cell width from actual bottom cells
  const getTopCellWidthExact = (topCell) => {
    let w = 0
    for (let i = topCell.startIndex; i < topCell.startIndex + topCell.span; i++) {
      if (bottomCells[i]) {
        w += getCellWidth(bottomCells[i])
      }
    }
    return w
  }

  return (
    <div className="sticky top-0 z-20">
      {/* Top row: month / quarter labels */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div
          className="flex-shrink-0 sticky left-0 z-30 bg-gray-50 dark:bg-gray-800
            border-r border-gray-200 dark:border-gray-700"
          style={{ width: `${taskListWidth}px`, minWidth: `${taskListWidth}px` }}
        />
        <div className="flex">
          {topCells.map((cell, i) => (
            <div
              key={i}
              className="flex-shrink-0 text-xs font-semibold text-gray-600 dark:text-gray-300
                px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 truncate"
              style={{ width: `${getTopCellWidthExact(cell)}px` }}
            >
              {cell.label}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: day / week / month labels */}
      <div className="flex border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <div
          className="flex-shrink-0 sticky left-0 z-30 bg-gray-50 dark:bg-gray-800
            border-r border-gray-200 dark:border-gray-700 text-xs font-medium
            text-gray-500 dark:text-gray-400 px-3 py-1.5"
          style={{ width: `${taskListWidth}px`, minWidth: `${taskListWidth}px` }}
        >
          Task
        </div>
        <div className="flex">
          {bottomCells.map((cell, i) => (
            <div
              key={i}
              className={`flex-shrink-0 text-xs text-center py-1.5
                border-r border-gray-200 dark:border-gray-700
                ${cell.isToday
                  ? 'bg-blue-100 dark:bg-blue-900/40 font-bold text-blue-700 dark:text-blue-300'
                  : cell.isWeekend
                    ? 'bg-gray-100 dark:bg-gray-750 text-gray-400 dark:text-gray-500'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              style={{ width: `${getCellWidth(cell)}px` }}
            >
              {cell.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
