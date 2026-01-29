import { Search, X, Archive } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { LabelBadge } from '../Labels/LabelBadge'

export function Filters({ filters, onChange }) {
  const { profiles, labels } = useApp()

  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onChange({
      search: '',
      assignee: '',
      priority: '',
      labelId: '',
      showArchived: false,
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.assignee ||
    filters.priority ||
    filters.labelId ||
    filters.showArchived

  return (
    <div className="card p-3 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Search tasks... (press / to focus)"
          className="input pl-10"
          id="task-search"
        />
      </div>

      <select
        value={filters.assignee}
        onChange={(e) => updateFilter('assignee', e.target.value)}
        className="input w-auto"
      >
        <option value="">All Assignees</option>
        <option value="unassigned">Unassigned</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={(e) => updateFilter('priority', e.target.value)}
        className="input w-auto"
      >
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        value={filters.labelId}
        onChange={(e) => updateFilter('labelId', e.target.value)}
        className="input w-auto"
      >
        <option value="">All Labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showArchived}
          onChange={(e) => updateFilter('showArchived', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <Archive className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Show Archived</span>
      </label>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      )}
    </div>
  )
}

export function ActiveFilterTags({ filters, onChange }) {
  const { profiles, labels, getProfile, getLabel } = useApp()

  const removeFilter = (key) => {
    onChange({ ...filters, [key]: key === 'showArchived' ? false : '' })
  }

  const tags = []

  if (filters.assignee) {
    const profile = getProfile(filters.assignee)
    tags.push({
      key: 'assignee',
      label: filters.assignee === 'unassigned' ? 'Unassigned' : profile?.name || 'Unknown',
    })
  }

  if (filters.priority) {
    tags.push({
      key: 'priority',
      label: `${filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)} Priority`,
    })
  }

  if (filters.labelId) {
    const label = getLabel(filters.labelId)
    tags.push({
      key: 'labelId',
      label: label?.name || 'Unknown Label',
      labelObj: label,
    })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.key}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full"
        >
          {tag.labelObj ? (
            <LabelBadge label={tag.labelObj} size="xs" />
          ) : (
            tag.label
          )}
          <button
            onClick={() => removeFilter(tag.key)}
            className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
