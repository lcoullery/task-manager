import { useState, useRef, useEffect } from 'react'
import { Search, X, Archive, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { LabelBadge } from '../Labels/LabelBadge'

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input w-auto flex items-center gap-2 text-left min-w-[120px]"
      >
        <span className={`text-sm ${selected.length > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
          {selected.length > 0 ? `${label} (${selected.length})` : label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg min-w-[180px] py-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function Filters({ filters, onChange }) {
  const { profiles, labels } = useApp()
  const { t } = useTranslation()

  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onChange({
      search: '',
      assignee: [],
      priority: [],
      labelId: [],
      showArchived: false,
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.assignee.length > 0 ||
    filters.priority.length > 0 ||
    filters.labelId.length > 0 ||
    filters.showArchived

  const assigneeOptions = [
    { value: 'unassigned', label: t('filters.unassigned') },
    ...profiles.map((p) => ({ value: p.id, label: p.name })),
  ]

  const priorityOptions = [
    { value: 'high', label: t('filters.high') },
    { value: 'medium', label: t('filters.medium') },
    { value: 'low', label: t('filters.low') },
  ]

  const labelOptions = labels.map((l) => ({ value: l.id, label: l.name }))

  return (
    <div className="card p-3 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder={t('filters.searchPlaceholder')}
          className="input pl-10"
          id="task-search"
        />
      </div>

      <MultiSelect
        label={t('filters.allAssignees')}
        options={assigneeOptions}
        selected={filters.assignee}
        onChange={(v) => updateFilter('assignee', v)}
      />

      <MultiSelect
        label={t('filters.allPriorities')}
        options={priorityOptions}
        selected={filters.priority}
        onChange={(v) => updateFilter('priority', v)}
      />

      <MultiSelect
        label={t('filters.allLabels')}
        options={labelOptions}
        selected={filters.labelId}
        onChange={(v) => updateFilter('labelId', v)}
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showArchived}
          onChange={(e) => updateFilter('showArchived', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <Archive className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('filters.showArchived')}</span>
      </label>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
          {t('filters.clear')}
        </button>
      )}
    </div>
  )
}

export function ActiveFilterTags({ filters, onChange }) {
  const { getProfile, getLabel } = useApp()
  const { t } = useTranslation()

  const removeFilterValue = (key, value) => {
    onChange({ ...filters, [key]: filters[key].filter((v) => v !== value) })
  }

  const tags = []

  for (const assigneeId of filters.assignee) {
    const profile = getProfile(assigneeId)
    tags.push({
      key: 'assignee',
      value: assigneeId,
      label: assigneeId === 'unassigned' ? t('filters.unassigned') : profile?.name || 'Unknown',
    })
  }

  for (const prio of filters.priority) {
    tags.push({
      key: 'priority',
      value: prio,
      label: `${t('filters.' + prio)} ${t('filters.prioritySuffix')}`,
    })
  }

  for (const lid of filters.labelId) {
    const label = getLabel(lid)
    tags.push({
      key: 'labelId',
      value: lid,
      label: label?.name || t('filters.unknownLabel'),
      labelObj: label,
    })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={`${tag.key}-${tag.value}`}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full"
        >
          {tag.labelObj ? (
            <LabelBadge label={tag.labelObj} size="xs" />
          ) : (
            tag.label
          )}
          <button
            onClick={() => removeFilterValue(tag.key, tag.value)}
            className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
