export const VIEW_CONFIGS = {
  week: { pxPerDay: 60, buffer: 7 },
  month: { pxPerDay: 28, buffer: 7 },
  quarter: { pxPerDay: 9, buffer: 14 },
  year: { pxPerDay: 3, buffer: 30 },
}

export function daysBetween(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00')
  const b = new Date(dateB + 'T00:00:00')
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(dateStr, format) {
  const d = new Date(dateStr + 'T00:00:00')
  switch (format) {
    case 'day-short':
      return d.getDate().toString()
    case 'day-dow': {
      const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
      return `${d.getDate()} ${dow}`
    }
    case 'month-short':
      return d.toLocaleDateString('en-US', { month: 'short' })
    case 'month-year':
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    case 'week-number': {
      const jan1 = new Date(d.getFullYear(), 0, 1)
      const weekNum = Math.ceil(((d - jan1) / (1000 * 60 * 60 * 24) + jan1.getDay() + 1) / 7)
      return `W${weekNum}`
    }
    case 'quarter':
      return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`
    default:
      return dateStr
  }
}

export function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)) // Monday start
  return toDateStr(d)
}

export function startOfMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function startOfQuarter(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const qMonth = Math.floor(d.getMonth() / 3) * 3
  return toDateStr(new Date(d.getFullYear(), qMonth, 1))
}

export function startOfYear(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return toDateStr(new Date(d.getFullYear(), 0, 1))
}

export function getTimelineRange(tasks, viewMode) {
  const config = VIEW_CONFIGS[viewMode]
  const dates = []

  for (const t of tasks) {
    if (t.startDate) dates.push(t.startDate)
    if (t.endDate) dates.push(t.endDate)
  }

  if (dates.length === 0) {
    const today = toDateStr(new Date())
    return { start: addDays(today, -7), end: addDays(today, 7), totalDays: 14 }
  }

  dates.sort()
  const earliest = dates[0]
  const latest = dates[dates.length - 1]

  const start = addDays(earliest, -config.buffer)
  const end = addDays(latest, config.buffer)
  const totalDays = daysBetween(start, end)

  return { start, end, totalDays }
}

export function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDay() === 0 || d.getDay() === 6
}

export function isToday(dateStr) {
  return dateStr === toDateStr(new Date())
}

export function getTodayStr() {
  return toDateStr(new Date())
}

export function getHeaderCells(start, end, viewMode) {
  const totalDays = daysBetween(start, end)
  const topCells = []
  const bottomCells = []

  if (viewMode === 'week' || viewMode === 'month') {
    // Bottom row: individual days
    let currentMonth = null
    let monthStart = 0
    let monthDayCount = 0

    for (let i = 0; i <= totalDays; i++) {
      const dateStr = addDays(start, i)
      const d = new Date(dateStr + 'T00:00:00')
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`

      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          topCells.push({
            label: formatDate(addDays(start, monthStart), 'month-year'),
            span: monthDayCount,
            startIndex: monthStart,
          })
        }
        currentMonth = monthKey
        monthStart = i
        monthDayCount = 0
      }
      monthDayCount++

      bottomCells.push({
        label: viewMode === 'week' ? formatDate(dateStr, 'day-dow') : formatDate(dateStr, 'day-short'),
        dateStr,
        isWeekend: isWeekend(dateStr),
        isToday: isToday(dateStr),
      })
    }

    // Push last month group
    if (currentMonth !== null) {
      topCells.push({
        label: formatDate(addDays(start, monthStart), 'month-year'),
        span: monthDayCount,
        startIndex: monthStart,
      })
    }
  } else if (viewMode === 'quarter') {
    // Bottom row: weeks, Top row: months
    let currentMonth = null
    let monthWeekCount = 0
    let monthStartIdx = 0

    // Group days into weeks
    let weekIdx = 0
    for (let i = 0; i <= totalDays; i += 7) {
      const dateStr = addDays(start, i)
      const d = new Date(dateStr + 'T00:00:00')
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`

      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          topCells.push({
            label: formatDate(addDays(start, monthStartIdx * 7), 'month-short'),
            span: monthWeekCount,
            startIndex: monthStartIdx,
          })
        }
        currentMonth = monthKey
        monthStartIdx = weekIdx
        monthWeekCount = 0
      }
      monthWeekCount++

      bottomCells.push({
        label: formatDate(dateStr, 'week-number'),
        dateStr,
        isWeekend: false,
        isToday: false,
      })
      weekIdx++
    }

    if (currentMonth !== null) {
      topCells.push({
        label: formatDate(addDays(start, monthStartIdx * 7), 'month-short'),
        span: monthWeekCount,
        startIndex: monthStartIdx,
      })
    }
  } else if (viewMode === 'year') {
    // Bottom row: months, Top row: quarters
    let currentQuarter = null
    let quarterMonthCount = 0
    let quarterStartIdx = 0

    let monthIdx = 0
    const d = new Date(start + 'T00:00:00')
    const endDate = new Date(end + 'T00:00:00')

    while (d <= endDate) {
      const qKey = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}`

      if (qKey !== currentQuarter) {
        if (currentQuarter !== null) {
          topCells.push({
            label: formatDate(toDateStr(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 - 3, 1)), 'quarter'),
            span: quarterMonthCount,
            startIndex: quarterStartIdx,
          })
        }
        currentQuarter = qKey
        quarterStartIdx = monthIdx
        quarterMonthCount = 0
      }
      quarterMonthCount++

      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      bottomCells.push({
        label: formatDate(toDateStr(d), 'month-short'),
        dateStr: toDateStr(d),
        days: daysInMonth,
        isWeekend: false,
        isToday: false,
      })

      monthIdx++
      d.setMonth(d.getMonth() + 1)
    }

    if (currentQuarter !== null) {
      const lastD = new Date(end + 'T00:00:00')
      topCells.push({
        label: formatDate(toDateStr(new Date(lastD.getFullYear(), Math.floor(lastD.getMonth() / 3) * 3, 1)), 'quarter'),
        span: quarterMonthCount,
        startIndex: quarterStartIdx,
      })
    }
  }

  return { topCells, bottomCells }
}
