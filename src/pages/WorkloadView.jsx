import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { isWeekend } from '../utils/gantt'

export function WorkloadView() {
  const { profiles, getUserWorkload, settings } = useApp()
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState('week') // 'week' or 'month'

  const maxHoursPerDay = settings.maxHoursPerDay || 8

  // Calculate date range
  const { startDate, endDate, dates } = useMemo(() => {
    const today = new Date()
    let start, end

    if (viewMode === 'week') {
      // Current week (Monday to Sunday)
      const day = today.getDay()
      const diff = day === 0 ? -6 : 1 - day // Monday
      start = new Date(today)
      start.setDate(today.getDate() + diff)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    } else {
      // Current month
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    }

    // Generate array of dates
    const dateArray = []
    let current = new Date(start)
    while (current <= end) {
      dateArray.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      dates: dateArray,
    }
  }, [viewMode])

  // Calculate workload for all users
  const workloadData = useMemo(() => {
    return profiles.map(profile => ({
      profile,
      workload: getUserWorkload(profile.id, startDate, endDate),
    }))
  }, [profiles, getUserWorkload, startDate, endDate])

  const getColorClass = (hours) => {
    const percentage = (hours / maxHoursPerDay) * 100
    if (percentage === 0) return 'bg-gray-100 dark:bg-gray-800 text-gray-500'
    if (percentage < 100) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
    if (percentage === 100) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-bold'
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const dayName = date.toLocaleDateString(settings.language || 'en', { weekday: 'short' })
    const dayNum = date.getDate()
    return viewMode === 'week' ? `${dayName} ${dayNum}` : String(dayNum)
  }

  // Group dates by month for header
  const monthGroups = useMemo(() => {
    const groups = []
    let currentMonth = null
    let monthStart = 0
    let monthDayCount = 0

    dates.forEach((dateStr, i) => {
      const date = new Date(dateStr)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`

      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          groups.push({
            label: new Date(dates[monthStart]).toLocaleDateString(settings.language || 'en', { month: 'long', year: 'numeric' }),
            span: monthDayCount,
            startIndex: monthStart,
          })
        }
        currentMonth = monthKey
        monthStart = i
        monthDayCount = 0
      }
      monthDayCount++
    })

    // Push last month group
    if (currentMonth !== null) {
      groups.push({
        label: new Date(dates[monthStart]).toLocaleDateString(settings.language || 'en', { month: 'long', year: 'numeric' }),
        span: monthDayCount,
        startIndex: monthStart,
      })
    }

    return groups
  }, [dates, settings.language])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('workload.title')}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${viewMode === 'week'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
          >
            {t('workload.week')}
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${viewMode === 'month'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
          >
            {t('workload.month')}
          </button>
        </div>
      </div>

      {/* Workload Table */}
      {profiles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t('workload.noProfiles')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {/* Month header row */}
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="sticky left-0 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                    {t('workload.user')}
                  </th>
                  {monthGroups.map((group, idx) => (
                    <th key={idx} colSpan={group.span} className="px-2 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                      {group.label}
                    </th>
                  ))}
                </tr>
                {/* Day header row */}
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="sticky left-0 bg-gray-50 dark:bg-gray-800 px-4 py-2 border-r border-gray-200 dark:border-gray-700"></th>
                  {dates.map(date => (
                    <th
                      key={date}
                      className={`px-2 py-2 text-center text-xs font-medium whitespace-nowrap ${
                        isWeekend(date)
                          ? 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {formatDate(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workloadData.map(({ profile, workload }) => (
                  <tr key={profile.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        {profile.name}
                      </div>
                    </td>
                    {dates.map(date => {
                      const hours = workload[date] || 0
                      const weekend = isWeekend(date)
                      return (
                        <td
                          key={date}
                          className={`px-2 py-3 text-center ${weekend ? 'bg-white dark:bg-gray-800' : ''}`}
                        >
                          <div className={`inline-block min-w-[3rem] px-2 py-1 rounded text-sm ${getColorClass(hours)}`}>
                            {hours > 0 ? `${hours}h` : '-'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
